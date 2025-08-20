document.getElementById("submit-link").addEventListener("click", async function (e) {
    e.preventDefault();

    const form = document.getElementById("message-form");
    const formData = new FormData(form);
    const responseBox = document.getElementById("form-response");

    // Grab the Turnstile token
    const tokenInput = document.querySelector('input[name="cf-turnstile-response"]');
    if (!tokenInput || !tokenInput.value) {
        responseBox.textContent = "Please complete the verification.";
        responseBox.className = "error";
        return;
    }

    try {
        const res = await fetch(form.action, {
            method: "POST",
            body: formData
        });
        const json = await res.json();

        if (json.success) {
            responseBox.textContent = "Thank you! Your message is now in the guestbook.";
            responseBox.className = "success";
            form.reset();
        } else {
            responseBox.textContent = json.error || "Something went wrong.";
            responseBox.className = "error";
        }
    } catch (err) {
        responseBox.textContent = "Network error. Please try again.";
        responseBox.className = "error";
    }
});
