import { hsvToRgb, parseHex, rgbToHsv, toHex } from './color.js';

export function syncColorPicker(pair) {
    const color = parseHex(pair.text.value);
    if (!color) return;

    const hex = toHex(color);
    pair.native.value = hex;
    pair.button.style.setProperty('--swatch-color', hex);
}

export function initializeColorPickers(pickerPairs, renderPalette) {
    pickerPairs.forEach(pair => {
        const { text, native, button, popover } = pair;
        const plane = popover.querySelector('.color-plane');
        const hueSlider = popover.querySelector('.hue-slider');
        let hue = Number(hueSlider.value);
        let saturation = 1;
        let value = 0.5;

        function updateFromPicker() {
            pair.text.value = toHex(hsvToRgb({ h: hue, s: saturation, v: value }));
            plane.style.setProperty('--hue', hue);
            plane.style.setProperty('--sat', `${saturation * 100}%`);
            plane.style.setProperty('--value', `${(1 - value) * 100}%`);
            plane.setAttribute('aria-valuetext', `${Math.round(saturation * 100)}% saturation, ${Math.round(value * 100)}% brightness`);
            renderPalette();
        }

        button.addEventListener('click', () => {
            document.querySelectorAll('.color-popover').forEach(item => {
                if (item !== popover) item.hidden = true;
            });

            const opening = popover.hidden;
            popover.hidden = !opening;
            if (!opening) return;

            const rgb = parseHex(text.value);
            if (!rgb) return;

            const hsv = rgbToHsv(rgb);
            hue = hsv.h;
            saturation = hsv.s;
            value = hsv.v;
            hueSlider.value = hue;
            plane.style.setProperty('--hue', hue);
            plane.style.setProperty('--sat', `${saturation * 100}%`);
            plane.style.setProperty('--value', `${(1 - value) * 100}%`);
        });

        hueSlider.addEventListener('input', () => {
            hue = Number(hueSlider.value);
            plane.style.setProperty('--hue', hue);
            updateFromPicker();
        });

        const pickOnPlane = event => {
            const rect = plane.getBoundingClientRect();
            saturation = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
            value = 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
            updateFromPicker();
        };

        plane.addEventListener('pointerdown', event => {
            plane.setPointerCapture(event.pointerId);
            pickOnPlane(event);
        });
        plane.addEventListener('pointermove', event => {
            if (plane.hasPointerCapture(event.pointerId)) pickOnPlane(event);
        });
        plane.addEventListener('keydown', event => {
            const delta = event.shiftKey ? 0.05 : 0.01;
            if (event.key === 'ArrowRight') saturation = Math.min(1, saturation + delta);
            else if (event.key === 'ArrowLeft') saturation = Math.max(0, saturation - delta);
            else if (event.key === 'ArrowUp') value = Math.min(1, value + delta);
            else if (event.key === 'ArrowDown') value = Math.max(0, value - delta);
            else return;

            event.preventDefault();
            updateFromPicker();
        });

        popover.querySelector('.rebecca-color-button').addEventListener('click', () => {
            const rebeccaPurple = rgbToHsv(parseHex('#663399'));
            hue = rebeccaPurple.h;
            saturation = rebeccaPurple.s;
            value = rebeccaPurple.v;
            hueSlider.value = hue;
            updateFromPicker();
        });

        popover.querySelector('.native-picker-button').addEventListener('click', () => native.click());
        native.addEventListener('input', () => {
            text.value = native.value.toUpperCase();
            renderPalette();
        });
    });

    document.addEventListener('pointerdown', event => {
        if (!event.target.closest('.picker-wrap')) {
            document.querySelectorAll('.color-popover').forEach(popover => { popover.hidden = true; });
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            document.querySelectorAll('.color-popover').forEach(popover => { popover.hidden = true; });
        }
    });
}
