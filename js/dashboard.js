import { db } from "./firebase-config.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { escapeHtml, capitalize, stockStatus } from "./helpers.js";

async function loadDashboard() {
    const lowStockBody = document.getElementById("lowStockBody");

    try {
        const snapshot = await getDocs(collection(db, "products"));

        // turn the documents into plain objects, with safe values for anything missing
        const products = snapshot.docs.map(function (item) {
            const data = item.data();
            return {
                id: item.id,
                name: data.name || "Untitled product",
                category: data.category || "uncategorized",
                price: Number(data.price) || 0,
                stock: Number(data.stock) || 0,
                alertLevel: Number(data.alertLevel) || 0
            };
        });

        // 1. the four numbers
        const totalStock = products.reduce(function (sum, product) {
            return sum + product.stock;
        }, 0);

        const lowItems = products
            .filter(function (product) { return product.stock <= product.alertLevel; })
            .sort(function (a, b) { return a.stock - b.stock; });       // emptiest first

        const categories = new Set(products.map(function (product) { return product.category; }));

        document.getElementById("totalProducts").textContent = products.length;
        document.getElementById("totalStock").textContent = totalStock;
        document.getElementById("lowStockCount").textContent = lowItems.length;
        document.getElementById("categoryCount").textContent = categories.size;

        // 2. the low stock table
        if (lowItems.length === 0) {
            const text = products.length === 0
                ? "No products yet. Add your first product to see it here."
                : "Good news: every product is well stocked.";
            lowStockBody.innerHTML = '<tr class="empty-row"><td colspan="5">' + text + "</td></tr>";
            return;
        }

        lowStockBody.innerHTML = lowItems.slice(0, 10).map(function (product) {
            const status = stockStatus(product.stock, product.alertLevel);
            return `
                <tr>
                    <td>${escapeHtml(product.name)}</td>
                    <td>${escapeHtml(capitalize(product.category))}</td>
                    <td>${product.stock}</td>
                    <td><span class="badge ${status.css}">${status.label}</span></td>
                    <td>$${product.price.toFixed(2)}</td>
                </tr>`;
        }).join("");

    } catch (error) {
        console.log(error);
        lowStockBody.innerHTML = '<tr class="empty-row"><td colspan="5">Could not load the dashboard. Please refresh.</td></tr>';
    }
}

loadDashboard();