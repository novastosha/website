(function () {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // find the element that will receive the cards
        const container = document.getElementById('guestbook-marquee')
            || document.getElementById('guestbook-track')
            || document.querySelector('#guestbook > div')
            || document.getElementById('guestbook');

        if (!container) {
            // nothing to do
            console.warn('Guestbook container not found.');
            return;
        }

        let lastFingerprint = null;

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

        // Build a safe href (returns null if invalid)
        function buildHref(raw) {
            if (!raw) return null;
            let s = String(raw).trim();
            if (!s) return null;
            // If it looks like an email, bail (we don't want mailto here)
            if (s.includes('@') && !s.includes('/') && !s.includes('://')) return null;
            if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) {
                s = 'https://' + s;
            }
            try {
                // validate URL
                const u = new URL(s);
                return u.href;
            } catch (e) {
                // try encodeURI fallback
                try {
                    return encodeURI(s);
                } catch (e2) {
                    return null;
                }
            }
        }

        // pair messages into [m1, m2]
        function pairMessages(entries) {
            const pairs = [];
            for (let i = 0; i < entries.length; i += 2) {
                pairs.push([entries[i], (i + 1 < entries.length) ? entries[i + 1] : null]);
            }
            return pairs;
        }

        // build HTML for a single message (returns empty string for falsy)
        function buildItemHtml(e) {
            if (!e) return '';
            const name = escapeHtml(e.name || 'anonymous');
            const href = buildHref(e.website);
            const websiteHtml = href ? ` <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(e.website || href)}</a>` : '';
            const date = prettyDate(e.date || e.created_at || e.time || '');
            const message = escapeHtml(e.message || '(no message)');
            const dateHtml = `<span class="guestbook-date">${date}</span>`;
            return `<div class="guestbook-item"><div class="meta"><strong>${name}</strong>${websiteHtml}${dateHtml}</div><div class="guestbook-message">${message}</div></div>`;
        }

        // Render array of entries as inline cards containing exactly two stacked messages
        function render(entries) {
            if (!Array.isArray(entries) || entries.length === 0) {
                const emptyHtml = '<span class="guestbook-card"><div class="guestbook-item">No guestbook messages yet.</div><div class="guestbook-item"></div></span>';
                if (container.innerHTML !== emptyHtml) container.innerHTML = emptyHtml;
                return;
            }

            // fingerprint to avoid updating if identical
            const fingerprint = JSON.stringify(entries.map(e => [e.uuid || e.id || e.message, e.date || e.time || '']));
            if (fingerprint === lastFingerprint) {
                // nothing changed — avoid touching DOM (prevents marquee reflow)
                return;
            }
            lastFingerprint = fingerprint;

            const pairs = pairMessages(entries);
            const html = pairs.map(pair => {
                const firstHtml = buildItemHtml(pair[0]);
                const secondHtml = buildItemHtml(pair[1]) || '<div class="guestbook-item"></div>';
                return `<span class="guestbook-card">${firstHtml}${secondHtml}</span>`;
            }).join('<span class="guestbook-sep"></span>');

            container.innerHTML = html;
        }

        async function loadMessages() {
            const url = 'https://api.sajed.dev/quotes';
            try {
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) throw new Error('network ' + res.status);
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
                const failHtml = '<span class="guestbook-card"><div class="guestbook-item">Could not load guestbook messages.</div><div class="guestbook-item"></div></span>';
                if (container.innerHTML !== failHtml) container.innerHTML = failHtml;
                throw err;
            }
        }

        // auto refresher (keeps your existing behavior)
        function createAutoRefresher(refreshFn, intervalMs = 180000) {
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

        // initial load + start refresher
        loadMessages().catch(() => { });
        const refresher = createAutoRefresher(loadMessages, 180_000);
        refresher.start();

        window._guestbook = { loadMessages, refresher, render };
    }
})();
