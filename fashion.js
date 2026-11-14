let welcome = document.getElementById("welcome");

setTimeout(function () {
    welcome.classList.add("fade-out");        // starts the fade

    setTimeout(function () {
        welcome.classList.add("gone");        // removes it after the fade
    }, 1500);

}, 10000);                                    // wait 15 seconds first

if (sessionStorage.getItem("welcomeSeen")) {
    welcome.classList.add("gone");
} else {
    sessionStorage.setItem("welcomeSeen", "yes");
    // ...the two setTimeout blocks go here
}