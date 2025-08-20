(function () {
    const marquee = document.getElementById('guestbook-marquee');

    function escapeHtml(s) {
        if (s === undefined || s === null) return '';
        return String(s)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

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

    // Pair messages into arrays of two: [msg1, msg2], last may have null as second
    function pairMessages(entries) {
        const pairs = [];
        for (let i = 0; i < entries.length; i += 2) {
            pairs.push([entries[i], (i + 1 < entries.length) ? entries[i + 1] : null]);
        }
        return pairs;
    }

    // Build HTML for a single message item
    function buildItemHtml(e) {
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

    function render(entries) {
        if (!Array.isArray(entries) || entries.length === 0) {
            marquee.innerHTML = '<span class="guestbook-card"><div class="guestbook-item">No guestbook messages yet.</div><div class="guestbook-item"></div></span>';
            return;
        }

        const pairs = pairMessages(entries);

        const html = pairs.map(pair => {
            const firstHtml = buildItemHtml(pair[0]);
            const secondHtml = buildItemHtml(pair[1]) || '<div class="guestbook-item"></div>';
            return `<span class="guestbook-card">${firstHtml}${secondHtml}</span>`;
        }).join('<span class="guestbook-sep"></span>');

        marquee.innerHTML = html;
    }

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
                for (const k in data) {
                    if (Array.isArray(data[k])) { arr = data[k]; break; }
                }
            }

            render(arr);
            return arr;
        } catch (err) {
            console.warn('guestbook load failed', err);
            marquee.innerHTML = '<span class="guestbook-card"><div class="guestbook-item">Could not load guestbook messages.</div><div class="guestbook-item"></div></span>';
            throw err;
        }
    }

    // Auto refresher (as requested earlier)
    function createAutoRefresher(refreshFn, intervalMs = 60000) {
        let timerId = null;
        let pending = false;
        let focusListener = null;
        let visibilityListener = null;
        let running = false;

        function clearTimer() {
            if (timerId !== null) { clearTimeout(timerId); timerId = null; }
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
            focusListener = () => { if (!pending) return; pending = false; cleanupListeners(); doRefresh(); };
            window.addEventListener('focus', focusListener, { once: true });

            visibilityListener = () => { if (!pending) return; if (document.visibilityState === 'visible') { pending = false; cleanupListeners(); doRefresh(); } };
            document.addEventListener('visibilitychange', visibilityListener);
        }

        function cleanupListeners() {
            if (focusListener) { window.removeEventListener('focus', focusListener); focusListener = null; }
            if (visibilityListener) { document.removeEventListener('visibilitychange', visibilityListener); visibilityListener = null; }
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
            start() { if (running) return; running = true; pending = false; cleanupListeners(); scheduleNext(); },
            stop() { running = false; pending = false; clearTimer(); cleanupListeners(); },
            reset() { if (!running) { this.start(); return; } pending = false; cleanupListeners(); scheduleNext(); }
        };
    }

    // Initial load + refresher start
    loadMessages().catch(() => { });
    const refresher = createAutoRefresher(loadMessages, 180_000);
    refresher.start();

    window._guestbook = { loadMessages, refresher };
})();