document.addEventListener('DOMContentLoaded', async () => {
    const currentDirectory = document.getElementById('current_directory');
    currentDirectory.textContent = window.location.pathname;

    const contents = await fetch(`contents.json`)
        .then(response => response.json())
        .catch(() => []);

    if (contents.length === 0) {
        currentDirectory.textContent = "This directory is empty.";
        return;
    }

    const contentList = document.getElementById('content-list')
    contents.forEach(item => {
        if (item['type'] === 'directory') {
            const listItem = document.createElement('li');
            const link = document.createElement('a');

            link.href = `${window.location.pathname}/${item.name}`;
            link.textContent = item.name;
            listItem.appendChild(link);
            contentList.appendChild(listItem);
            return;
        }

        const listItem = document.createElement('li');
        link.href = `${window.location.pathname}/${item}`;
        listItem.textContent = item;
        contentList.appendChild(listItem);
    });

});