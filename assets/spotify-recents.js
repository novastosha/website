(function () {
    const SPEED_PX_PER_SEC = 50;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        const viewport = document.getElementById('recent-songs-viewport');
        const track = document.getElementById('recent-songs-track');
        if (!viewport || !track) return;

        async function loadTracks() {
            const url = 'https://api.sajed.dev/spotify/recents?limit=20';
            try {
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) throw new Error('Network error ' + res.status);
                const data = await res.json();
                if (!data.success || !Array.isArray(data.tracks)) throw new Error('Bad response');
                render(data.tracks);
            } catch (err) {
                console.warn('recent songs load failed', err);
                track.innerHTML = '<div class="recent-song-card">Could not load recent songs.</div>';
            }
        }

        function render(tracks) {
            if (!tracks.length) {
                track.innerHTML = '<div class="recent-song-card">No recent songs.</div>';
                return;
            }

            const songHtml = tracks.map(t => buildSongHtml(t)).join('');
            track.innerHTML = songHtml;

            // Duplicate content until it's long enough
            const contentWidth = track.scrollWidth;
            const viewportWidth = viewport.clientWidth || 320;
            while (track.scrollWidth < viewportWidth * 2) {
                track.innerHTML += songHtml;
            }

            const scrollLength = track.scrollWidth / 2;
            const durationSec = Math.max(8, (scrollLength + viewportWidth) / SPEED_PX_PER_SEC);

            track.style.setProperty('--scroll-distance', `-${scrollLength}px`);
            track.style.setProperty('--scroll-duration', `${durationSec}s`);

            track.style.animation = 'none';
            void track.offsetWidth;
            track.style.animation = `recent-songs-scroll var(--scroll-duration) linear infinite`;

            // Setup dominant colors + click links
            track.querySelectorAll('.recent-song-card').forEach((card, i) => {
                const song = tracks[i % tracks.length]; // because we duplicate
                extractDominantColor(song.albumImageUrl).then(color => {
                    card.style.setProperty('--dominant', color);
                });
                card.addEventListener('click', () => {
                    if (song.uri) {
                        const id = song.uri.split(':').pop();
                        window.open(`https://open.spotify.com/track/${id}`, '_blank');
                    }
                });
            });
        }

        function buildSongHtml(song) {
            const safe = (s) => String(s || '').replace(/[&<>"']/g, m =>
                ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
            );
            return `
        <div class="recent-song-card">
          <img src="${safe(song.albumImageUrl)}" alt="album art">
          <div class="recent-song-info">
            <div class="recent-song-title">${safe(truncate(song.name, 28))}</div>
            <div class="recent-song-artist">${safe(truncate(song.artist, 32))}</div>
          </div>
        </div>
      `;
        }

        function truncate(s, max) {
            return s.length > max ? s.slice(0, max - 1) + '…' : s;
        }

        // Extract dominant color from album image (average color)
        async function extractDominantColor(url) {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = url;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    let r = 0, g = 0, b = 0, count = 0;
                    for (let i = 0; i < data.length; i += 40) { // sample every 10px-ish
                        r += data[i];
                        g += data[i + 1];
                        b += data[i + 2];
                        count++;
                    }
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);
                    resolve(`rgb(${r},${g},${b})`);
                };
                img.onerror = () => resolve('rgba(255,255,255,0.1)');
            });
        }

        loadTracks();
        setInterval(loadTracks, 180000);
        window.addEventListener('resize', () => loadTracks());
    }
})();