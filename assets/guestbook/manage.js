(function () {
    const endpoint = 'https://api.sajed.dev/quotes/manage';
    const tokenInput = document.getElementById('token');
    const loadBtn = document.getElementById('load');
    const refreshBtn = document.getElementById('refresh');
    const feedback = document.getElementById('feedback');
    const listPanel = document.getElementById('list-panel');
    const listBody = document.getElementById('list-body');
    const selectAll = document.getElementById('select-all');
    const actionSelect = document.getElementById('action-select');
    const submitActionBtn = document.getElementById('submit-action');

    let entriesByUuid = {};

    function setFeedback(message, type = '') {
        feedback.textContent = message;
        feedback.className = type ? type : '';
    }

    function clearList() {
        entriesByUuid = {};
        listBody.innerHTML = '';
        listPanel.style.display = 'none';
        selectAll.checked = false;
    }

    async function postForm(formData) {
        const res = await fetch(endpoint, { method: 'POST', body: formData });
        let json;
        try { json = await res.json(); } catch (e) { throw new Error('Invalid JSON response'); }
        return json;
    }

    async function fetchList() {
        setFeedback('Loading messages...', '');
        clearList();

        const token = tokenInput.value.trim();
        if (!token) { setFeedback('Enter token first.', 'error'); return; }

        const fd = new FormData();
        fd.append('action', 'GET');
        fd.append('token', token);

        try {
            const result = await postForm(fd);
            if (!result || !result.success) { setFeedback(result?.error || 'Failed to load messages', 'error'); return; }
            const arr = result.result || [];
            if (!Array.isArray(arr) || arr.length === 0) { setFeedback('No messages found.', 'success'); return; }
            arr.forEach(e => entriesByUuid[e.uuid] = e);
            renderList(arr);
            setFeedback(`Loaded ${arr.length} message${arr.length !== 1 ? 's' : ''}.`, 'success');
            listPanel.style.display = '';
        } catch (err) {
            console.error(err);
            setFeedback('Network or server error while loading.', 'error');
        }
    }

    function renderList(arr) {
        listBody.innerHTML = '';
        arr.slice().reverse().forEach(entry => {
            const tr = document.createElement('tr');

            const chkTd = document.createElement('td');
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.className = 'checkbox';
            chk.dataset.uuid = entry.uuid;
            chk.addEventListener('change', onSelectionChange);
            chkTd.appendChild(chk);
            tr.appendChild(chkTd);

            const msgTd = document.createElement('td');
            msgTd.className = 'entry-message';
            msgTd.textContent = entry.message || '(no message)';
            tr.appendChild(msgTd);

            const authorTd = document.createElement('td');
            authorTd.innerHTML = `<div><strong>${escapeHtml(entry.name || 'anonymous')}</strong></div>` +
                `<div class="meta">${escapeHtml(entry.website || '')}</div>`;
            tr.appendChild(authorTd);

            const approvedTd = document.createElement('td');
            const approved = !!entry.approved;
            approvedTd.innerHTML = approved ? `<span class="badge-yes">Yes</span>` : `<span class="badge-no">No</span>`;
            tr.appendChild(approvedTd);

            const dateTd = document.createElement('td');
            dateTd.textContent = entry.date || '';
            tr.appendChild(dateTd);

            listBody.appendChild(tr);
        });
    }

    function onSelectionChange() {
        const total = document.querySelectorAll('#list-body input[type="checkbox"]').length;
        const checked = document.querySelectorAll('#list-body input[type="checkbox"]:checked').length;
        selectAll.checked = (total > 0 && checked === total);
    }

    selectAll.addEventListener('change', () => {
        const all = document.querySelectorAll('#list-body input[type="checkbox"]');
        all.forEach(cb => cb.checked = selectAll.checked);
    });

    async function submitAction() {
        const token = tokenInput.value.trim();
        if (!token) { setFeedback('Enter token first.', 'error'); return; }

        const selectedUuids = Array.from(document.querySelectorAll('#list-body input[type="checkbox"]:checked'))
            .map(cb => cb.dataset.uuid);

        if (selectedUuids.length === 0) { setFeedback('No items selected.', 'error'); return; }

        const action = actionSelect.value;
        if (action === 'DELETE') {
            if (!confirm(`Delete ${selectedUuids.length} selected message${selectedUuids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
            const fd = new FormData();
            fd.append('action', 'DELETE');
            fd.append('token', token);
            fd.append('uuids', JSON.stringify(selectedUuids));
            try {
                setFeedback('Deleting...', '');
                const resp = await postForm(fd);
                if (resp?.success) { setFeedback('Deleted successfully.', 'success'); await fetchList(); }
                else { setFeedback(resp?.error || 'Delete failed', 'error'); }
            } catch (err) { console.error(err); setFeedback('Network error during delete.', 'error'); }
        } else if (action === 'APPROVE') {
            const payload = selectedUuids.map(uuid => {
                const e = entriesByUuid[uuid] || {};
                return { uuid, name: e.name || '', website: e.website || '', message: e.message || '', date: e.date || '' };
            });
            const fd = new FormData();
            fd.append('action', 'APPROVE');
            fd.append('token', token);
            fd.append('uuids', JSON.stringify(payload));
            try {
                setFeedback('Approving...', '');
                const resp = await postForm(fd);
                if (resp?.success) { setFeedback('Approved successfully.', 'success'); await fetchList(); }
                else { setFeedback(resp?.error || 'Approve failed', 'error'); }
            } catch (err) { console.error(err); setFeedback('Network error during approve.', 'error'); }
        } else {
            setFeedback('Unknown action', 'error');
        }
    }

    function escapeHtml(s) { if (!s) return ''; return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }

    loadBtn.addEventListener('click', async (e) => { e.preventDefault(); await fetchList(); });
    refreshBtn.addEventListener('click', async (e) => { e.preventDefault(); await fetchList(); });
    submitActionBtn.addEventListener('click', async (e) => { e.preventDefault(); submitActionBtn.disabled = true; try { await submitAction(); } finally { submitActionBtn.disabled = false; } });
    tokenInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); loadBtn.click(); } });

})();