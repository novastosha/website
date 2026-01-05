fetch("https://api.sajed.dev/quotes")
    .then(response => response.json())
    .then(data => {
        const guestbookWrapper = document.querySelector(".guestbook-scroll .scroll-wrapper");
        guestbookWrapper.innerHTML = ""; // Clear existing content

        // 1. Create the original cards
        data["entries"].forEach(entry => {
            const card = createCard(entry); // Helper function extracted below
            guestbookWrapper.appendChild(card);
        });

        // 2. Clone the cards to create the infinite loop effect
        // We convert children to an array to avoid infinite loops if we appended directly while iterating
        const originalCards = Array.from(guestbookWrapper.children);
        
        originalCards.forEach(card => {
            const clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true'); // Hide duplicates from screen readers
            guestbookWrapper.appendChild(clone);
        });
    })
    .catch(error => {
        console.error("Error fetching guestbook entries:", error);
    });

// Helper function to keep code clean
function createCard(entry) {
    const card = document.createElement("div");
    card.className = "guestbook-card";

    const message = document.createElement("p");
    message.className = "guest-message";
    message.textContent = `"${entry.message}"`;

    const header = document.createElement("div");
    header.className = "guest-header";
    header.textContent = `FROM: ${entry.name} // ${new Date(entry.date).toLocaleDateString()}`;

    if (entry.website && entry.website.trim() !== "") {
        const nameLink = document.createElement("a");
        nameLink.href = entry.website;
        nameLink.target = "_blank";
        nameLink.rel = "noreferrer";
        nameLink.textContent = entry.name;
        header.textContent = `FROM: `;
        header.appendChild(nameLink);
        header.appendChild(document.createTextNode(` // ${new Date(entry.date).toLocaleDateString()}`));
    }

    card.appendChild(message);
    card.appendChild(header);
    return card;
}