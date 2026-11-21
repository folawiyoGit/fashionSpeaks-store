// Stops text typed by a person from being treated as HTML code
export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function capitalize(text) {
    text = text || "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// The stock rule you chose: out of stock, low stock, or in stock
export function stockStatus(stock, alertLevel) {
    if (stock <= 0) return { label: "Out of stock", css: "badge-bad" };
    if (stock <= alertLevel) return { label: "Low stock", css: "badge-warn" };
    return { label: "In stock", css: "badge-ok" };
}