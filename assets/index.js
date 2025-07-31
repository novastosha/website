const email = 'bWVAc2FqZWQuZGV2';
document.getElementById("email").addEventListener("click", function () {
    const convertedEmail = atob(email);

    if (this.textContent === "reveal") {
        this.textContent = convertedEmail;
        document.getElementById("click_text").textContent = " (click to copy)";
    } else {
        navigator.clipboard.writeText(convertedEmail).then(() => {
            document.getElementById("click_text").textContent = " (copied!)";
        }).catch(err => {
            document.getElementById("click_text").textContent = " (failed to copy D:)";
            console.error("Failed to copy email: ", err);
        });
    }


})

const badges = [
    { src: "assets/88x31/best_viewed_with_eyes.gif", title: "Best viewed with eyes" },
    { src: "assets/88x31/moist.gif", title: "Moist", href: "https://www.youtube.com/watch?v=8v9d1a6b2eY" },
    { src: "assets/88x31/autism.gif", title: "Autism Awareness", href: "https://www.autismspeaks.org/" },
    { src: "assets/88x31/click_here.gif", title: "Click here", href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
];

const container = document.getElementById("badges");

badges.forEach(({ src, title, href }) => {
    const img = document.createElement("img");
    img.src = src;
    img.title = title;
    img.style.imageRendering = "pixelated";

    if (href) {
        const a = document.createElement("a");
        a.href = href;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.appendChild(img);
        container.appendChild(a);
    } else {
        container.appendChild(img);
    }
});