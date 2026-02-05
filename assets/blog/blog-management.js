
const API_BASE = "https://api.sajed.dev/blog";
let authToken = localStorage.getItem('blog_token');
let currentPostId = null;
let postsCache = [];

// Undo/Redo Stack
let historyStack = [];
let historyIndex = -1;

marked.setOptions({
    highlight: function (code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-'
});

window.addEventListener('load', () => { if (authToken) showDashboard(); });

document.getElementById('auth-token').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleLogin();
});

// Editor Input with Debounced Preview & History
const editor = document.getElementById('editor-content');
editor.addEventListener('input', (e) => {
    renderPreview();
    saveHistory();
});

// Key bindings for Undo/Redo
editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
    }
});

function saveHistory() {
    // Remove future history if we type something new while in the middle of the stack
    if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
    }
    historyStack.push(editor.value);
    historyIndex++;
    // Limit stack size
    if (historyStack.length > 50) {
        historyStack.shift();
        historyIndex--;
    }
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        editor.value = historyStack[historyIndex];
        renderPreview();
    }
}

function redo() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        editor.value = historyStack[historyIndex];
        renderPreview();
    }
}

function renderPreview() {
    const val = editor.value;
    const html = marked.parse(val);
    const preview = document.getElementById('preview-pane');
    preview.innerHTML = html;

    preview.querySelectorAll('pre code').forEach((el) => { hljs.highlightElement(el); });


    // Render Math
    renderMathInElement(preview, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
        ]
    });
}

// Layout Control
function setLayout(type) {
    const pane = document.getElementById('split-pane');
    pane.classList.remove('layout-editor-only', 'layout-preview-only');
    if (type === 'editor') pane.classList.add('layout-editor-only');
    if (type === 'preview') pane.classList.add('layout-preview-only');
}

// Auto-Slug
document.getElementById('edit-title').addEventListener('input', (e) => {
    if (!currentPostId) {
        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        document.getElementById('edit-slug').value = slug;
    }
});

// --- AUTH & NAV ---
function handleLogin() {
    const input = document.getElementById('auth-token').value;
    if (!input) return;
    authToken = input;
    localStorage.setItem('blog_token', authToken);
    showDashboard();
}

function handleLogout() {
    localStorage.removeItem('blog_token');
    location.reload();
}

function showDashboard() {
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'grid';
    renderList();
}

async function api(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) endpoint += `?token=${encodeURIComponent(authToken)}`;

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method, headers, body: body ? JSON.stringify(body) : null
        });
        if (res.status === 401) { handleLogout(); throw new Error("Unauthorized"); }
        return await res.json();
    } catch (err) {
        console.error(err);
        return { success: false };
    }
}

function switchView(mode) {
    const list = document.getElementById('list-container');
    const editorWrapper = document.getElementById('editor-wrapper');
    if (mode === 'list') {
        list.classList.remove('hidden'); list.classList.add('visible-grid');
        editorWrapper.classList.remove('visible-flex'); editorWrapper.classList.add('hidden');
    } else {
        list.classList.remove('visible-grid'); list.classList.add('hidden');
        editorWrapper.classList.remove('hidden'); editorWrapper.classList.add('visible-flex');
        // Reset Layout
        setLayout('split');
        // Reset History for new post
        historyStack = []; historyIndex = -1;
    }
}

// --- TOOLBAR ---
function insertMD(before, after) {
    saveHistory(); // Save state before edit
    const scrollTop = editor.scrollTop;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    const selection = text.substring(start, end);

    editor.value = text.substring(0, start) + before + selection + after + text.substring(end);
    editor.focus();
    editor.selectionEnd = end + before.length;
    editor.scrollTop = scrollTop;

    renderPreview();
    saveHistory(); // Save state after edit
}

function insertTable() {
    insertMD(`\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n`, "");
}

// --- DATA OPS ---
async function renderList() {
    switchView('list');
    const container = document.getElementById('list-container');
    container.innerHTML = '<p style="color:var(--text-muted)">Loading posts...</p>';

    const data = await api('/manage/all');
    if (!data.success) { container.innerHTML = '<p>Error loading.</p>'; return; }

    postsCache = data.posts;
    container.innerHTML = '';

    if (postsCache.length === 0) container.innerHTML = '<p>No posts found.</p>';

    postsCache.forEach(post => {
        const statusHtml = post.is_published
            ? '<span class="status-badge status-live">LIVE</span>'
            : '<span class="status-badge status-draft">DRAFT</span>';

        const card = document.createElement('div');
        card.className = 'post-card';
        card.onclick = () => loadPostForEdit(post.id);
        card.innerHTML = `
                    <div>
                        <div style="margin-bottom: 10px;">${statusHtml}</div>
                        <h3 style="margin: 0; color: var(--text-main); font-size: 1.1rem;">${post.title}</h3>
                        <small style="font-family: var(--font-mono); color: var(--text-muted);">${new Date(post.created_at).toLocaleDateString()}</small>
                    </div>
                `;
        container.appendChild(card);
    });
}

function initNewPost() {
    currentPostId = null;
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-slug').value = '';
    document.getElementById('edit-image').value = '';
    document.getElementById('editor-content').value = '';
    document.getElementById('edit-published').checked = false;
    document.getElementById('preview-pane').innerHTML = '';
    document.getElementById('img-preview').style.backgroundImage = 'none';
    document.getElementById('btn-delete').classList.add('hidden');
    saveHistory(); // Init history
    switchView('editor');
}

function loadPostForEdit(id) {
    const post = postsCache.find(p => p.id === id);
    if (!post) return;
    currentPostId = post.id;

    document.getElementById('edit-title').value = post.title;
    document.getElementById('edit-slug').value = post.slug;
    document.getElementById('edit-image').value = post.image_url || '';
    document.getElementById('editor-content').value = post.content;
    document.getElementById('edit-published').checked = !!post.is_published;

    updateImagePreview(post.image_url);
    renderPreview();

    document.getElementById('btn-delete').classList.remove('hidden');
    saveHistory(); // Init history
    switchView('editor');
}

function updateImagePreview(url) {
    document.getElementById('img-preview').style.backgroundImage = url ? `url('${url}')` : 'none';
}

function openSettings() { document.getElementById('settings-modal').style.display = 'flex'; }
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }

async function saveCurrentPost() {
    const btn = document.querySelector('.editor-footer .btn-primary');
    const status = document.getElementById('save-status');

    status.innerText = 'Saving...';
    btn.style.pointerEvents = 'none';

    const content = document.getElementById('editor-content').value;
    const summary = content.replace(/[#*_`\[\]$]/g, '').substring(0, 160) + '...';

    const payload = {
        id: currentPostId,
        title: document.getElementById('edit-title').value,
        slug: document.getElementById('edit-slug').value,
        image_url: document.getElementById('edit-image').value,
        content: content,
        is_published: document.getElementById('edit-published').checked,
        summary
    };

    const result = await api('/manage/upsert', 'POST', payload);
    btn.style.pointerEvents = 'auto';

    if (result.success) {
        currentPostId = result.id;
        status.innerText = 'Saved.';
        document.getElementById('btn-delete').classList.remove('hidden');
    } else {
        status.innerText = 'Error.';
    }
}

async function deleteCurrentPost() {
    if (!currentPostId || !confirm("Delete this post?")) return;
    const res = await api(`/manage/posts/${currentPostId}`, 'DELETE');
    if (res.success) renderList();
}