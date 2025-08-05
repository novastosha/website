
function getUrlContent() {
    const queryString = window.location.search.slice(1);
    return queryString == '' ? undefined : queryString;
}

document.addEventListener('DOMContentLoaded', async () => {
    const content = getUrlContent();
    if (content) {
        const knownCustomContent = await fetch('../assets/c/custom_content.json')
            .then(response => response.json())
            .catch(() => ({}));

        const customContent = knownCustomContent[content];
        if (customContent) {
            document.getElementById('header').textContent = "Redirecting...";

            const contentType = customContent.type;
            switch (contentType) {
                case 'href':
                    window.location.href = customContent.href;
                    break;
                case 'file':
                    window.location.href = `c/${customContent.file}`;
                    break;
                default:
                    console.warn(`Unknown content type: ${contentType}`);
            }
        
            return;
        }
    }

    const contents = await fetch('contents.json')
        .then(response => response.json())
        .catch(() => []);

    const contentList = document.getElementById('content-list');
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
        const link = document.createElement('a');
        link.href = `${window.location.pathname}/${item}`;
        link.textContent = item;
        listItem.appendChild(link);
        contentList.appendChild(listItem);
    });
});