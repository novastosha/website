async function displayMusic() {
    let musicData = await fetch('assets/music/music.json')
        .then(response => response.json())
        .catch(error => {
            console.error("Error fetching music data:", error);
            return [];
        });

    if (!musicData || musicData.length === 0) return;

    const contentDiv = document.getElementById("music-list");
    const lastUpdated = document.getElementById("last-updated");
    lastUpdated.textContent = new Date(await fetch('assets/music/last_updated.json').then(response => response.json()).then(data => data.last_updated)).toLocaleDateString();

    musicData.forEach(song => {
        const songDiv = document.createElement("div");
        songDiv.classList.add("song");

        const cover = document.createElement("img");
        cover.src = song.image || '';
        cover.alt = `${song.title} cover`;
        songDiv.appendChild(cover);

        const meta = document.createElement("div");

        const title = document.createElement("h3");
        title.textContent = song.title;
        meta.appendChild(title);

        const artist = document.createElement("p");
        artist.textContent = `Artist: ${song.artist}`;
        meta.appendChild(artist);

        const album = document.createElement("p");
        album.textContent = `Album: ${song.album}`;
        meta.appendChild(album);

        const links = document.createElement("p");
        song.urls.forEach(url => {
            const link = document.createElement("a");
            link.href = url.url;
            link.textContent = `[${url.type}]`;
            link.target = "_blank";
            links.appendChild(link);
        });
        meta.appendChild(links);

        songDiv.appendChild(meta);
        contentDiv.appendChild(songDiv);

        cover.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = cover.naturalWidth;
            canvas.height = cover.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(cover, 0, 0);

            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }

            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);

            songDiv.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            const isDark = brightness < 128;

            const linkColor = isDark
                ? `rgb(${Math.min(r + 60, 255)}, ${Math.min(g + 60, 255)}, ${Math.min(b + 60, 255)})`
                : `rgb(${Math.max(r - 60, 0)}, ${Math.max(g - 60, 0)}, ${Math.max(b - 60, 0)})`;

            meta.style.color = isDark ? 'white' : 'black';

            meta.querySelectorAll('a').forEach(link => {
                link.style.color = linkColor;
                link.style.borderColor = linkColor;
                link.onmouseover = () => {
                    link.style.background = linkColor;
                    link.style.color = isDark ? 'black' : 'white';
                };
                link.onmouseout = () => {
                    link.style.background = 'transparent';
                    link.style.color = linkColor;
                };
            });
        };
    });
}

displayMusic();