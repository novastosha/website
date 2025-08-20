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

    function makeCards(entries) {
        const cards = [];
        for (let i = 0; i < entries.length; i += 2) {
            const first = entries[i];
            const second = (i + 1) < entries.length ? entries[i + 1] : null;
            cards.push([first, second]);
        }
        return cards;
    }

    // Render cards into marquee content
    function render(entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
            marquee.innerHTML = '<span class="guestbook-card"><div class="guestbook-item">No guestbook messages yet.</div></span>';
            return;
        }

        const cards = makeCards(entries);

        const parts = cards.map(pair => {
            const first = pair[0];
            const second = pair[1];

            function itemHtml(e) {
                if (!e) return '';
                const name = escapeHtml(e.name || 'anonymous');
                let website = (e.website && String(e.website).trim()) ? escapeHtml(e.website.trim()) : null;
                if (website) {
                    if (!(website.startsWith("https://") || website.startsWith("http://"))) {
                        website = "https://" + website
                    }
                }
                const date = prettyDate(e.date || e.created_at || e.time || '');
                const message = escapeHtml(e.message || '(no message)');

                const websiteHtml = website ? ` <a href="${website}" target="_blank" rel="noreferrer">${website}</a>` : '';
                const dateHtml = `<span class="guestbook-date">${date}</span>`;

                return `<div class="guestbook-item"><div class="meta"><strong>${name}</strong>${websiteHtml}${dateHtml}</div><div class="guestbook-message">${message}</div></div>`;
            }

            // build a single card with two stacked items
            return `<span class="guestbook-card">${itemHtml(first)}${itemHtml(second)}</span>`;
        });

        // Join cards with a small separator
        marquee.innerHTML = parts.join('<span class="guestbook-sep"></span>');
    }

    // Fetch messages from the API (attempt a couple of common response shapes)
    async function loadMessages() {
        const url = 'https://api.sajed.dev/quotes';
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error('network');
            const data = await res.json();


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
            return arr;
        } catch (err) {
            console.warn('guestbook load failed', err);
            marquee.innerHTML = '<span class="guestbook-card"><div class="guestbook-item">Could not load guestbook messages.</div></span>';
            throw err;
        }
    }

    /**
     * createAutoRefresher(refreshFn, intervalMs = 60000)
     * - refreshFn: function to call when refreshing (may return a Promise)
     * - intervalMs: milliseconds between refresh attempts
     *
     * Behavior:
     *  - After intervalMs elapses, if document has focus & is visible -> refresh immediately.
     *  - Otherwise wait until focus/visibility then refresh once and reset timer.
     *  - Supports async refreshFn (won't start next interval until promise resolves/rejects).
     */
    function createAutoRefresher(refreshFn, intervalMs = 60_000) {
        let timerId = null;
        let pending = false;
        let focusListener = null;
        let visibilityListener = null;
        let running = false;

        function clearTimer() {
            if (timerId !== null) {
                clearTimeout(timerId);
                timerId = null;
            }
        }

        function scheduleNext() {
            clearTimer();
            timerId = setTimeout(onTimeout, intervalMs);
        }

        function onTimeout() {
            // interval elapsed
            if (document.hasFocus() && document.visibilityState === 'visible') {
                doRefresh();
                return;
            }

            // wait for focus/visibility
            pending = true;

            focusListener = () => {
                if (!pending) return;
                pending = false;
                cleanupListeners();
                doRefresh();
            };
            window.addEventListener('focus', focusListener, { once: true });

            visibilityListener = () => {
                if (!pending) return;
                if (document.visibilityState === 'visible') {
                    pending = false;
                    cleanupListeners();
                    doRefresh();
                }
            };
            document.addEventListener('visibilitychange', visibilityListener);
        }

        function cleanupListeners() {
            if (focusListener) {
                window.removeEventListener('focus', focusListener);
                focusListener = null;
            }
            if (visibilityListener) {
                document.removeEventListener('visibilitychange', visibilityListener);
                visibilityListener = null;
            }
        }

        function doRefresh() {
            try {
                const maybePromise = refreshFn();
                if (maybePromise && typeof maybePromise.then === 'function') {
                    maybePromise.finally(() => { if (running) scheduleNext(); });
                } else {
                    if (running) scheduleNext();
                }
            } catch (err) {
                console.error('Auto refresher: refreshFn threw', err);
                if (running) scheduleNext();
            }
        }

        return {
            start() {
                if (running) return;
                running = true;
                pending = false;
                cleanupListeners();
                scheduleNext();
            },
            stop() {
                running = false;
                pending = false;
                clearTimer();
                cleanupListeners();
            },
            reset() {
                if (!running) { this.start(); return; }
                pending = false;
                cleanupListeners();
                scheduleNext();
            }
        };
    }

    loadMessages().catch(() => { /* ignore initial load errors (render shows message) */ });
    const refresher = createAutoRefresher(loadMessages, 180_000);
    refresher.start();

    window._guestbook = { loadMessages, refresher };
})();