(function () {
    // Config: pixels per second. Lower => slower.
    const SPEED_PX_PER_SEC = 40;

    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Normalize markup: if <marquee id="guestbook-marquee"> exists, replace it with viewport/track.
        const marquee = document.getElementById('guestbook-marquee');
        const guestbook = document.getElementById('guestbook');
        if (marquee && guestbook) {
            const vp = document.createElement('div');
            vp.id = 'guestbook-viewport';
            const track = document.createElement('div');
            track.id = 'guestbook-track';
            vp.appendChild(track);
            marquee.parentNode.replaceChild(vp, marquee);
        }

        // Ensure viewport/track exist
        const viewport = document.getElementById('guestbook-viewport') || (guestbook ? (function () {
            const vp = document.createElement('div'); vp.id = 'guestbook-viewport';
            const track = document.createElement('div'); track.id = 'guestbook-track';
            vp.appendChild(track); guestbook.appendChild(vp); return vp;
        })() : null);

        if (!viewport) {
            console.warn('Guestbook viewport not found/created.');
            return;
        }

        const track = document.getElementById('guestbook-track');

        // Insert the CSS required for scrolling (scoped and minimal)
        insertScrollerStyles();

        // helpers (same behavior as before)
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

        function buildHref(raw) {
            if (!raw) return null;
            let s = String(raw).trim();
            if (!s) return null;
            if (s.includes('@') && !s.includes('/') && !s.includes('://')) return null;
            if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) s = 'https://' + s;
            try { return new URL(s).href; } catch (e) { try { return encodeURI(s); } catch (e2) { return null; } }
        }

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

        // Pair entries into groups of 2
        function pairMessages(entries) {
            const pairs = [];
            for (let i = 0; i < entries.length; i += 2) {
                pairs.push([entries[i], (i + 1 < entries.length) ? entries[i + 1] : null]);
            }
            return pairs;
        }

        // Render cards into the track; then setup continuous scrolling
        function render(entries) {
            // Build the HTML for one set of cards
            let singleSetHtml;
            if (!Array.isArray(entries) || entries.length === 0) {
                singleSetHtml = '<span class="guestbook-card"><div class="guestbook-item">No guestbook messages yet.</div><div class="guestbook-item"></div></span>';
            } else {
                const pairs = pairMessages(entries);
                singleSetHtml = pairs.map(pair => {
                    const firstHtml = buildItemHtml(pair[0]);
                    const secondHtml = buildItemHtml(pair[1]) || '<div class="guestbook-item"></div>';
                    return `<span class="guestbook-card">${firstHtml}${secondHtml}</span>`;
                }).join('<span class="guestbook-sep"></span>');
            }

            // Put single set inside a container, duplicate it to avoid gaps.
            // Use two or more copies until contentWidth > viewportWidth * 1.5 for seamless effect on narrow screens.
            track.innerHTML = ''; // clear

            const singleWrapper = document.createElement('div');
            singleWrapper.className = 'guestbook-set';
            singleWrapper.innerHTML = singleSetHtml;
            track.appendChild(singleWrapper);

            // clone until content width sufficiently larger than viewport (to avoid immediate blank areas)
            const ensureCopies = () => {
                const viewportW = viewport.clientWidth || (document.documentElement.clientWidth || 320);
                let contentW = singleWrapper.scrollWidth;
                let copies = 1;
                while (contentW < viewportW * 1.5) {
                    const c = singleWrapper.cloneNode(true);
                    track.appendChild(c);
                    contentW += c.scrollWidth;
                    copies++;
                    // guard
                    if (copies > 8) break;
                }
                // always add one extra copy for seamless loop
                const extra = singleWrapper.cloneNode(true);
                track.appendChild(extra);
            };

            ensureCopies();

            // now compute width of one full singleWrapper (we need a "scroll length" equal to first wrapper width)
            const first = track.querySelector('.guestbook-set');
            const scrollLength = first ? first.scrollWidth : track.scrollWidth;

            // compute duration in seconds: (scrollLength + viewportWidth) / speed
            const viewportWidth = viewport.clientWidth || (document.documentElement.clientWidth || 320);
            const durationSec = Math.max(8, (scrollLength + viewportWidth) / Math.max(1, SPEED_PX_PER_SEC)); // min 8s

            // set CSS variables for animation
            track.style.setProperty('--scroll-distance', `-${scrollLength}px`);
            track.style.setProperty('--scroll-duration', `${durationSec}s`);

            // restart the animation by forcing reflow (safer than toggling class)
            track.style.animation = 'none';
            // small timeout to ensure browser picks up the change
            void track.offsetWidth;
            track.style.animation = `guestbook-scroll var(--scroll-duration) linear infinite`;
        }

        // Fetch messages and render
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
                track.innerHTML = failHtml;
                throw err;
            }
        }

        // Auto refresher (as before)
        function createAutoRefresher(refreshFn, intervalMs = 180000) {
            let timerId = null;
            let pending = false;
            let focusListener = null;
            let visibilityListener = null;
            let running = false;

            function clearTimer() { if (timerId !== null) { clearTimeout(timerId); timerId = null; } }
            function scheduleNext() { clearTimer(); timerId = setTimeout(onTimeout, intervalMs); }

            function onTimeout() {
                if (document.hasFocus() && document.visibilityState === 'visible') { doRefresh(); return; }
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
                    } else { if (running) scheduleNext(); }
                } catch (err) { console.error('Auto refresher: refreshFn threw', err); if (running) scheduleNext(); }
            }
            return {
                start() { if (running) return; running = true; pending = false; cleanupListeners(); scheduleNext(); },
                stop() { running = false; pending = false; clearTimer(); cleanupListeners(); },
                reset() { if (!running) { this.start(); return; } pending = false; cleanupListeners(); scheduleNext(); }
            };
        }

        // handle resize to recompute durations
        let resizeTimer = null;
        function onResize() {
            // debounce
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // re-run loadMessages to re-render with correct widths
                loadMessages().catch(() => { });
            }, 250);
        }
        window.addEventListener('resize', onResize);

        // initial load and start refresher
        loadMessages().catch(() => { });
        const refresher = createAutoRefresher(loadMessages, 180_000);
        refresher.start();

        // Expose for debugging
        window._guestbook = { loadMessages, refresher, render };
    }

    function insertScrollerStyles() {}
})();