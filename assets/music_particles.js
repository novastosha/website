function spawnNoteParticle(x, y) {
    const note = document.createElement('div');
    note.classList.add('note');

    note.style.left = `${x}px`;
    note.style.top = `${y}px`;

    const cols = 4;
    const rows = 3;
    const frameWidth = 24;
    const frameHeight = 32;

    const index = Math.floor(Math.random() * (cols * rows));
    const col = index % cols;
    const row = Math.floor(index / cols);

    note.style.backgroundPosition = `-${col * frameWidth}px -${row * frameHeight}px`;

    document.getElementById('note-container').appendChild(note);

    note.addEventListener('animationend', () => note.remove());
}

window.addEventListener('click', (e) => {
    spawnNoteParticle(e.clientX, e.clientY - 16);
});

setInterval(() => {
    if (!document.hasFocus()) return;

    for (let i = 0; i < 20; i++) {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        spawnNoteParticle(x, y);
    }
}, 400);