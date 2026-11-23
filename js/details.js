import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { escapeHtml, capitalize, stockStatus } from "./helpers.js";
import { addToCart } from "./cart.js";

const id = new URLSearchParams(window.location.search).get("id");

const imageBox = document.getElementById("detailImage");
const message = document.getElementById("detailMessage");
const addBtn = document.getElementById("addToCartBtn");
const qtyInput = document.getElementById("qtyInput");
const colorList = document.getElementById("colorOptions");
const sizeList = document.getElementById("sizeOptions");

let product = null;
let selectedColor = "";
let selectedSize = "";

function showMessage(text, type) {
    message.textContent = text;
    message.className = "form-message " + (type || "");
}

function showNotFound() {
    document.getElementById("productDetail").innerHTML =
        '<p class="shop-message">We could not find that product. <a href="shop.html">Back to the shop</a></p>';
}

/* ---------- load the product named in the web address ---------- */
async function loadProduct() {
    if (!id) return showNotFound();

    try {
        const snap = await getDoc(doc(db, "products", id));
        if (!snap.exists()) return showNotFound();

        const data = snap.data();
        product = {
            id: snap.id,
            name: data.name || "Untitled product",
            category: data.category || "uncategorized",
            price: Number(data.price) || 0,
            stock: Number(data.stock) || 0,
            alertLevel: Number(data.alertLevel) || 0,
            colors: data.colors || [],
            sizes: data.sizes || [],
            image: data.image || "",
            description: data.description || ""
        };

        showProduct();
    } catch (error) {
        console.log(error);
        showNotFound();
    }
}

/* ---------- fill the page ---------- */
function chips(list) {
    return list.map(function (value) {
        return '<button type="button" class="option-chip" data-value="' + escapeHtml(value) + '">' + escapeHtml(value) + "</button>";
    }).join("");
}

function showProduct() {
    document.title = product.name + " | FashionSpeaks";

    document.getElementById("detailName").textContent = product.name;
    document.getElementById("detailCategory").textContent = capitalize(product.category);
    document.getElementById("detailPrice").textContent = "$" + product.price.toFixed(2);
    document.getElementById("detailDesc").textContent = product.description;

    if (product.image.startsWith("http")) {
        imageBox.innerHTML = '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '">';
    }

    // stock badge, worded for shoppers
    const status = stockStatus(product.stock, product.alertLevel);
    const badge = document.getElementById("detailStatus");
    badge.textContent = status.label === "Low stock" ? "Only " + product.stock + " left" : status.label;
    badge.className = "badge " + status.css;

    // colour and size choices (hide a group if the product has none)
    colorList.innerHTML = chips(product.colors);
    sizeList.innerHTML = chips(product.sizes);
    colorList.parentElement.hidden = product.colors.length === 0;
    sizeList.parentElement.hidden = product.sizes.length === 0;

    // if there is only one choice, pick it for the shopper
    if (product.colors.length === 1) { selectedColor = product.colors[0]; colorList.firstElementChild.classList.add("selected"); }
    if (product.sizes.length === 1) { selectedSize = product.sizes[0]; sizeList.firstElementChild.classList.add("selected"); }

    qtyInput.max = product.stock;

    if (product.stock <= 0) {
        addBtn.disabled = true;
        addBtn.textContent = "Out of stock";
    }
}

/* ---------- picking a colour or size ---------- */
function handlePick(list, setValue) {
    list.addEventListener("click", function (event) {
        const chip = event.target.closest(".option-chip");
        if (!chip) return;

        list.querySelectorAll(".option-chip").forEach(function (other) {
            other.classList.remove("selected");
        });
        chip.classList.add("selected");
        setValue(chip.dataset.value);
        showMessage("");
    });
}

handlePick(colorList, function (value) { selectedColor = value; });
handlePick(sizeList, function (value) { selectedSize = value; });

/* ---------- add to cart ---------- */
addBtn.addEventListener("click", function () {
    if (!product) return;

    const qty = Number(qtyInput.value);

    if (product.colors.length > 0 && selectedColor === "") return showMessage("Please choose a colour.", "error");
    if (product.sizes.length > 0 && selectedSize === "") return showMessage("Please choose a size.", "error");
    if (!Number.isInteger(qty) || qty < 1) return showMessage("Please enter a quantity of 1 or more.", "error");
    if (qty > product.stock) return showMessage("Sorry, only " + product.stock + " available.", "error");

    addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.stock,
        color: selectedColor,
        size: selectedSize,
        qty: qty
    });

    showMessage("Added to your cart.", "success");
    document.getElementById("openCart").click();       // slide the cart open
});

loadProduct();