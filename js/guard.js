import { auth, db } from "./firebase-config.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

onAuthStateChanged(auth, async function (user) {
    if (!user) {
        window.location.href = "login.html";            // not logged in
        return;
    }

    try {
        const snap = await getDoc(doc(db, "admins", user.uid));

        if (!snap.exists() || snap.data().active !== true) {
            await signOut(auth);                        // not an admin, or switched off
            window.location.href = "login.html";
            return;
        }

        const admin = snap.data();
        if (document.body.dataset.ownerOnly === "true" && admin.role !== "owner") {
            window.location.href = "dashboard.html";
            return;
        }

        const welcomeText = document.getElementById("welcomeText");
        if (welcomeText) welcomeText.textContent = "Welcome back, " + admin.name + ".";

        const teamLink = document.getElementById("teamLink");
        if (teamLink && admin.role === "owner") teamLink.hidden = false;

        document.body.classList.remove("checking");     // show the page
    } catch (error) {
        window.location.href = "login.html";
    }
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
        await signOut(auth);
        window.location.href = "login.html";
    });
}