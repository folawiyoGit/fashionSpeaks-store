import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { fetchFashionProducts, toInventoryProduct } from "./dummy-shared.js";

const importBtn = document.getElementById("importBtn");
const importMessage = document.getElementById("importMessage");

function say(text, type) {
    importMessage.textContent = text;
    importMessage.className = "form-message " + (type || "");
}

importBtn.addEventListener("click", async function () {
    if (!confirm("Add ALL the sample fashion products from DummyJSON? Products you already added are skipped.")) return;

    importBtn.disabled = true;
    say("Fetching products...");

    try {
        const existing = await getDocs(collection(db, "products"));
        const existingIds = new Set(existing.docs.map(function (item) { return item.id; }));

        const products = await fetchFashionProducts();
        const batch = writeBatch(db);
        let added = 0;

        products.forEach(function (item) {
            const id = "dj-" + item.id;
            if (existingIds.has(id)) return;              // already in the inventory

            batch.set(doc(db, "products", id), toInventoryProduct(item));
            added++;
        });

        if (added === 0) {
            say("Everything was already added.", "success");
            importBtn.disabled = false;
            return;
        }

        await batch.commit();
        say(added + " products added. Reloading...", "success");
        setTimeout(function () { location.reload(); }, 1200);

    } catch (error) {
        console.log(error);
        say("Import failed. Check your connection and that you are logged in as an active admin.", "error");
        importBtn.disabled = false;
    }
});