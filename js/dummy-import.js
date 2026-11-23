import { db } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const importBtn = document.getElementById("importBtn");
const importMessage = document.getElementById("importMessage");

// DummyJSON category  ->  our category
const categoryMap = {
    "womens-dresses": "women",
    "womens-shoes": "women",
    "tops": "women",
    "mens-shirts": "men",
    "mens-shoes": "men",
    "womens-bags": "accessories",
    "womens-jewellery": "accessories",
    "womens-watches": "accessories",
    "mens-watches": "accessories",
    "sunglasses": "accessories"
};

// clothes get S to XL, everything else gets "One size" (edit shoe sizes later)
const clothingSlugs = ["womens-dresses", "tops", "mens-shirts"];

function say(text, type) {
    importMessage.textContent = text;
    importMessage.className = "form-message " + (type || "");
}

importBtn.addEventListener("click", async function () {
    if (!confirm("Import sample fashion products from DummyJSON? Products you already imported are skipped.")) return;

    importBtn.disabled = true;
    say("Fetching products...");

    try {
        // 1. which products are already in our database?
        const existing = await getDocs(collection(db, "products"));
        const existingIds = new Set(existing.docs.map(function (item) { return item.id; }));

        // 2. fetch each DummyJSON category and prepare the new products
        const batch = writeBatch(db);          // a batch saves everything together, or nothing
        let added = 0;

        for (const slug of Object.keys(categoryMap)) {
            const response = await fetch("https://dummyjson.com/products/category/" + slug + "?limit=0");
            if (!response.ok) throw new Error("Could not fetch " + slug);

            const result = await response.json();

            result.products.forEach(function (item) {
                const id = "dj-" + item.id;                 // our own id, so we can spot repeats
                if (existingIds.has(id)) return;            // already imported: skip

                batch.set(doc(db, "products", id), {
                    name: item.title,
                    price: item.price,
                    stock: item.stock,
                    alertLevel: 5,
                    category: categoryMap[slug],
                    colors: [],
                    sizes: clothingSlugs.includes(slug) ? ["S", "M", "L", "XL"] : ["One size"],
                    image: (item.images && item.images[0]) || item.thumbnail || "",
                    description: item.description || "",
                    brand: item.brand || "",
                    source: "dummyjson",
                    sourceId: item.id,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                added++;
            });
        }

        if (added === 0) {
            say("Everything was already imported.", "success");
            importBtn.disabled = false;
            return;
        }

        // 3. save them all
        await batch.commit();
        say(added + " products imported. Reloading...", "success");
        setTimeout(function () { location.reload(); }, 1200);

    } catch (error) {
        console.log(error);
        say("Import failed. Check your connection and that you are logged in as an active admin.", "error");
        importBtn.disabled = false;
    }
});