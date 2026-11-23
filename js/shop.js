import { db } from "./firebase-config.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { escapeHtml, stockStatus } from "./helpers.js";

const grid = document.getElementById("productGrid");
const message = document.getElementById("shopMessage");
const resultCount = document.getElementById("resultCount");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");

let allProducts = [];     // every product, kept in memory after loading once

// shoppers see "Only 3 left" instead of "Low stock"
function badgeFor(product) {
    const status = stockStatus(product.stock, product.alertLevel);
    if (status.label === "Low stock") {
        return { label: "Only " + product.stock + " left", css: status.css };
    }
    return status;
}

/* ---------- load products from Firestore ---------- */
async function loadProducts() {
    message.hidden = false;
    message.textContent = "Loading products...";

    try {
        const snapshot = await getDocs(collection(db, "products"));

        allProducts = snapshot.docs.map(function (item) {
            const data = item.data();
            return {
                id: item.id,
                name: data.name || "Untitled product",
                brand: data.brand || "",
                category: data.category || "uncategorized",
                price: Number(data.price) || 0,
                stock: Number(data.stock) || 0,
                alertLevel: Number(data.alertLevel) || 0,
                image: data.image || "",
                created: data.createdAt ? data.createdAt.seconds : 0
            };
        });

        // the homepage tiles link here as shop.html?category=women
        const wanted = new URLSearchParams(window.location.search).get("category");
        if (wanted) {
            categoryFilter.value = wanted;
            if (categoryFilter.value === "") categoryFilter.value = "all";   // unknown category
        }

        render();
    } catch (error) {
        console.log(error);
        message.textContent = "Could not load products. Please refresh the page.";
    }
}

/* ---------- filter, sort and draw ---------- */
function render() {
    const search = searchInput.value.trim().toLowerCase();
    const category = categoryFilter.value;
    const sort = sortSelect.value;

    const shown = allProducts.filter(function (product) {
        const matchesText = product.name.toLowerCase().includes(search)
            || product.brand.toLowerCase().includes(search);
        const matchesCategory = category === "all" || product.category === category;
        return matchesText && matchesCategory;
    });

    if (sort === "price-low") {
        shown.sort(function (a, b) { return a.price - b.price; });
    } else if (sort === "price-high") {
        shown.sort(function (a, b) { return b.price - a.price; });
    } else if (sort === "name") {
        shown.sort(function (a, b) { return a.name.localeCompare(b.name); });
    } else {
        shown.sort(function (a, b) { return (b.created - a.created) || a.name.localeCompare(b.name); });
    }

    resultCount.textContent = shown.length + (shown.length === 1 ? " product" : " products");

    if (shown.length === 0) {
        grid.innerHTML = "";
        message.hidden = false;
        message.textContent = allProducts.length === 0
            ? "No products yet. Please check back soon."
            : "No products match your search.";
        return;
    }

    message.hidden = true;

    grid.innerHTML = shown.map(function (product) {
        const badge = badgeFor(product);
        const link = "product-details.html?id=" + encodeURIComponent(product.id);
        const hasImage = product.image.startsWith("http");
        const picture = hasImage
            ? '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">'
            : "";

        return `
            <article class="product-card">
                <a href="${link}" class="product-link">
                    <div class="product-img">${picture}</div>
                    <h3>${escapeHtml(product.name)}</h3>
                </a>
                <div class="card-meta">
                    <span class="price">$${product.price.toFixed(2)}</span>
                    <span class="badge ${badge.css}">${badge.label}</span>
                </div>
                <a href="${link}" class="add-btn">View options</a>
            </article>`;
    }).join("");
}

searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);
sortSelect.addEventListener("change", render);

loadProducts();