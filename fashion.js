/* ---------- WELCOME MESSAGE (home page only) ---------- */
let welcome = document.getElementById("welcome");
let waitTime = 10000;    // 10 seconds

if (welcome) {                                   // only run if this page has a welcome box
    if (sessionStorage.getItem("welcomeSeen")) {
        welcome.classList.add("gone");
    } else {
        sessionStorage.setItem("welcomeSeen", "yes");

        setTimeout(function () {
            welcome.classList.add("fade-out");

            setTimeout(function () {
                welcome.classList.add("gone");
            }, 1500);

        }, waitTime);
    }
}

/* ---------- CART DRAWER (open and close only, for now) ---------- */
let openCart = document.getElementById("openCart");
let closeCart = document.getElementById("closeCart");
let cartDrawer = document.getElementById("cartDrawer");
let overlay = document.getElementById("overlay");

function showCart() {
    cartDrawer.classList.add("open");
    overlay.classList.add("open");
}

function hideCart() {
    cartDrawer.classList.remove("open");
    overlay.classList.remove("open");
}

openCart.addEventListener("click", showCart);
closeCart.addEventListener("click", hideCart);
overlay.addEventListener("click", hideCart);