import { escapeHtml } from "./helpers.js";

const STORAGE_KEY = "fsCart";

/* ---------- the cart's memory (the browser's localStorage) ---------- */
export function getCart() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
        console.log(error);
    }
    renderCart();
}

/* ---------- add, change, remove ---------- */
export function addToCart(item) {
    const cart = getCart();

    // the same shirt in a different size or colour is a separate line
    const key = [item.id, item.size, item.color].join("|");
    const line = cart.find(function (entry) { return entry.key === key; });

    if (line) {
        line.stock = item.stock;
        line.qty = Math.min(line.qty + item.qty, item.stock);     // never more than we have
    } else {
        cart.push({
            key: key,
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image,
            size: item.size,
            color: item.color,
            stock: item.stock,
            qty: Math.min(item.qty, item.stock)
        });
    }

    saveCart(cart);
}

function changeQty(key, change) {
    const cart = getCart();
    const line = cart.find(function (entry) { return entry.key === key; });
    if (!line) return;

    line.qty = Math.max(1, Math.min(line.qty + change, line.stock));
    saveCart(cart);
}

function removeLine(key) {
    saveCart(getCart().filter(function (entry) { return entry.key !== key; }));
}

/* ---------- draw the cart badge and the drawer ---------- */
export function renderCart() {
    const countEl = document.getElementById("cartCount");
    const itemsEl = document.getElementById("cartItems");
    const totalEl = document.getElementById("cartTotal");
    if (!itemsEl) return;                                // this page has no cart drawer

    const cart = getCart();

    const count = cart.reduce(function (sum, line) { return sum + line.qty; }, 0);
    const total = cart.reduce(function (sum, line) { return sum + line.qty * line.price; }, 0);

    countEl.textContent = count;
    totalEl.textContent = "$" + total.toFixed(2);

    if (cart.length === 0) {
        itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty. Add a piece you love.</p>';
        return;
    }

    itemsEl.innerHTML = cart.map(function (line) {
        const hasImage = line.image && line.image.startsWith("http");
        const picture = hasImage
            ? '<img src="' + escapeHtml(line.image) + '" alt="">'
            : '<div class="cart-thumb"></div>';
        const details = [line.color, line.size].filter(Boolean).join(" · ");

        return `
            <div class="cart-item" data-key="${escapeHtml(line.key)}">
                ${picture}
                <div class="cart-item-info">
                    <p class="cart-item-name">${escapeHtml(line.name)}</p>
                    <p class="cart-item-meta">${escapeHtml(details)}</p>
                    <p class="cart-item-price">$${(line.price * line.qty).toFixed(2)}</p>
                    <div class="cart-item-qty">
                        <button type="button" data-action="minus" aria-label="One less">-</button>
                        <span>${line.qty}</span>
                        <button type="button" data-action="plus" aria-label="One more">+</button>
                        <button type="button" class="cart-remove" data-action="remove">Remove</button>
                    </div>
                </div>
            </div>`;
    }).join("");
}

/* ---------- buttons inside the drawer (one listener for all of them) ---------- */
const itemsEl = document.getElementById("cartItems");

if (itemsEl) {
    itemsEl.addEventListener("click", function (event) {
        const button = event.target.closest("button");
        const row = event.target.closest(".cart-item");
        if (!button || !row) return;

        const key = row.dataset.key;
        const action = button.dataset.action;

        if (action === "plus") changeQty(key, 1);
        if (action === "minus") changeQty(key, -1);
        if (action === "remove") removeLine(key);
    });
}

// keep the cart in step when it changes in another tab
window.addEventListener("storage", renderCart);

renderCart();      // draw the cart as soon as any page loads