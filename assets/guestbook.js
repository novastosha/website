
fetch("https://api.sajed.dev/quotes")
    .then(response => response.json())
    .then(data => {
        const guestbookWrapper = document.querySelector(".guestbook-scroll .scroll-wrapper");
        guestbookWrapper.innerHTML = ""; // Clear existing content



        data["entries"].forEach(entry => {
            const card = document.createElement("div");
            card.className = "guestbook-card";

            const message = document.createElement("p");
            message.className = "guest-message";
            message.textContent = `"${entry.message}"`;

            const header = document.createElement("div");
            header.className = "guest-header";
            header.textContent = `FROM: ${entry.name} // ${new Date(entry.date).toLocaleDateString()}`;

            // if website available / not empty, make name a link
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
            guestbookWrapper.appendChild(card);
        });
    })
    .catch(error => {
        console.error("Error fetching guestbook entries:", error);
    });