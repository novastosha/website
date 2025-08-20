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

        const parts = entries.map(e => {
            const name = escapeHtml(e.name || 'Anonymous');
            let website = (e.website && String(e.website).trim()) ? escapeHtml(e.website.trim()) : null;
            if (!(website.startsWith("https://") || website.startsWith("http://"))) {
                website = "https://"+website
            }

            const date = prettyDate(e.date || e.created_at || e.time || '');
            const message = escapeHtml(e.message || '(no message)');

            const nameHtml = `<strong>${name}</strong>`;
            const websiteHtml = website ? ` <a href="${website}" target="_blank" rel="noreferrer">${website}</a>` : '';
            const dateHtml = `<span class="guestbook-date">${date}</span>`;

            return `<span class="guestbook-entry">${nameHtml}${websiteHtml}${dateHtml}<div class="guestbook-message">${message}</div></span>`;
        });

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

            render(arr);
            return arr; // return for the refresher's promise-handling
        } catch (err) {
            console.warn('guestbook load failed', err);
            marquee.innerHTML = '<span class="guestbook-entry">Could not load guestbook messages.</span>';
            throw err;
        }
    }

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
            if (document.hasFocus() && document.visibilityState === 'visible') {
                doRefresh();
                return;
            }

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

    // initial load, then start the refresher
    // call loadMessages immediately to populate the marquee on page open
    loadMessages().catch(() => {/* ignore initial load errors (render shows message) */ });

    const refresher = createAutoRefresher(loadMessages, 60_000);
    refresher.start();


})();