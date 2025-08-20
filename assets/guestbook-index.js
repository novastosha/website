(function () {
    const marquee = document.getElementById('guestbook-marquee');

    // Escape HTML to avoid injection
    function escapeHtml(s) {
        if (s === undefined || s === null) return '';
        return String(s)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    // Pretty date formatting: "20 Aug 2025, 14:32"
    function prettyDate(iso) {
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return escapeHtml(String(iso || ''));
            return d.toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return escapeHtml(String(iso || ''));
        }
    }

    // Render entries into marquee content
    function render(entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
            marquee.innerHTML = '<span class="guestbook-entry">No guestbook messages yet.</span>';
            return;
        }

        // Build a sequence of inline entries separated by a small gap
        const parts = entries.map(e => {
            const name = escapeHtml(e.name || 'anonymous');
            const website = (e.website && String(e.website).trim()) ? escapeHtml(e.website.trim()) : null;
            const date = prettyDate(e.date || e.created_at || e.time || '');
            const message = escapeHtml(e.message || '(no message)');

            const nameHtml = `<strong>${name}</strong>`;
            const websiteHtml = website ? ` <a href="${website}" target="_blank" rel="noreferrer">${website}</a>` : '';
            const dateHtml = `<span class="guestbook-date">${date}</span>`;

            return `<span class="guestbook-entry">${nameHtml}${websiteHtml}${dateHtml}<div class="guestbook-message">${message}</div></span>`;
        });

        // Join with small separators to make the marquee readable
        marquee.innerHTML = parts.join('<span class="guestbook-sep"></span>');
    }

    // Fetch messages from the API (attempt a couple of common response shapes)
    async function loadMessages() {
        const url = 'https://api.sajed.dev/quotes';
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error('network');
            const data = await res.json();

            // common shapes:
            // 1) an array: [ { name, website, message, date }, ... ]
            // 2) { result: [...] } or { data: [...] }
            let arr = [];
            if (Array.isArray(data)) arr = data;
            else if (Array.isArray(data.result)) arr = data.result;
            else if (Array.isArray(data.data)) arr = data.data;
            else if (Array.isArray(data.messages)) arr = data.messages;
            else {
                // try to find an array property
                for (const k in data) {
                    if (Array.isArray(data[k])) { arr = data[k]; break; }
                }
            }

            // sanitize and render
            render(arr);
        } catch (err) {
            console.warn('guestbook load failed', err);
            marquee.innerHTML = '<span class="guestbook-entry">Could not load guestbook messages.</span>';
        }
    }

    loadMessages();

})();