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
    initThemeEngine();
});

function initThemeEngine() {
    const SECRET_CODE = 'colormeplease!!';
    let inputSequence = [];
    let modalCreated = false;

    // 1. Listen for the secret code
    document.addEventListener('keydown', (e) => {
        inputSequence.push(e.key.toLowerCase());
        if (inputSequence.length > SECRET_CODE.length) {
            inputSequence.shift();
        }
        if (inputSequence.join('') === SECRET_CODE) {
            if (!modalCreated) {
                createThemeModal();
                modalCreated = true;
            }
            const modal = document.getElementById('theme-debug-modal');
            modal.style.display = 'flex';
            syncInputsWithCurrentTheme();
        }
    });

    // 2. Helper: Convert HSL to Hex for the color inputs
    function hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    // 3. Helper: Sync Inputs
    function syncInputsWithCurrentTheme() {
        const root = document.documentElement;
        const style = getComputedStyle(root);
        const vars = ['--bg-abyss', '--bg-lighter', '--text-flicker', '--accent-green', '--accent-magenta'];

        vars.forEach(v => {
            const hex = style.getPropertyValue(v).trim();
            const input = document.getElementById(`in-${v}`);
            if (input && hex.startsWith('#')) {
                input.value = hex;
            }
        });
    }

    // 4. Create the Modal UI
    function createThemeModal() {
        const modal = document.createElement('div');
        modal.id = 'theme-debug-modal';

        // Inject styles directly to avoid CSS file dependency
        modal.style.cssText = `
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); z-index: 9999;
            justify-content: center; align-items: center; font-family: 'IBM Plex Mono', monospace;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            background: #101025; border: 2px solid #00FFC0; padding: 2rem;
            width: 90%; max-width: 500px; color: #F0F0F0; box-shadow: 0 0 20px rgba(0, 255, 192, 0.2);
            position: relative;
        `;

        const title = document.createElement('h2');
        title.innerText = '// SYSTEM THEME OVERRIDE';
        title.style.cssText = "font-family: 'DotGothic16', sans-serif; color: #FF66AA; margin-bottom: 20px; border-bottom: 1px dashed #FF66AA; padding-bottom: 10px;";

        const closeBtn = document.createElement('button');
        closeBtn.innerText = '[X]';
        closeBtn.style.cssText = "position: absolute; top: 15px; right: 15px; background: none; border: none; color: #00FFC0; cursor: pointer; font-family: inherit; font-size: 1.2rem;";
        closeBtn.onclick = () => { modal.style.display = 'none'; };

        // --- CONTROLS ---

        // A. Guided Mode
        const guidedContainer = document.createElement('div');
        guidedContainer.innerHTML = `<label style="display:block; margin-bottom: 5px; color:#00FFC0;">> GUIDED MODE (HUE SHIFT)</label>`;
        const hueSlider = document.createElement('input');
        hueSlider.type = 'range';
        hueSlider.min = 0; hueSlider.max = 360; hueSlider.value = 0;
        hueSlider.style.width = '100%';
        hueSlider.style.marginBottom = '20px';

        hueSlider.oninput = (e) => {
            const hue = parseInt(e.target.value);

            // Logic: Keep Saturation/Lightness roughly static, shift Hues relatively
            // Base hue is the background
            const bgHue = hue;
            const accent1Hue = (hue + 120) % 360; // Triadic
            const accent2Hue = (hue + 240) % 360; // Triadic

            const newColors = {
                '--bg-abyss': hslToHex(bgHue, 50, 5),     // Very dark
                '--bg-lighter': hslToHex(bgHue, 30, 10),  // Slightly lighter
                '--text-flicker': hslToHex(bgHue, 10, 95), // White-ish
                '--accent-green': hslToHex(accent1Hue, 100, 50), // Neon
                '--accent-magenta': hslToHex(accent2Hue, 100, 60) // Neon
            };

            applyColors(newColors);
        };

        guidedContainer.appendChild(hueSlider);

        // B. Randomizer
        const randomBtn = document.createElement('button');
        randomBtn.innerText = '>> GENERATE RANDOM SIGNATURE <<';
        randomBtn.style.cssText = `
            width: 100%; padding: 10px; background: #00FFC0; color: #050510; 
            border: none; cursor: pointer; font-family: 'DotGothic16'; font-size: 1.1rem;
            margin-bottom: 25px; transition: 0.2s;
        `;
        randomBtn.onmouseover = () => { randomBtn.style.background = '#FF66AA'; };
        randomBtn.onmouseout = () => { randomBtn.style.background = '#00FFC0'; };

        randomBtn.onclick = () => {
            const h = Math.floor(Math.random() * 360);
            // Randomize saturation slightly but keep it "Cyberpunk" (high sat)
            const s = 70 + Math.floor(Math.random() * 30);

            // Randomly flip the accent offset (Analagous vs Triadic)
            const offset = Math.random() > 0.5 ? 30 : 120;

            const newColors = {
                '--bg-abyss': hslToHex(h, 40, 5),
                '--bg-lighter': hslToHex(h, 30, 12),
                '--text-flicker': '#F0F0F0', // Keep text mostly standard for readability
                '--accent-green': hslToHex((h + offset) % 360, 100, 50),
                '--accent-magenta': hslToHex((h - offset + 360) % 360, 100, 60)
            };
            applyColors(newColors);
        };

        // C. Manual Pickers
        const manualContainer = document.createElement('div');
        manualContainer.style.display = 'grid';
        manualContainer.style.gridTemplateColumns = '1fr 1fr';
        manualContainer.style.gap = '10px';

        const vars = [
            { id: '--bg-abyss', label: 'Background' },
            { id: '--bg-lighter', label: 'Cards/Nav' },
            { id: '--accent-green', label: 'Accent 1' },
            { id: '--accent-magenta', label: 'Accent 2' },
            { id: '--text-flicker', label: 'Text' },
        ];

        vars.forEach(v => {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'space-between';

            const lbl = document.createElement('span');
            lbl.innerText = v.label;
            lbl.style.fontSize = '0.8rem';

            const inp = document.createElement('input');
            inp.type = 'color';
            inp.id = `in-${v.id}`;
            inp.style.border = '1px solid #333';
            inp.style.cursor = 'pointer';

            inp.addEventListener('input', (e) => {
                document.documentElement.style.setProperty(v.id, e.target.value);
            });

            wrapper.appendChild(lbl);
            wrapper.appendChild(inp);
            manualContainer.appendChild(wrapper);
        });

        // Assemble
        card.appendChild(closeBtn);
        card.appendChild(title);
        card.appendChild(guidedContainer);
        card.appendChild(randomBtn);
        card.appendChild(document.createElement('hr')); // Divider
        card.appendChild(manualContainer);
        modal.appendChild(card);
        document.body.appendChild(modal);
    }

    function applyColors(colorMap) {
        for (const [key, value] of Object.entries(colorMap)) {
            document.documentElement.style.setProperty(key, value);
            // Update the manual picker inputs to match
            const input = document.getElementById(`in-${key}`);
            if (input) input.value = value;
        }
    }
}