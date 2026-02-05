const API = "https://api.sajed.dev/blog";
let currentSlug = "";

// Markdown Setup with Highlight.js
marked.setOptions({
    highlight: function (code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-'
});

window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('post');

    if (slug) {
        loadPost(slug).catch((err) => {
            console.warn('Failed to load post for slug=', slug, err);
            // intentionally do nothing visible to user
            fetchPosts();

        });
    } else {
        // no slug -> show feed as normal
        fetchPosts();
    }
});

async function fetchPosts() {
    try {
        const res = await fetch(`${API}/posts`);
        const data = await res.json();
        if (data.success) renderFeed(data.posts);
    } catch (e) {
        document.getElementById('blog-feed').innerHTML = '<div class="loading-container" style="color:var(--accent-magenta)">Connection failed.</div>';
    }
}

function renderFeed(posts) {
    const feed = document.getElementById('blog-feed');
    if (posts.length === 0) {
        feed.innerHTML = '<div class="loading-container">No posts yet.</div>';
        return;
    }
    feed.innerHTML = posts.map(p => `
                <div class="blog-card" onclick="loadPost('${p.slug}')">
                    ${p.image_url ? `<img src="${p.image_url}" class="blog-image">` : ''}
                    <h3 style="font-size: 1.2rem;">${p.title}</h3>
                    <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 10px;">${p.summary}</p>
                    <div class="card-meta">${new Date(p.created_at).toLocaleDateString()}</div>
                </div>
            `).join('');
}

async function loadPost(slug) {
    currentSlug = slug;
    const res = await fetch(`${API}/posts/${slug}`);
    const data = await res.json();

    if (data.success) {
        document.getElementById('blog-feed').style.display = 'none';
        document.getElementById('blog-reader').style.display = 'block';
        document.getElementById('blogs-header-display').style.display = 'none';
        window.scrollTo(0, 0);

        const post = data.post;

        document.getElementById('post-meta').innerHTML = `
                    <h1 style="margin-bottom: 0.5rem;">${post.title}</h1>
                    <span style="color: var(--accent-green); font-family: var(--font-mono); margin-bottom: 2rem; display:block;">// ${new Date(post.created_at).toDateString()}</span>
                    ${post.image_url ? `<img src="${post.image_url}" style="width:100%; border:1px solid #333; margin-bottom:30px;">` : ''}
                `;

        // Render Markdown
        const contentDiv = document.getElementById('post-body');
        contentDiv.innerHTML = marked.parse(post.content);

        // Render Code
        document.querySelectorAll('pre code').forEach((el) => { hljs.highlightElement(el); });

        // Render Math
        renderMathInElement(contentDiv, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ]
        });

        renderComments(data.comments);
    }
}

function renderComments(comments) {
    const list = document.getElementById('comments-list');
    if (comments.length === 0) {
        list.innerHTML = '<p style="opacity:0.5; font-style:italic;">No comments yet.</p>';
        return;
    }
    list.innerHTML = comments.map(c => `
                <div style="margin-bottom: 20px; border-left: 2px solid var(--accent-green); padding-left: 15px;">
                    <strong style="color: var(--accent-magenta); font-family: var(--font-headers);">${c.author}</strong>
                    <p style="margin:0; font-size: 0.95rem;">${c.content}</p>
                </div>
            `).join('');
}

async function postComment(event) {
    if (event && event.preventDefault) event.preventDefault();

    if (!currentSlug) return;

    const author = document.getElementById('c-author').value.trim();
    const content = document.getElementById('c-text').value.trim();
    const turnstileToken = document.querySelector('.cf-turnstile-response') ? document.querySelector('.cf-turnstile-response').value : null;

    if (!author || !content) {
        return;
    }

    try {
        const res = await fetch(`${API}/posts/${currentSlug}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author, content, turnstileToken })
        });

        if (res.ok) {
            // clear the message and re-load comment
            document.getElementById('c-text').value = '';
            // reload the current post to refresh comments
            await loadPost(currentSlug);
        } else {
            // failed to post — you can add error handling here if desired
            console.warn('Failed to post comment', await res.text());
        }
    } catch (err) {
        console.error('Error posting comment', err);
    }
}


function showFeed() {
    document.getElementById('blog-feed').style.display = 'grid';
    document.getElementById('blog-reader').style.display = 'none';
    document.getElementById('blogs-header-display').style.display = 'block';
    window.scrollTo(0, 0);
}