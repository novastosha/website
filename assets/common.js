document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const navLinks = document.querySelectorAll('.mobile-nav a');
    const body = document.body;

    const toggleMenu = () => {
        body.classList.toggle('menu-open');
    };

    menuToggle.addEventListener('click', toggleMenu);

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (body.classList.contains('menu-open')) {
                toggleMenu();
            }
        });
    });


    function duplicateScrollContent(containerSelector) {
        const scrollContainer = document.querySelector(containerSelector);
        if (scrollContainer) {
            const scrollWrapper = scrollContainer.querySelector('.scroll-wrapper');
            const content = scrollWrapper.innerHTML;
            scrollWrapper.innerHTML += content;
        }
    }
});