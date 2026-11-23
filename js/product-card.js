import { escapeHtml, stockStatus } from "./helpers.js";

// turns a Firestore document into a product with safe values
export function normalizeProduct(id, data) {
    return {
        id: id,
        name: data.name || "Untitled product",
        brand: data.brand || "",
        category: data.category || "uncategorized",
        price: Number(data.price) || 0,
        stock: Number(data.stock) || 0,
        alertLevel: Number(data.alertLevel) || 0,
        image: data.image || "",
        created: data.createdAt ? data.createdAt.seconds : 0
    };
}

// the HTML for one product card
export function productCardHtml(product) {
    const status = stockStatus(product.stock, product.alertLevel);
    const label = status.label === "Low stock" ? "Only " + product.stock + " left" : status.label;
    const link = "product-details.html?id=" + encodeURIComponent(product.id);
    const picture = product.image.startsWith("http")
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
                <span class="badge ${status.css}">${label}</span>
            </div>
            <a href="${link}" class="add-btn">View options</a>
        </article>`;
}