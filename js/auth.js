import { auth, db } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    deleteUser,
    signOut
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

/* ---------- helpers ---------- */
const message = document.getElementById("formMessage");

function showMessage(text, type) {
    message.textContent = text;
    message.className = "form-message " + (type || "");
}

function friendlyError(error) {
    const messages = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found": "Incorrect email or password.",
        "auth/wrong-password": "Incorrect email or password.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
        "auth/network-request-failed": "Network problem. Check your connection."
    };
    return messages[error.code] || "Something went wrong. Please try again.";
}

/* ---------- LOGIN ---------- */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();                         // stop the page reloading

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const button = loginForm.querySelector("button[type='submit']");

        button.disabled = true;
        showMessage("Signing in...");

        try {
            const result = await signInWithEmailAndPassword(auth, email, password);

            // being signed in is not enough: they must also be an active admin
            const snap = await getDoc(doc(db, "admins", result.user.uid));

            if (!snap.exists() || snap.data().active !== true) {
                await signOut(auth);
                showMessage("This account does not have admin access.", "error");
                button.disabled = false;
                return;
            }

            window.location.href = "dashboard.html";
        } catch (error) {
            showMessage(friendlyError(error), "error");
            button.disabled = false;
        }
    });
}

/* ---------- REGISTER ---------- */
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const nameInput = document.getElementById("fullName") || document.getElementById("name");
        const fullName = nameInput.value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirm = document.getElementById("confirmPassword").value;
        const inviteCode = document.getElementById("inviteCode").value.trim().toUpperCase();
        const button = registerForm.querySelector("button[type='submit']");

        if (password !== confirm) {
            showMessage("Passwords do not match.", "error");
            return;
        }

        button.disabled = true;
        showMessage("Creating your account...");

        try {
            // 1. create the login
            const result = await createUserWithEmailAndPassword(auth, email, password);

            try {
                // 2. add them to the admins list (the rules check the invite code)
                await setDoc(doc(db, "admins", result.user.uid), {
                    name: fullName,
                    email: email,
                    role: "admin",
                    active: true,
                    inviteCode: inviteCode,
                    createdAt: serverTimestamp()
                });
            } catch (codeError) {
                // the code was wrong or revoked: undo the account we just made
                await deleteUser(result.user);
                showMessage("That invite code is not valid or has been revoked.", "error");
                button.disabled = false;
                return;
            }

            showMessage("Account created. Redirecting...", "success");
            window.location.href = "dashboard.html";
        } catch (error) {
            showMessage(friendlyError(error), "error");
            button.disabled = false;
        }
    });
}