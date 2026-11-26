import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { escapeHtml } from "./helpers.js";
import { fetchFashionProducts, toInventoryProduct } from "./dummy-shared.js";

const loadBtn = document.getElementById("loadApiBtn");
const toolbar = document.getElementById("apiToolbar");
const searchInput = document.getElementById("apiSearch");
const categorySelect = document.getElementById("apiCategoryFilter");
const addAllBtn = document.getElementById("addAllApi");
const countEl = document.getElementById("apiCount");
const tableBody = document.getElementById("apiTableBody");
const message = document.getElementById("apiMessage");

let apiProducts = [];         // everything the API sent us
let savedIds = new Set();     // ids already in our own inventory

function say(text, type) {
    message.textContent = text;
    message.className = "form-message " + (type || "");
}

// "womens-dresses" becomes "Womens dresses"
function prettify(slug) {
    const text = slug.replace(/-/g, " ");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------- load the API products and show them ---------- */
loadBtn.addEventListener("click", async function () {
    loadBtn.disabled = true;
    say("Fetching products from DummyJSON...");

    try {
        apiProducts = await fetchFashionProducts();

        const existing = await getDocs(collection(db, "products"));
        savedIds = new Set(existing.docs.map(function (item) { return item.id; }));

        // category dropdown built from what the API really returned
        const slugs = [...new Set(apiProducts.map(function (item) { return item.category; }))].sort();
        categorySelect.innerHTML = '<option value="all">All API categories</option>' +
            slugs.map(function (slug) {
                return '<option value="' + slug + '">' + prettify(slug) + "</option>";
            }).join("");

        toolbar.hidden = false;
        loadBtn.textContent = "Refresh from DummyJSON";
        say("");
        render();
    } catch (error) {
        console.log(error);
        say("Could not load products from the API. Check your connection.", "error");
    }

    loadBtn.disabled = false;
});

/* ---------- which products match the search and filter ---------- */
function currentList() {
    const search = searchInput.value.trim().toLowerCase();
    const slug = categorySelect.value;

    return apiProducts.filter(function (item) {
        const matchesText = item.title.toLowerCase().includes(search)
            || (item.brand || "").toLowerCase().includes(search);
        const matchesCategory = slug === "all" || item.category === slug;
        return matchesText && matchesCategory;
    });
}

function render() {
    const shown = currentList();
    const notYetAdded = shown.filter(function (item) { return !savedIds.has("dj-" + item.id); }).length;

    countEl.textContent = shown.length + " API products shown, " + notYetAdded + " not yet in your inventory";

    if (shown.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No API products match your search.</td></tr>';
        return;
    }

    tableBody.innerHTML = shown.map(function (item) {
        const saved = savedIds.has("dj-" + item.id);
        const picture = (item.images && item.images[0]) || item.thumbnail || "";
        const image = picture
            ? '<img class="thumb" src="' + escapeHtml(picture) + '" alt="">'
            : '<div class="thumb"></div>';
        const action = saved
            ? '<span class="badge badge-muted">In inventory</span>'
            : '<button type="button" class="edit-btn" data-api-id="' + item.id + '">Add to inventory</button>';

        return `
            <tr>
                <td>${image}</td>
                <td>${escapeHtml(item.title)}<div class="cell-sub">${escapeHtml(item.brand || "")}</div></td>
                <td>${escapeHtml(prettify(item.category))}</td>
                <td>$${Number(item.price).toFixed(2)}</td>
                <td>${item.stock}</td>
                <td>${action}</td>
            </tr>`;
    }).join("");
}

searchInput.addEventListener("input", render);
categorySelect.addEventListener("change", render);

/* ---------- add one product ---------- */
tableBody.addEventListener("click", async function (event) {
    const button = event.target.closest("button[data-api-id]");
    if (!button) return;

    const item = apiProducts.find(function (product) { return String(product.id) === button.dataset.apiId; });
    if (!item) return;

    button.disabled = true;
    button.textContent = "Adding...";

    try {
        await setDoc(doc(db, "products", "dj-" + item.id), toInventoryProduct(item));
        savedIds.add("dj-" + item.id);
        say(item.title + " was added to your inventory.", "success");
        render();
        window.dispatchEvent(new Event("inventory-changed"));    // tells the table above to refresh
    } catch (error) {
        console.log(error);
        say("Could not add that product. Check you are logged in as an active admin.", "error");
        button.disabled = false;
        button.textContent = "Add to inventory";
    }
});

/* ---------- add everything currently shown ---------- */
addAllBtn.addEventListener("click", async function () {
    const fresh = currentList().filter(function (item) { return !savedIds.has("dj-" + item.id); });

    if (fresh.length === 0) {
        say("Everything shown is already in your inventory.", "success");
        return;
    }
    if (!confirm("Add " + fresh.length + " products to your inventory?")) return;

    addAllBtn.disabled = true;
    say("Adding products...");

    try {
        const batch = writeBatch(db);
        fresh.forEach(function (item) {
            batch.set(doc(db, "products", "dj-" + item.id), toInventoryProduct(item));
        });
        await batch.commit();

        fresh.forEach(function (item) { savedIds.add("dj-" + item.id); });
        say(fresh.length + " products added to your inventory.", "success");
        render();
        window.dispatchEvent(new Event("inventory-changed"));
    } catch (error) {
        console.log(error);
        say("Could not add the products. Please try again.", "error");
    }

    addAllBtn.disabled = false;
});