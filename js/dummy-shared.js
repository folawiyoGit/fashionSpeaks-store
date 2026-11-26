import { serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// DummyJSON category  ->  our category
export const categoryMap = {
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

// clothes get S to XL, everything else gets "One size"
const clothingSlugs = ["womens-dresses", "tops", "mens-shirts"];

// fetches every DummyJSON product, keeps only the fashion ones
export async function fetchFashionProducts() {
    const response = await fetch("https://dummyjson.com/products?limit=0");
    if (!response.ok) throw new Error("Could not reach DummyJSON");

    const result = await response.json();
    return result.products.filter(function (item) {
        return categoryMap[item.category] !== undefined;
    });
}

// turns one API product into the document we save in Firestore
export function toInventoryProduct(item) {
    return {
        name: item.title,
        price: item.price,
        stock: item.stock,
        alertLevel: 5,
        category: categoryMap[item.category],
        colors: [],
        sizes: clothingSlugs.includes(item.category) ? ["S", "M", "L", "XL"] : ["One size"],
        image: (item.images && item.images[0]) || item.thumbnail || "",
        description: item.description || "",
        brand: item.brand || "",
        source: "dummyjson",
        sourceId: item.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}