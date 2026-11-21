import { db, auth } from "./firebase-config.js";
import {
    collection,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { escapeHtml } from "./helpers.js";

const codeForm = document.getElementById("codeForm");
const codeNote = document.getElementById("codeNote");
const teamMessage = document.getElementById("teamMessage");
const codeTableBody = document.getElementById("codeTableBody");
const adminTableBody = document.getElementById("adminTableBody");

function showMessage(text, type) {
    teamMessage.textContent = text;
    teamMessage.className = "form-message " + (type || "");
}

function formatDate(timestamp) {
    return timestamp ? timestamp.toDate().toLocaleDateString() : "Just now";
}

/* ---------- make a random invite code like FS-K7M2QX9P ---------- */
function makeCode() {
    // no 0, O, 1 or I, so codes are easy to read out loud
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const random = new Uint32Array(8);
    crypto.getRandomValues(random);                 // secure random numbers

    let code = "FS-";
    random.forEach(function (number) {
        code += letters[number % letters.length];
    });
    return code;
}

/* ---------- invite codes ---------- */
async function loadCodes() {
    try {
        const snapshot = await getDocs(collection(db, "inviteCodes"));
        const codes = snapshot.docs.map(function (item) {
            return { code: item.id, ...item.data() };
        });

        codes.sort(function (a, b) {
            return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });

        if (codes.length === 0) {
            codeTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">No codes yet. Generate one above.</td></tr>';
            return;
        }

        codeTableBody.innerHTML = codes.map(function (item) {
            const badge = item.active
                ? '<span class="badge badge-ok">Active</span>'
                : '<span class="badge badge-bad">Revoked</span>';

            const toggle = item.active
                ? '<button type="button" class="delete-btn" data-action="revoke" data-code="' + item.code + '">Revoke</button>'
                : '<button type="button" class="edit-btn" data-action="activate" data-code="' + item.code + '">Activate</button>';

            return `
                <tr>
                    <td class="code-text">${escapeHtml(item.code)}</td>
                    <td>${escapeHtml(item.note || "")}</td>
                    <td>${formatDate(item.createdAt)}</td>
                    <td>${badge}</td>
                    <td>
                        <button type="button" class="edit-btn" data-action="copy" data-code="${item.code}">Copy</button>
                        ${toggle}
                    </td>
                </tr>`;
        }).join("");
    } catch (error) {
        console.log(error);
        codeTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">Could not load codes. Please refresh.</td></tr>';
    }
}

codeForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const note = codeNote.value.trim();
    if (note === "") return showMessage("Please say who this code is for.", "error");

    const button = codeForm.querySelector("button[type='submit']");
    button.disabled = true;

    const code = makeCode();

    try {
        // the code itself is the document id, so the rules can look it up directly
        await setDoc(doc(db, "inviteCodes", code), {
            note: note,
            active: true,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser ? auth.currentUser.email : ""
        });

        showMessage("Code created: " + code + ". Copy it and send it to " + note + ".", "success");
        codeForm.reset();
        await loadCodes();
    } catch (error) {
        console.log(error);
        showMessage("Could not create the code. Please try again.", "error");
    }

    button.disabled = false;
});

codeTableBody.addEventListener("click", async function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    const code = button.dataset.code;
    const action = button.dataset.action;

    try {
        if (action === "copy") {
            await navigator.clipboard.writeText(code);
            button.textContent = "Copied";
            setTimeout(function () { button.textContent = "Copy"; }, 1500);
        }

        if (action === "revoke") {
            if (!confirm("Revoke " + code + "? Nobody can register with it afterwards.")) return;
            await updateDoc(doc(db, "inviteCodes", code), { active: false });
            await loadCodes();
        }

        if (action === "activate") {
            await updateDoc(doc(db, "inviteCodes", code), { active: true });
            await loadCodes();
        }
    } catch (error) {
        console.log(error);
        showMessage("That did not work. Please try again.", "error");
    }
});

/* ---------- admins ---------- */
async function loadAdmins() {
    try {
        const snapshot = await getDocs(collection(db, "admins"));
        const admins = snapshot.docs.map(function (item) {
            return { id: item.id, ...item.data() };
        });

        if (admins.length === 0) {
            adminTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">No admins to show yet.</td></tr>';
            return;
        }

        adminTableBody.innerHTML = admins.map(function (admin) {
            const badge = admin.active
                ? '<span class="badge badge-ok">Active</span>'
                : '<span class="badge badge-muted">Switched off</span>';

            let action = "";
            if (admin.role === "owner") {
                action = "Owner";                        // the owner can't be switched off
            } else if (admin.active) {
                action = '<button type="button" class="delete-btn" data-id="' + admin.id + '" data-switch="off">Switch off</button>';
            } else {
                action = '<button type="button" class="edit-btn" data-id="' + admin.id + '" data-switch="on">Switch on</button>';
            }

            return `
                <tr>
                    <td>${escapeHtml(admin.name || "")}</td>
                    <td>${escapeHtml(admin.email || "")}</td>
                    <td>${escapeHtml(admin.role || "")}</td>
                    <td>${badge}</td>
                    <td>${action}</td>
                </tr>`;
        }).join("");
    } catch (error) {
        console.log(error);
        adminTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">Could not load admins. Please refresh.</td></tr>';
    }
}

adminTableBody.addEventListener("click", async function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    const turnOff = button.dataset.switch === "off";

    if (turnOff && !confirm("Switch this admin off? They lose access straight away.")) return;

    try {
        await updateDoc(doc(db, "admins", button.dataset.id), { active: !turnOff });
        await loadAdmins();
    } catch (error) {
        console.log(error);
        showMessage("That did not work. Please try again.", "error");
    }
});

/* ---------- start ---------- */
loadCodes();
loadAdmins();