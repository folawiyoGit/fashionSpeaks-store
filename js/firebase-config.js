import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDAgvrRnEFyzfjcZXDJQfRPDwd0A4alMCo",
  authDomain: "fashionspeaks-store.firebaseapp.com",
  projectId: "fashionspeaks-store",
  storageBucket: "fashionspeaks-store.firebasestorage.app",
  messagingSenderId: "686134271792",
  appId: "1:686134271792:web:ded659d14d60672e0cf2f5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);        // login and registration
export const db = getFirestore(app);     // the database