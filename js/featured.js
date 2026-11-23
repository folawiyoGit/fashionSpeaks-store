import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { normalizeProduct, productCardHtml } from "./product-card.js";

const grid = document.getElementById("productGrid");
const HOW_MANY = 4;

async function loadFeatured() {
    try {
        const productsRef = collection(db, "products");

        // 1. the products you ticked as featured
        const picked = await getDocs(
            query(productsRef, where("featured", "==", true), limit(HOW_MANY))
        );
        const products = picked.docs.map(function (item) {
            return normalizeProduct(item.id, item.data());
        });

        // 2. fewer than four? fill the gap with the newest products
        if (products.length < HOW_MANY) {
            const newest = await getDocs(
                query(productsRef, orderBy("createdAt", "desc"), limit(HOW_MANY * 2))
            );

            newest.docs.forEach(function (item) {
                const alreadyThere = products.some(function (product) { return product.id === item.id; });
                if (products.length < HOW_MANY && !alreadyThere) {
                    products.push(normalizeProduct(item.id, item.data()));
                }
            });
        }

        if (products.length === 0) {
            grid.innerHTML = '<p class="shop-message">New pieces are on their way.</p>';
            return;
        }

        grid.innerHTML = products.map(productCardHtml).join("");
    } catch (error) {
        console.log(error);
        grid.innerHTML = '<p class="shop-message">Could not load products right now.</p>';
    }
}

if (grid) loadFeatured();