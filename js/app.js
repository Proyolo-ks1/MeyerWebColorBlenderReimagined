import { createAppearanceController } from './appearance.js';
import { drawInterpolationChart } from './charts.js';
import {
    getGradientStops,
    getPalette,
    INTERPOLATION_STYLES,
    parseHex,
    toHex
} from './color.js';
import { initializeColorPickers, syncColorPicker } from './color-picker.js';
import { initializeCopyMenu } from './copy-menu.js';
import { DEFAULTS, elements, pickerPairs } from './dom.js';

const appearance = createAppearanceController(elements);
let toastTimeout;

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => elements.toast.classList.remove('visible'), 1600);
}

async function copyText(value, confirmationMessage = `Copied ${value}`) {
    try {
        await navigator.clipboard.writeText(value);
        showToast(confirmationMessage);
    } catch {
        showToast('Clipboard access is unavailable in this browser.');
    }
}

function updateHash() {
    const params = new URLSearchParams({
        a: elements.colorA.value.trim().replace(/^#/, ''),
        b: elements.colorB.value.trim().replace(/^#/, ''),
        steps: elements.stepsNumber.value,
        from: elements.interpolationFrom.value,
        to: elements.interpolationTo.value,
        mix: elements.interpolationMix.value
    });
    history.replaceState(null, '', `#${params.toString()}`);
}

function renderPalette() {
    const start = parseHex(elements.colorA.value);
    const end = parseHex(elements.colorB.value);
    const from = elements.interpolationFrom.value;
    const to = elements.interpolationTo.value;
    const mix = Number(elements.interpolationMix.value);

    elements.interpolationMixValue.value = `${mix}%`;
    elements.interpolationMixValue.textContent = `${mix}%`;
    elements.interpolationMix.setAttribute(
        'aria-valuetext',
        `${100 - mix}% ${INTERPOLATION_STYLES[from].label} and ${mix}% ${INTERPOLATION_STYLES[to].label}`
    );

    if (!start || !end) {
        elements.error.textContent = 'Enter valid 3- or 6-digit HEX colors.';
        elements.palette.replaceChildren();
        elements.paletteCount.textContent = '—';
        elements.gradientStrip.style.background = '';
        elements.stepsStrip.replaceChildren();
        return;
    }

    elements.error.textContent = '';
    pickerPairs.forEach(syncColorPicker);

    const steps = Number(elements.stepsNumber.value);
    const colors = getPalette(start, end, steps, from, to, mix);
    appearance.updatePageGradient([toHex(start), toHex(end)]);
    elements.paletteCount.textContent = `${colors.length} colors`;
    elements.gradientStrip.style.background = `linear-gradient(90deg, ${getGradientStops(start, end, from, to, mix)})`;

    drawInterpolationChart(
        elements.fromChart,
        elements.fromChartTitle,
        elements.fromChartScale,
        from,
        start,
        end,
        steps,
        from,
        to,
        mix,
        'from'
    );
    drawInterpolationChart(
        elements.toChart,
        elements.toChartTitle,
        elements.toChartScale,
        to,
        start,
        end,
        steps,
        from,
        to,
        mix,
        'to'
    );

    const stripFragment = document.createDocumentFragment();
    colors.forEach(color => {
        const segment = document.createElement('span');
        segment.style.backgroundColor = color;
        segment.title = color;
        stripFragment.append(segment);
    });
    elements.stepsStrip.replaceChildren(stripFragment);

    const paletteFragment = document.createDocumentFragment();
    colors.forEach(color => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'swatch';
        button.setAttribute('aria-label', `Copy color ${color}`);
        if (color === '#663399') {
            button.classList.add('rebecca-swatch');
            button.title = 'Rebecca Purple';
        }

        const preview = document.createElement('span');
        preview.className = 'swatch-color';
        preview.style.backgroundColor = color;

        const label = document.createElement('span');
        label.className = 'swatch-label';
        label.textContent = color;

        button.append(preview, label);
        button.addEventListener('click', () => copyText(color));
        paletteFragment.append(button);
    });

    elements.palette.replaceChildren(paletteFragment);
    updateHash();
}

function loadHash() {
    if (!location.hash) return;

    const params = new URLSearchParams(location.hash.slice(1));
    const colorA = params.get('a');
    const colorB = params.get('b');
    const steps = Number(params.get('steps'));
    const from = params.get('from');
    const to = params.get('to');
    const mix = Number(params.get('mix'));
    const legacyMode = params.get('mode');

    if (colorA && parseHex(colorA)) elements.colorA.value = `#${colorA}`;
    if (colorB && parseHex(colorB)) elements.colorB.value = `#${colorB}`;
    if (Number.isInteger(steps) && steps >= 1) {
        elements.stepsNumber.value = steps;
        elements.steps.value = Math.min(steps, Number(elements.steps.max));
    }
    if (INTERPOLATION_STYLES[from] && INTERPOLATION_STYLES[to]) {
        elements.interpolationFrom.value = from;
        elements.interpolationTo.value = to;
        if (Number.isInteger(mix) && mix >= 0 && mix <= 100) elements.interpolationMix.value = mix;
    } else if (legacyMode === 'rgb' || legacyMode === 'hsl') {
        elements.interpolationFrom.value = 'rgb';
        elements.interpolationTo.value = 'hsl';
        elements.interpolationMix.value = legacyMode === 'hsl' ? 100 : 0;
    }
}

function reset() {
    elements.colorA.value = DEFAULTS.colorA;
    elements.colorB.value = DEFAULTS.colorB;
    elements.steps.value = DEFAULTS.steps;
    elements.stepsNumber.value = DEFAULTS.steps;
    elements.interpolationFrom.value = DEFAULTS.interpolationFrom;
    elements.interpolationTo.value = DEFAULTS.interpolationTo;
    elements.interpolationMix.value = DEFAULTS.interpolationMix;
    renderPalette();
}

elements.colorA.addEventListener('input', renderPalette);
elements.colorB.addEventListener('input', renderPalette);
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
elements.interpolationFrom.addEventListener('change', renderPalette);
elements.interpolationTo.addEventListener('change', renderPalette);
elements.interpolationMix.addEventListener('input', renderPalette);
elements.themeToggle.addEventListener('click', appearance.toggleTheme);
elements.gradientToggle.addEventListener('click', appearance.toggleGradient);
elements.swapColors.addEventListener('click', () => {
    [elements.colorA.value, elements.colorB.value] = [elements.colorB.value, elements.colorA.value];
    renderPalette();
});
elements.reset.addEventListener('click', reset);

initializeColorPickers(pickerPairs, renderPalette);
initializeCopyMenu(elements, copyText);

appearance.restore();
loadHash();
renderPalette();
