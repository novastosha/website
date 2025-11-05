document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("guestbook-form");
    const responseEl = document.getElementById("form-response");
    const submitButton = document.getElementById("submit-button");

    if (!form || !responseEl || !submitButton) {
        console.error("Guestbook form elements not found.");
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Disable button
        submitButton.disabled = true;
        submitButton.textContent = "[ Submitting... ]";
        responseEl.textContent = "";
        responseEl.className = "";

        // Get form data
        const formData = new FormData(form);
        const data = {
            name: formData.get("name") || "anonymous",
            website: formData.get("website") || "",
            message: formData.get("message"),
            "cf-turnstile-response": formData.get("cf-turnstile-response")
        };

        // Basic validation
        if (!data.message) {
            setResponse("Message cannot be empty.", "error");
            submitButton.disabled = false;
            submitButton.textContent = "[ Submit ]";
            return;
        }

        if (!data["cf-turnstile-response"]) {
            setResponse("Please complete the CAPTCHA.", "error");
            submitButton.disabled = false;
            submitButton.textContent = "[ Submit ]";
            return;
        }

        try {
            const response = await fetch("https://api.sajed.dev/quotes", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                },
                body: new URLSearchParams(data),
            });

            if (response.ok) {
                setResponse("Success! Your message has been submitted.", "success");
                form.reset();
                // Reset turnstile widget
                if (window.turnstile) {
                    window.turnstile.reset();
                }
            } else {
                const errorData = await response.json();
                const errorMessage = errorData.error || errorData.message || "An unknown error occurred.";
                setResponse(`Error: ${errorMessage}`, "error");
            }

        } catch (error) {
            console.error("Fetch error:", error);
            setResponse("Network error. Please try again.", "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "[ Submit ]";
        }
    });

    function setResponse(message, type) {
        responseEl.textContent = message;
        responseEl.className = type; // 'success' or 'error'
    }
});