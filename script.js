
const DEFAULTS = {
    colorA: '#3867D6',
    colorB: '#EB3B5A',
    steps: 5,
    interpolation: 'rgb'
};

const elements = {
    colorA: document.querySelector('#color-a'),
    colorB: document.querySelector('#color-b'),
    pickerA: document.querySelector('#picker-a'),
    pickerB: document.querySelector('#picker-b'),
    steps: document.querySelector('#steps'),
    stepsNumber: document.querySelector('#steps-number'),
    interpolation: document.querySelector('#interpolation'),
    palette: document.querySelector('#palette'),
    paletteCount: document.querySelector('#palette-count'),
    gradientStrip: document.querySelector('#gradient-strip'),
    stepsStrip: document.querySelector('#steps-strip'),
    error: document.querySelector('#input-error'),
    toast: document.querySelector('#toast')
};

const pickerPairs = [
    { text: elements.colorA, native: elements.pickerA, button: document.querySelector('#custom-picker-a'), popover: document.querySelector('#popover-a') },
    { text: elements.colorB, native: elements.pickerB, button: document.querySelector('#custom-picker-b'), popover: document.querySelector('#popover-b') }
];

let toastTimeout;

function parseHex(value) {
    const normalized = value.trim().replace(/^#/, '');
    const expanded = normalized.length === 3
        ? [...normalized].map(character => character + character).join('')
        : normalized;

    if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;

    return {
        r: Number.parseInt(expanded.slice(0, 2), 16),
        g: Number.parseInt(expanded.slice(2, 4), 16),
        b: Number.parseInt(expanded.slice(4, 6), 16)
    };
}

function toHex({ r, g, b }) {
    return `#${[r, g, b]
        .map(value => Math.round(value).toString(16).padStart(2, '0'))
        .join('')}`.toUpperCase();
}

function rgbToHsl({ r, g, b }) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));

        switch (max) {
            case r: h = ((g - b) / delta) % 6; break;
            case g: h = (b - r) / delta + 2; break;
            default: h = (r - g) / delta + 4;
        }

        h *= 60;
        if (h < 0) h += 360;
    }

    return { h, s, l };
}

function hslToRgb({ h, s, l }) {
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - chroma / 2;
    let rgb;

    if (h < 60) rgb = [chroma, x, 0];
    else if (h < 120) rgb = [x, chroma, 0];
    else if (h < 180) rgb = [0, chroma, x];
    else if (h < 240) rgb = [0, x, chroma];
    else if (h < 300) rgb = [x, 0, chroma];
    else rgb = [chroma, 0, x];

    return {
        r: (rgb[0] + m) * 255,
        g: (rgb[1] + m) * 255,
        b: (rgb[2] + m) * 255
    };
}

function interpolateRgb(a, b, t) {
    return {
        r: a.r + (b.r - a.r) * t,
        g: a.g + (b.g - a.g) * t,
        b: a.b + (b.b - a.b) * t
    };
}

function interpolateHsl(a, b, t) {
    const start = rgbToHsl(a);
    const end = rgbToHsl(b);

    let hueDifference = end.h - start.h;
    if (hueDifference > 180) hueDifference -= 360;
    if (hueDifference < -180) hueDifference += 360;

    return hslToRgb({
        h: (start.h + hueDifference * t + 360) % 360,
        s: start.s + (end.s - start.s) * t,
        l: start.l + (end.l - start.l) * t
    });
}

function getPalette(start, end, steps, mode) {
    const colors = [];

    for (let index = 0; index <= steps + 1; index++) {
        const t = index / (steps + 1);
        const color = mode === 'hsl'
            ? interpolateHsl(start, end, t)
            : interpolateRgb(start, end, t);

        colors.push(toHex(color));
    }

    return colors;
}

function getGradientStops(start, end, mode) {
    const sampleCount = 100;
    return Array.from({ length: sampleCount + 1 }, (_, index) => {
        const position = index / sampleCount;
        const color = index === 0
            ? toHex(start)
            : index === sampleCount
                ? toHex(end)
                : toHex(mode === 'hsl'
                    ? interpolateHsl(start, end, position)
                    : interpolateRgb(start, end, position));
        return `${color} ${position * 100}%`;
    }).join(', ');
}

function updateColorPicker(textInput, picker) {
    const color = parseHex(textInput.value);
    if (color) picker.value = toHex(color);
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => elements.toast.classList.remove('visible'), 1600);
}

async function copyText(value) {
    try {
        await navigator.clipboard.writeText(value);
        showToast(`Copied ${value}`);
    } catch {
        showToast('Clipboard access is unavailable in this browser.');
    }
}

function updateHash() {
    const params = new URLSearchParams({
        a: elements.colorA.value.trim().replace(/^#/, ''),
        b: elements.colorB.value.trim().replace(/^#/, ''),
        steps: elements.stepsNumber.value,
        mode: elements.interpolation.value
    });

    history.replaceState(null, '', `#${params.toString()}`);
}

function renderPalette() {
    const start = parseHex(elements.colorA.value);
    const end = parseHex(elements.colorB.value);

    if (!start || !end) {
        elements.error.textContent = 'Enter valid 3- or 6-digit HEX colors.';
        elements.palette.replaceChildren();
        elements.paletteCount.textContent = '—';
        elements.gradientStrip.style.background = '';
        elements.stepsStrip.replaceChildren();
        return;
    }

    elements.error.textContent = '';
    pickerPairs.forEach(({ text, native, button }) => {
        const color = toHex(parseHex(text.value));
        native.value = color;
        button.style.setProperty('--swatch-color', color);
    });

    const colors = getPalette(start, end, Number(elements.stepsNumber.value), elements.interpolation.value);
    elements.paletteCount.textContent = `${colors.length} colors`;
    const mode = elements.interpolation.value;
    elements.gradientStrip.style.background = `linear-gradient(90deg, ${getGradientStops(start, end, mode)})`;
    const stripFragment = document.createDocumentFragment();
    colors.forEach(color => {
        const segment = document.createElement('span');
        segment.style.backgroundColor = color;
        segment.title = color;
        stripFragment.append(segment);
    });
    elements.stepsStrip.replaceChildren(stripFragment);

    const fragment = document.createDocumentFragment();

    colors.forEach(color => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'swatch';
        button.setAttribute('aria-label', `Copy color ${color}`);

        const preview = document.createElement('span');
        preview.className = 'swatch-color';
        preview.style.backgroundColor = color;

        const label = document.createElement('span');
        label.className = 'swatch-label';
        label.textContent = color;

        button.append(preview, label);
        button.addEventListener('click', () => copyText(color));
        fragment.append(button);
    });

    elements.palette.replaceChildren(fragment);
    updateHash();
}

function loadHash() {
    if (!location.hash) return;

    const params = new URLSearchParams(location.hash.slice(1));
    const colorA = params.get('a');
    const colorB = params.get('b');
    const steps = Number(params.get('steps'));
    const mode = params.get('mode');

    if (colorA && parseHex(colorA)) elements.colorA.value = `#${colorA}`;
    if (colorB && parseHex(colorB)) elements.colorB.value = `#${colorB}`;
    if (Number.isInteger(steps) && steps >= 1) {
        elements.stepsNumber.value = steps;
        elements.steps.value = Math.min(steps, Number(elements.steps.max));
    }
    if (mode === 'rgb' || mode === 'hsl') elements.interpolation.value = mode;
}

function reset() {
    elements.colorA.value = DEFAULTS.colorA;
    elements.colorB.value = DEFAULTS.colorB;
    elements.steps.value = DEFAULTS.steps;
    elements.stepsNumber.value = DEFAULTS.steps;
    elements.interpolation.value = DEFAULTS.interpolation;
    renderPalette();
}

elements.colorA.addEventListener('input', renderPalette);
elements.colorB.addEventListener('input', renderPalette);

elements.colorA.addEventListener('change', () => updateColorPicker(elements.colorA, elements.pickerA));
elements.colorB.addEventListener('change', () => updateColorPicker(elements.colorB, elements.pickerB));

function updateFromCustomPicker(pair, hue, saturation, lightness) {
    pair.text.value = toHex(hslToRgb({ h: hue, s: saturation, l: lightness }));
    pair.popover.querySelector('.color-plane').style.setProperty('--hue', hue);
    pair.popover.querySelector('.color-plane').style.setProperty('--sat', `${saturation * 100}%`);
    pair.popover.querySelector('.color-plane').style.setProperty('--light', `${(1 - lightness) * 100}%`);
    pair.popover.querySelector('.color-plane').setAttribute('aria-valuetext', `${Math.round(saturation * 100)}% saturation, ${Math.round(lightness * 100)}% lightness`);
    renderPalette();
}

pickerPairs.forEach(pair => {
    const { text, native, button, popover } = pair;
    const plane = popover.querySelector('.color-plane');
    const hueSlider = popover.querySelector('.hue-slider');
    let hue = Number(hueSlider.value);
    let saturation = 1;
    let lightness = 0.5;

    button.addEventListener('click', () => {
        document.querySelectorAll('.color-popover').forEach(item => { if (item !== popover) item.hidden = true; });
        const opening = popover.hidden;
        popover.hidden = !opening;
        if (!opening) return;
        const rgb = parseHex(text.value);
        if (rgb) {
            const hsl = rgbToHsl(rgb);
            hue = hsl.h;
            saturation = hsl.s;
            lightness = hsl.l;
            hueSlider.value = hue;
            plane.style.setProperty('--hue', hue);
            plane.style.setProperty('--sat', `${saturation * 100}%`);
            plane.style.setProperty('--light', `${(1 - lightness) * 100}%`);
        }
    });

    hueSlider.addEventListener('input', () => {
        hue = Number(hueSlider.value);
        plane.style.setProperty('--hue', hue);
        updateFromCustomPicker(pair, hue, saturation, lightness);
    });

    const pickOnPlane = event => {
        const rect = plane.getBoundingClientRect();
        saturation = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        lightness = 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        updateFromCustomPicker(pair, hue, saturation, lightness);
    };
    plane.addEventListener('pointerdown', event => { plane.setPointerCapture(event.pointerId); pickOnPlane(event); });
    plane.addEventListener('pointermove', event => { if (plane.hasPointerCapture(event.pointerId)) pickOnPlane(event); });
    plane.addEventListener('keydown', event => {
        const delta = event.shiftKey ? 0.05 : 0.01;
        if (event.key === 'ArrowRight') saturation = Math.min(1, saturation + delta);
        else if (event.key === 'ArrowLeft') saturation = Math.max(0, saturation - delta);
        else if (event.key === 'ArrowUp') lightness = Math.min(1, lightness + delta);
        else if (event.key === 'ArrowDown') lightness = Math.max(0, lightness - delta);
        else return;
        event.preventDefault();
        updateFromCustomPicker(pair, hue, saturation, lightness);
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
    if (event.key === 'Escape') document.querySelectorAll('.color-popover').forEach(popover => { popover.hidden = true; });
});

elements.steps.addEventListener('input', () => {
    elements.stepsNumber.value = elements.steps.value;
    renderPalette();
});
elements.stepsNumber.addEventListener('input', () => {
    const value = Number(elements.stepsNumber.value);
    if (Number.isInteger(value) && value >= 1) {
        elements.steps.value = Math.min(value, Number(elements.steps.max));
        renderPalette();
    }
});
elements.stepsNumber.addEventListener('change', () => {
    if (!elements.stepsNumber.value || Number(elements.stepsNumber.value) < 1) {
        elements.stepsNumber.value = elements.steps.value;
    }
});
elements.interpolation.addEventListener('change', renderPalette);

document.querySelector('#swap-colors').addEventListener('click', () => {
    [elements.colorA.value, elements.colorB.value] =
        [elements.colorB.value, elements.colorA.value];

    renderPalette();
});

document.querySelector('#reset').addEventListener('click', reset);

document.querySelector('#copy-all').addEventListener('click', () => {
    const colors = [...elements.palette.querySelectorAll('.swatch-label')]
        .map(label => label.textContent);

    if (colors.length) copyText(colors.join('\n'));
});

loadHash();
renderPalette();
