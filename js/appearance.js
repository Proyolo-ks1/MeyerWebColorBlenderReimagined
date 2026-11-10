import { parseHex } from './color.js';

const STORAGE_KEY = 'meyerweb-color-blender:appearance';

export function createAppearanceController(elements) {
    let gradientEnabled = true;
    let gradientColors = [];

    function setTheme(isDark) {
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        elements.themeToggle.setAttribute('aria-pressed', String(isDark));
        elements.themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
        elements.themeToggleIcon.textContent = isDark ? '☀' : '☾';
        elements.themeToggleLabel.textContent = isDark ? 'Light mode' : 'Dark mode';
        elements.themeColor.content = isDark ? '#151821' : '#f5f5f2';
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
                gradientBackground: gradientEnabled
            }));
        } catch {
            // Appearance controls remain usable when browser storage is unavailable.
        }
    }

    function updatePageGradient(colors) {
        gradientColors = colors;
        const usesRebeccaPurple = [elements.colorA.value, elements.colorB.value].some(value => {
            const color = parseHex(value);
            return color && color.r === 102 && color.g === 51 && color.b === 153;
        });
        document.documentElement.dataset.rebecca = String(usesRebeccaPurple);

        if (!gradientEnabled || !colors.length) {
            document.body.style.backgroundImage = 'none';
            return;
        }

        const stops = colors.map((hex, index) => {
            const color = parseHex(hex);
            const position = index * 100 / Math.max(1, colors.length - 1);
            const isRebecca = color?.r === 102 && color.g === 51 && color.b === 153;
            const opacity = usesRebeccaPurple && isRebecca ? 0.5 : 0.17;
            return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity}) ${position}%`;
        });
        document.body.style.backgroundImage = `linear-gradient(135deg, ${stops.join(', ')})`;
    }

    function restore() {
        let saved;
        try {
            saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        } catch {
            saved = null;
        }

        setTheme(saved?.theme === 'dark');
        if (typeof saved?.gradientBackground === 'boolean') {
            gradientEnabled = saved.gradientBackground;
        }
        updateGradientButton();
    }

    function updateGradientButton() {
        elements.gradientToggle.setAttribute('aria-pressed', String(gradientEnabled));
        elements.gradientToggle.setAttribute('aria-label', `${gradientEnabled ? 'Disable' : 'Enable'} gradient background`);
        elements.gradientToggleLabel.textContent = `Gradient: ${gradientEnabled ? 'On' : 'Off'}`;
    }

    function toggleTheme() {
        setTheme(document.documentElement.dataset.theme !== 'dark');
        save();
    }

    function toggleGradient() {
        gradientEnabled = !gradientEnabled;
        updateGradientButton();
        updatePageGradient(gradientColors);
        save();
    }

    return { restore, updatePageGradient, toggleTheme, toggleGradient };
}
