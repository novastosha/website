// Email reveal script
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
});