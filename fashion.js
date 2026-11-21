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

/* ---------- ROTATING WORDS ---------- */
function rotateText(el, phrases, ms) {
    if (!el) return;                         // do nothing on pages without it
    let i = 0;
    el.textContent = phrases[0];

    setInterval(function () {
        el.classList.add("swap");            // fade out
        setTimeout(function () {
            i = (i + 1) % phrases.length;    // next phrase, back to the first at the end
            el.textContent = phrases[i];
            el.classList.remove("swap");     // fade in
        }, 600);
    }, ms);
}

rotateText(document.getElementById("heroRotator"), [
    "African fashion never stops speaking.",
    "Recognized globally.",
    "Celebrated beyond borders.",
    "African fashion to the world."
], 5000);