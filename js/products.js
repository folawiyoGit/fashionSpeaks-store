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

/* ---------- show the table (applies search + filter) ---------- */
function renderTable() {
    const search = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;

    const shown = allProducts.filter(function (product) {
        const matchesName = product.name.toLowerCase().includes(search);
        const matchesCategory = category === "all" || product.category === category;
        return matchesName && matchesCategory;
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
                <td>${product.stock} <span class="badge ${status.css}">${status.label}</span></td>
                <td>
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
        description: document.getElementById("productDesc").value.trim()
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

/* ---------- start ---------- */
loadProducts();