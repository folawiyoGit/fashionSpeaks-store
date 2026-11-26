import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { escapeHtml, stockStatus, capitalize } from "./helpers.js";

/* ---------- find the page elements ---------- */
const modal = document.getElementById("productModal");
const modalTitle = document.getElementById("modalTitle");
const form = document.getElementById("productForm");
const formMessage = document.getElementById("formMessage");
const tableBody = document.getElementById("productTableBody");
const resultCount = document.getElementById("adminResultCount");
const searchInput = document.getElementById("adminSearch");
const categoryFilter = document.getElementById("adminCategoryFilter");
const statusFilter = document.getElementById("adminStatusFilter");

const productsRef = collection(db, "products");   // points at the "products" collection
let allProducts = [];                              // our copy of every product


function showFormMessage(text, type) {
    formMessage.textContent = text;
    formMessage.className = "form-message " + (type || "");
}

/* ---------- load products from Firestore ---------- */
async function loadProducts() {
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Loading products...</td></tr>';

    try {
        const snapshot = await getDocs(productsRef);

        allProducts = snapshot.docs.map(function (item) {
            const data = item.data();

            return {
                id: item.id,
                ...data,
                // if a field is missing, use a safe value instead of crashing
                name: data.name || "Untitled product",
                category: data.category || "uncategorized",
                price: Number(data.price) || 0,
                stock: Number(data.stock) || 0,
                alertLevel: Number(data.alertLevel) || 0
            };
        });

        // newest first
        allProducts.sort(function (a, b) {
            return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });

        renderTable();
    } catch (error) {
        console.log(error);
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">Could not load products. Please refresh.</td></tr>';
    }
}
/* ---------- quick quantity update ---------- */
function showSaveButton(control) {
    control.querySelector(".qty-save").hidden = false;
}

tableBody.addEventListener("click", async function (event) {
    const button = event.target.closest("button[data-qty]");
    if (!button) return;

    const control = button.closest(".qty-control");
    const input = control.querySelector(".qty-input");
    const action = button.dataset.qty;

    if (action === "plus") {
        input.value = (Number(input.value) || 0) + 1;
        showSaveButton(control);
    }

    if (action === "minus") {
        input.value = Math.max(0, (Number(input.value) || 0) - 1);
        showSaveButton(control);
    }

    if (action === "save") {
        const newStock = Number(input.value);

        if (!Number.isInteger(newStock) || newStock < 0) {
            alert("Stock must be a whole number, 0 or more.");
            return;
        }

        button.disabled = true;
        button.textContent = "Saving...";

        try {
            await updateDoc(doc(db, "products", control.dataset.id), {
                stock: newStock,
                updatedAt: serverTimestamp()
            });

            const product = allProducts.find(function (item) { return item.id === control.dataset.id; });
            product.stock = newStock;
            renderTable();                       // redraws the row with the new status badge
        } catch (error) {
            console.log(error);
            alert("Could not update the quantity. Check you are logged in as an active admin.");
            button.disabled = false;
            button.textContent = "Save";
        }
    }
});

// typing a number directly also shows the Save button
tableBody.addEventListener("input", function (event) {
    if (event.target.classList.contains("qty-input")) {
        showSaveButton(event.target.closest(".qty-control"));
    }
});

/* ---------- show the table (applies search + filter) ---------- */
function renderTable() {
    const search = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;

    const wantedStatus = statusFilter.value;

    const shown = allProducts.filter(function (product) {
        const label = stockStatus(product.stock, product.alertLevel).label;

        const matchesName = product.name.toLowerCase().includes(search);
        const matchesCategory = category === "all" || product.category === category;
        const matchesStatus = wantedStatus === "all"
            || (wantedStatus === "in" && label === "In stock")
            || (wantedStatus === "low" && label === "Low stock")
            || (wantedStatus === "out" && label === "Out of stock");

        return matchesName && matchesCategory && matchesStatus;
    });

    resultCount.textContent = shown.length + (shown.length === 1 ? " product" : " products");

    if (shown.length === 0) {
        const text = allProducts.length === 0
            ? 'No products yet. Click "Add product" to create your first one.'
            : "No products match your search.";
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">' + text + "</td></tr>";
        return;
    }

    tableBody.innerHTML = shown.map(function (product) {
        const status = stockStatus(product.stock, product.alertLevel);
        const hasImage = product.image && product.image.startsWith("http");
        const picture = hasImage
            ? '<img class="thumb" src="' + escapeHtml(product.image) + '" alt="">'
            : '<div class="thumb"></div>';

        return `
            <tr>
                <td>${picture}</td>
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(capitalize(product.category))}</td>
                <td>$${Number(product.price).toFixed(2)}</td>
                <td>
    <div class="qty-control" data-id="${product.id}">
        <button type="button" class="qty-btn" data-qty="minus" aria-label="One less">-</button>
        <input type="number" class="qty-input" min="0" step="1" value="${product.stock}" aria-label="Stock quantity">
        <button type="button" class="qty-btn" data-qty="plus" aria-label="One more">+</button>
        <button type="button" class="qty-save" data-qty="save" hidden>Save</button>
    </div>
    <span class="badge ${status.css}">${status.label}</span>
</td>
                <td>
    <button type="button" class="view-btn" data-id="${product.id}">View</button>
    <button type="button" class="edit-btn" data-id="${product.id}">Edit</button>
    <button type="button" class="delete-btn" data-id="${product.id}">Delete</button>
</td>
            </tr>`;
    }).join("");
}

/* ---------- open and close the pop-up ---------- */
function openForm(product) {
    form.reset();
    showFormMessage("");
    document.getElementById("productId").value = "";

    if (product) {
        // EDIT: fill the form with the product's details
        modalTitle.textContent = "Edit product";
        document.getElementById("productId").value = product.id;
        document.getElementById("productName").value = product.name;
        document.getElementById("productPrice").value = product.price;
        document.getElementById("productStock").value = product.stock;
        document.getElementById("productAlert").value = product.alertLevel;
        document.getElementById("productCategory").value = product.category;
        document.getElementById("productColors").value = (product.colors || []).join(", ");
        document.getElementById("productImage").value = product.image || "";
        document.getElementById("productDesc").value = product.description || "";
        document.getElementById("productFeatured").checked = product.featured === true;


        document.querySelectorAll("input[name='sizes']").forEach(function (box) {
            box.checked = (product.sizes || []).includes(box.value);
        });
    } else {
        // ADD: empty form
        modalTitle.textContent = "Add product";
    }

    modal.classList.add("open");
}

function closeForm() {
    modal.classList.remove("open");
}

document.getElementById("openProductForm").addEventListener("click", function () { openForm(); });
document.getElementById("closeProductForm").addEventListener("click", closeForm);
document.getElementById("cancelProductForm").addEventListener("click", closeForm);

modal.addEventListener("click", function (event) {
    if (event.target === modal) closeForm();           // clicking the dark area
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeForm();
});

/* ---------- view one product ---------- */
const viewModal = document.getElementById("viewModal");
const viewBody = document.getElementById("viewBody");
let viewing = null;                                   // the product being viewed

function formatDate(timestamp) {
    return timestamp && timestamp.toDate ? timestamp.toDate().toLocaleDateString() : "Not recorded";
}

function listText(items) {
    return items && items.length ? items.map(escapeHtml).join(", ") : "None";
}

function openView(product) {
    viewing = product;
    const status = stockStatus(product.stock, product.alertLevel);

    const picture = product.image && product.image.startsWith("http")
        ? '<img class="view-image" src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '">'
        : '<div class="view-image"></div>';

    viewBody.innerHTML = `
        ${picture}
        <h3>${escapeHtml(product.name)}</h3>
        <p class="view-price">$${product.price.toFixed(2)}</p>

        <dl class="view-list">
            <dt>Category</dt><dd>${escapeHtml(capitalize(product.category))}</dd>
            <dt>In stock</dt><dd>${product.stock} <span class="badge ${status.css}">${status.label}</span></dd>
            <dt>Alert level</dt><dd>${product.alertLevel}</dd>
            <dt>Sizes</dt><dd>${listText(product.sizes)}</dd>
            <dt>Colours</dt><dd>${listText(product.colors)}</dd>
            <dt>Featured</dt><dd>${product.featured ? "Yes" : "No"}</dd>
            <dt>Added</dt><dd>${formatDate(product.createdAt)}</dd>
            <dt>Last updated</dt><dd>${formatDate(product.updatedAt)}</dd>
            <dt>Product ID</dt><dd class="code-text">${escapeHtml(product.id)}</dd>
        </dl>

        <p class="view-desc">${escapeHtml(product.description || "No description.")}</p>`;

    document.getElementById("viewStoreLink").href = "../product-details.html?id=" + encodeURIComponent(product.id);
    viewModal.classList.add("open");
}

function closeView() {
    viewModal.classList.remove("open");
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { closeForm(); closeView(); }
});

document.getElementById("closeView").addEventListener("click", closeView);

viewModal.addEventListener("click", function (event) {
    if (event.target === viewModal) closeView();      // clicking the dark area
});

document.getElementById("viewEditBtn").addEventListener("click", function () {
    closeView();
    openForm(viewing);                                // jump straight to editing this product
});
/* ---------- save (add or edit) ---------- */
form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const id = document.getElementById("productId").value;
    const button = form.querySelector("button[type='submit']");

    const sizes = [];
    document.querySelectorAll("input[name='sizes']:checked").forEach(function (box) {
        sizes.push(box.value);
    });

    const colors = document.getElementById("productColors").value
        .split(",")
        .map(function (color) { return color.trim(); })
        .filter(function (color) { return color !== ""; });

    const data = {
        name: document.getElementById("productName").value.trim(),
        price: Number(document.getElementById("productPrice").value),
        stock: Number(document.getElementById("productStock").value),
        alertLevel: Number(document.getElementById("productAlert").value),
        category: document.getElementById("productCategory").value,
        colors: colors,
        sizes: sizes,
        image: document.getElementById("productImage").value.trim(),
        description: document.getElementById("productDesc").value.trim(),
        featured: document.getElementById("productFeatured").checked
    };

    // simple checks before saving
    if (data.name === "") return showFormMessage("Please enter a product name.", "error");
    if (data.price < 0) return showFormMessage("Price cannot be negative.", "error");
    if (!Number.isInteger(data.stock) || data.stock < 0) return showFormMessage("Stock must be a whole number, 0 or more.", "error");
    if (!Number.isInteger(data.alertLevel) || data.alertLevel < 0) return showFormMessage("Alert level must be a whole number, 0 or more.", "error");
    if (data.category === "") return showFormMessage("Please choose a category.", "error");

    button.disabled = true;
    showFormMessage("Saving...");

    try {
        if (id) {
            await updateDoc(doc(db, "products", id), { ...data, updatedAt: serverTimestamp() });
        } else {
            await addDoc(productsRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }

        closeForm();
        await loadProducts();
    } catch (error) {
        console.log(error);
        showFormMessage("Could not save. Check you are logged in as an active admin.", "error");
    }

    button.disabled = false;
});

/* ---------- edit and delete buttons (one listener for the whole table) ---------- */
tableBody.addEventListener("click", async function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    const id = button.dataset.id;
    const product = allProducts.find(function (item) { return item.id === id; });
    if (!product) return;

    if (button.classList.contains("view-btn")) {
        openView(product);
    }

    if (button.classList.contains("edit-btn")) {
        openForm(product);
    }

    if (button.classList.contains("delete-btn")) {
        if (!confirm('Delete "' + product.name + '"? This cannot be undone.')) return;

        try {
            await deleteDoc(doc(db, "products", id));
            allProducts = allProducts.filter(function (item) { return item.id !== id; });
            renderTable();
        } catch (error) {
            console.log(error);
            alert("Could not delete. Check you are logged in as an active admin.");
        }
    }
});

/* ---------- search and filter ---------- */
searchInput.addEventListener("input", renderTable);
categoryFilter.addEventListener("change", renderTable);
statusFilter.addEventListener("change", renderTable);

// the API panel tells us when it has added products
window.addEventListener("inventory-changed", loadProducts);

/* ---------- start ---------- */
loadProducts();