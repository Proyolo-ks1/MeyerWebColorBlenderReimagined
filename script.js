
const DEFAULTS = {
    colorA: '#3867D6',
    colorB: '#EB3B5A',
    steps: 5,
    interpolationFrom: 'rgb',
    interpolationTo: 'hsl',
    interpolationMix: 0
};

const elements = {
    colorA: document.querySelector('#color-a'),
    colorB: document.querySelector('#color-b'),
    pickerA: document.querySelector('#picker-a'),
    pickerB: document.querySelector('#picker-b'),
    steps: document.querySelector('#steps'),
    stepsNumber: document.querySelector('#steps-number'),
    interpolationFrom: document.querySelector('#interpolation-from'),
    interpolationTo: document.querySelector('#interpolation-to'),
    interpolationMix: document.querySelector('#interpolation-mix'),
    interpolationMixValue: document.querySelector('#interpolation-mix-value'),
    palette: document.querySelector('#palette'),
    paletteCount: document.querySelector('#palette-count'),
    gradientStrip: document.querySelector('#gradient-strip'),
    stepsStrip: document.querySelector('#steps-strip'),
    fromChart: document.querySelector('#from-chart'),
    toChart: document.querySelector('#to-chart'),
    fromChartTitle: document.querySelector('#from-chart-title'),
    toChartTitle: document.querySelector('#to-chart-title'),
    fromChartScale: document.querySelector('#from-chart-scale'),
    toChartScale: document.querySelector('#to-chart-scale'),
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
        .map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
        .join('')}`.toUpperCase();
}

function clampRgb({ r, g, b }) {
    return {
        r: Math.max(0, Math.min(255, r)),
        g: Math.max(0, Math.min(255, g)),
        b: Math.max(0, Math.min(255, b))
    };
}

function normalizeHue(h) {
    return ((h % 360) + 360) % 360;
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
    h = normalizeHue(h);
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

function rgbToHsv({ r, g, b }) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta !== 0) {
        if (max === r) h = 60 * (((g - b) / delta) % 6);
        else if (max === g) h = 60 * ((b - r) / delta + 2);
        else h = 60 * ((r - g) / delta + 4);
    }
    return { h: normalizeHue(h), s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb({ h, s, v }) {
    h = normalizeHue(h);
    const chroma = v * s;
    const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - chroma;
    let rgb;
    if (h < 60) rgb = [chroma, x, 0];
    else if (h < 120) rgb = [x, chroma, 0];
    else if (h < 180) rgb = [0, chroma, x];
    else if (h < 240) rgb = [0, x, chroma];
    else if (h < 300) rgb = [x, 0, chroma];
    else rgb = [chroma, 0, x];
    return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 };
}

function rgbToHwb(rgb) {
    const hsv = rgbToHsv(rgb);
    const values = [rgb.r, rgb.g, rgb.b].map(value => value / 255);
    return { h: hsv.h, w: Math.min(...values), b: 1 - Math.max(...values) };
}

function hwbToRgb({ h, w, b }) {
    if (w + b >= 1) {
        const gray = w + b === 0 ? 0 : w / (w + b);
        return { r: gray * 255, g: gray * 255, b: gray * 255 };
    }
    const pure = hslToRgb({ h, s: 1, l: 0.5 });
    const scale = 1 - w - b;
    return {
        r: (pure.r / 255 * scale + w) * 255,
        g: (pure.g / 255 * scale + w) * 255,
        b: (pure.b / 255 * scale + w) * 255
    };
}

function srgbToLinearChannel(value) {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToSrgbChannel(value) {
    return (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055) * 255;
}

function rgbToLinearRgb(rgb) {
    return { r: srgbToLinearChannel(rgb.r), g: srgbToLinearChannel(rgb.g), b: srgbToLinearChannel(rgb.b) };
}

function linearRgbToRgb(rgb) {
    return { r: linearToSrgbChannel(rgb.r), g: linearToSrgbChannel(rgb.g), b: linearToSrgbChannel(rgb.b) };
}

function labCurve(value) {
    const delta = 6 / 29;
    return value > delta ** 3 ? Math.cbrt(value) : value / (3 * delta ** 2) + 4 / 29;
}

function labInverseCurve(value) {
    const delta = 6 / 29;
    return value > delta ? value ** 3 : 3 * delta ** 2 * (value - 4 / 29);
}

function rgbToLab(rgb) {
    const { r, g, b } = rgbToLinearRgb(rgb);
    const x = (0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / 0.96422;
    const y = 0.2225045 * r + 0.7168786 * g + 0.0606169 * b;
    const z = (0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / 0.82521;
    const fx = labCurve(x);
    const fy = labCurve(y);
    const fz = labCurve(z);
    return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function labToRgb({ l, a, b }) {
    const fy = (l + 16) / 116;
    const x = 0.96422 * labInverseCurve(fy + a / 500);
    const y = labInverseCurve(fy);
    const z = 0.82521 * labInverseCurve(fy - b / 200);
    return linearRgbToRgb({
        r: 3.1338561 * x - 1.6168667 * y - 0.4906146 * z,
        g: -0.9787684 * x + 1.9161415 * y + 0.033454 * z,
        b: 0.0719453 * x - 0.2289914 * y + 1.4052427 * z
    });
}

function labToLch({ l, a, b }) {
    return { l, c: Math.hypot(a, b), h: normalizeHue(Math.atan2(b, a) * 180 / Math.PI) };
}

function lchToLab({ l, c, h }) {
    const radians = normalizeHue(h) * Math.PI / 180;
    return { l, a: c * Math.cos(radians), b: c * Math.sin(radians) };
}

function rgbToOklab(rgb) {
    const { r, g, b } = rgbToLinearRgb(rgb);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return {
        l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    };
}

function oklabToRgb({ l, a, b }) {
    const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
    const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
    const sRoot = l - 0.0894841775 * a - 1.291485548 * b;
    const l3 = lRoot ** 3;
    const m3 = mRoot ** 3;
    const s3 = sRoot ** 3;
    return linearRgbToRgb({
        r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
        g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
        b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3
    });
}

function oklabToOklch({ l, a, b }) {
    return { l, c: Math.hypot(a, b), h: normalizeHue(Math.atan2(b, a) * 180 / Math.PI) };
}

function oklchToOklab({ l, c, h }) {
    const radians = normalizeHue(h) * Math.PI / 180;
    return { l, a: c * Math.cos(radians), b: c * Math.sin(radians) };
}

function isInSrgbGamut(rgb) {
    return [rgb.r, rgb.g, rgb.b].every(channel => channel >= -0.0001 && channel <= 255.0001);
}

function mapChromaToGamut(l, c, h, toRgb) {
    const original = toRgb({ l, c, h });
    if (isInSrgbGamut(original)) return clampRgb(original);
    let low = 0;
    let high = c;
    let mapped = toRgb({ l, c: 0, h });
    for (let index = 0; index < 18; index++) {
        const mid = (low + high) / 2;
        const candidate = toRgb({ l, c: mid, h });
        if (isInSrgbGamut(candidate)) {
            low = mid;
            mapped = candidate;
        } else {
            high = mid;
        }
    }
    return clampRgb(mapped);
}

function interpolateHue(start, end, t) {
    let difference = normalizeHue(end) - normalizeHue(start);
    if (difference > 180) difference -= 360;
    if (difference < -180) difference += 360;
    return normalizeHue(start + difference * t);
}

function interpolateComponents(start, end, t, style) {
    const a = { ...style.fromRgb(start) };
    const b = { ...style.fromRgb(end) };
    if (style.hueKey) {
        const hueKey = style.hueKey;
        const aPowerless = style.hueIsPowerless(a);
        const bPowerless = style.hueIsPowerless(b);
        if (aPowerless && !bPowerless) a[hueKey] = b[hueKey];
        if (bPowerless && !aPowerless) b[hueKey] = a[hueKey];
        const result = {};
        Object.keys(a).forEach(key => {
            result[key] = key === hueKey
                ? interpolateHue(a[key], b[key], t)
                : a[key] + (b[key] - a[key]) * t;
        });
        return clampRgb(style.toRgb(result));
    }
    const result = {};
    Object.keys(a).forEach(key => { result[key] = a[key] + (b[key] - a[key]) * t; });
    return clampRgb(style.toRgb(result));
}

const INTERPOLATION_STYLES = {
    rgb: {
        label: 'RGB', fromRgb: rgb => ({ ...rgb }), toRgb: rgb => rgb,
        channels: [
            { key: 'r', label: 'R', min: 0, max: 255, color: '#d94b55' },
            { key: 'g', label: 'G', min: 0, max: 255, color: '#25845d' },
            { key: 'b', label: 'B', min: 0, max: 255, color: '#4566d5' }
        ], scaleLabel: 'R/G/B: 0–255'
    },
    'linear-rgb': {
        label: 'Linear RGB', fromRgb: rgbToLinearRgb, toRgb: linearRgbToRgb,
        channels: [
            { key: 'r', label: 'R', min: 0, max: 1, color: '#d94b55' },
            { key: 'g', label: 'G', min: 0, max: 1, color: '#25845d' },
            { key: 'b', label: 'B', min: 0, max: 1, color: '#4566d5' }
        ], scaleLabel: 'Linear R/G/B: 0–1'
    },
    hsl: {
        label: 'HSL', fromRgb: rgbToHsl, toRgb: hslToRgb, hueKey: 'h',
        hueIsPowerless: ({ s, l }) => s === 0 || l === 0 || l === 1,
        channels: [
            { key: 'h', label: 'H', min: 0, max: 360, color: '#8053c8', circular: true },
            { key: 's', label: 'S', min: 0, max: 1, color: '#d88127' },
            { key: 'l', label: 'L', min: 0, max: 1, color: '#178b91' }
        ], scaleLabel: 'H: 0–360° · S/L: 0–100%'
    },
    hsv: {
        label: 'HSV', fromRgb: rgbToHsv, toRgb: hsvToRgb, hueKey: 'h',
        hueIsPowerless: ({ s, v }) => s === 0 || v === 0,
        channels: [
            { key: 'h', label: 'H', min: 0, max: 360, color: '#8053c8', circular: true },
            { key: 's', label: 'S', min: 0, max: 1, color: '#d88127' },
            { key: 'v', label: 'V', min: 0, max: 1, color: '#178b91' }
        ], scaleLabel: 'H: 0–360° · S/V: 0–100%'
    },
    hwb: {
        label: 'HWB', fromRgb: rgbToHwb, toRgb: hwbToRgb, hueKey: 'h',
        hueIsPowerless: ({ w, b }) => w + b >= 1,
        channels: [
            { key: 'h', label: 'H', min: 0, max: 360, color: '#8053c8', circular: true },
            { key: 'w', label: 'W', min: 0, max: 1, color: '#d88127' },
            { key: 'b', label: 'B', min: 0, max: 1, color: '#178b91' }
        ], scaleLabel: 'H: 0–360° · W/B: 0–100%'
    },
    lab: {
        label: 'Lab', fromRgb: rgbToLab, toRgb: labToRgb,
        channels: [
            { key: 'l', label: 'L', min: 0, max: 100, color: '#178b91' },
            { key: 'a', label: 'a', min: -125, max: 125, color: '#d94b55' },
            { key: 'b', label: 'b', min: -125, max: 125, color: '#4566d5' }
        ], scaleLabel: 'L: 0–100 · a/b: −125 to 125'
    },
    lch: {
        label: 'LCH', fromRgb: rgb => labToLch(rgbToLab(rgb)),
        toRgb: lch => mapChromaToGamut(lch.l, lch.c, lch.h, value => labToRgb(lchToLab(value))),
        hueKey: 'h', hueIsPowerless: ({ c }) => c <= 0.0015,
        channels: [
            { key: 'l', label: 'L', min: 0, max: 100, color: '#178b91' },
            { key: 'c', label: 'C', min: 0, max: 150, color: '#d88127' },
            { key: 'h', label: 'H', min: 0, max: 360, color: '#8053c8', circular: true }
        ], scaleLabel: 'L: 0–100 · C: 0–150 · H: 0–360°'
    },
    oklab: {
        label: 'OKLab', fromRgb: rgbToOklab, toRgb: oklabToRgb,
        channels: [
            { key: 'l', label: 'L', min: 0, max: 1, color: '#178b91' },
            { key: 'a', label: 'a', min: -0.4, max: 0.4, color: '#d94b55' },
            { key: 'b', label: 'b', min: -0.4, max: 0.4, color: '#4566d5' }
        ], scaleLabel: 'L: 0–1 · a/b: −0.4 to 0.4'
    },
    oklch: {
        label: 'OKLCH', fromRgb: rgb => oklabToOklch(rgbToOklab(rgb)),
        toRgb: lch => mapChromaToGamut(lch.l, lch.c, lch.h, value => oklabToRgb(oklchToOklab(value))),
        hueKey: 'h', hueIsPowerless: ({ c }) => c <= 0.000004,
        channels: [
            { key: 'l', label: 'L', min: 0, max: 1, color: '#178b91' },
            { key: 'c', label: 'C', min: 0, max: 0.4, color: '#d88127' },
            { key: 'h', label: 'H', min: 0, max: 360, color: '#8053c8', circular: true }
        ], scaleLabel: 'L: 0–1 · C: 0–0.4 · H: 0–360°'
    }
};

Object.values(INTERPOLATION_STYLES).forEach(style => {
    style.interpolate = (start, end, t) => interpolateComponents(start, end, t, style);
});

function interpolateStyles(start, end, t, from, to, mix) {
    const firstColor = INTERPOLATION_STYLES[from].interpolate(start, end, t);
    const secondColor = INTERPOLATION_STYLES[to].interpolate(start, end, t);
    const amount = mix / 100;
    return interpolateRgb(firstColor, secondColor, amount);
}

function getPalette(start, end, steps, from, to, mix) {
    const colors = [];

    for (let index = 0; index <= steps + 1; index++) {
        const t = index / (steps + 1);
        colors.push(toHex(interpolateStyles(start, end, t, from, to, mix)));
    }

    return colors;
}

function getGradientStops(start, end, from, to, mix) {
    const sampleCount = 100;
    return Array.from({ length: sampleCount + 1 }, (_, index) => {
        const position = index / sampleCount;
        const color = index === 0
            ? toHex(start)
            : index === sampleCount
                ? toHex(end)
                : toHex(interpolateStyles(start, end, position, from, to, mix));
        return `${color} ${position * 100}%`;
    }).join(', ');
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function appendSvg(parent, tag, attributes, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
}

function drawInterpolationChart(svg, spaceKey, start, end, steps, from, to, mix, side) {
    const chartHeight = 250;
    const plot = { left: 42, right: 330, top: 18, bottom: 210 };
    const plotWidth = plot.right - plot.left;
    const plotHeight = plot.bottom - plot.top;
    const xFor = t => plot.left + t * plotWidth;
    const yFor = value => plot.bottom - (0.035 + Math.max(0, Math.min(1, value)) * 0.93) * plotHeight;
    const space = INTERPOLATION_STYLES[spaceKey];
    const colorAt = t => {
        if (t <= 0) return start;
        if (t >= 1) return end;
        return interpolateStyles(start, end, t, from, to, mix);
    };
    const valuesAt = (t, color = colorAt(t)) => space.fromRgb(color);
    const figureTitle = side === 'from' ? elements.fromChartTitle : elements.toChartTitle;
    const scaleCaption = side === 'from' ? elements.fromChartScale : elements.toChartScale;
    figureTitle.textContent = `${side === 'from' ? 'From' : 'To'}: ${space.label} channels`;
    scaleCaption.textContent = space.scaleLabel;

    svg.replaceChildren();
    appendSvg(svg, 'title', {}, `${space.label} channels of the current palette blended from ${INTERPOLATION_STYLES[from].label} to ${INTERPOLATION_STYLES[to].label} at ${mix}%`);
    appendSvg(svg, 'rect', {
        x: plot.left,
        y: plot.top,
        width: plotWidth,
        height: plotHeight,
        class: 'chart-plot-area'
    });

    [0.25, 0.5, 0.75].forEach(percent => {
        const y = yFor(percent);
        appendSvg(svg, 'line', { x1: plot.left, x2: plot.right, y1: y, y2: y, class: 'chart-grid-line' });
        appendSvg(svg, 'text', { x: plot.left - 6, y: y + 3, class: 'chart-label', 'text-anchor': 'end' }, `${percent * 100}%`);
    });

    for (let index = 1; index <= steps; index++) {
        const x = xFor(index / (steps + 1));
        appendSvg(svg, 'line', { x1: x, x2: x, y1: plot.top, y2: plot.bottom, class: 'chart-guide-line' });
    }

    appendSvg(svg, 'text', { x: plot.left, y: plot.bottom + 17, class: 'chart-label', 'text-anchor': 'middle' }, '0%');
    appendSvg(svg, 'text', { x: plot.right, y: plot.bottom + 17, class: 'chart-label', 'text-anchor': 'middle' }, '100%');
    appendSvg(svg, 'text', { x: (plot.left + plot.right) / 2, y: chartHeight - 3, class: 'chart-label', 'text-anchor': 'middle' }, 'Interpolation progress');

    const lineSamples = Array.from({ length: 101 }, (_, index) => {
        const t = index / 100;
        const color = colorAt(t);
        return { t, color, values: valuesAt(t, color) };
    });
    const markerSamples = Array.from({ length: steps + 2 }, (_, index) => {
        const t = index / (steps + 1);
        const color = colorAt(t);
        return { t, color, values: valuesAt(t, color) };
    });

    space.channels.forEach(channel => {
        const pointFor = sample => {
            const normalized = (sample.values[channel.key] - channel.min) / (channel.max - channel.min);
            return { x: xFor(sample.t), y: yFor(normalized) };
        };
        const points = lineSamples.map(pointFor);

        if (channel.circular) {
            let segment = [points[0]];
            for (let index = 1; index < points.length; index++) {
                const previous = lineSamples[index - 1];
                const current = lineSamples[index];
                const hueChange = current.values[channel.key] - previous.values[channel.key];
                if (hueChange < -180 || hueChange > 180) {
                    const increasingAcrossZero = hueChange < -180;
                    const previousHue = previous.values[channel.key];
                    const currentHue = current.values[channel.key];
                    const adjustedCurrentHue = currentHue + (increasingAcrossZero ? 360 : -360);
                    const boundaryHue = increasingAcrossZero ? 360 : 0;
                    const ratio = (boundaryHue - previousHue) / (adjustedCurrentHue - previousHue);
                    const crossingX = xFor(previous.t + (current.t - previous.t) * ratio);
                    segment.push({ x: crossingX, y: increasingAcrossZero ? yFor(1) : yFor(0) });
                    appendSvg(svg, 'polyline', {
                        points: segment.map(point => `${point.x},${point.y}`).join(' '),
                        class: 'chart-channel-line',
                        stroke: channel.color
                    });
                    segment = [{ x: crossingX, y: increasingAcrossZero ? yFor(0) : yFor(1) }, points[index]];
                } else {
                    segment.push(points[index]);
                }
            }
            appendSvg(svg, 'polyline', {
                points: segment.map(point => `${point.x},${point.y}`).join(' '),
                class: 'chart-channel-line',
                stroke: channel.color
            });
        } else {
            appendSvg(svg, 'polyline', {
                points: points.map(point => `${point.x},${point.y}`).join(' '),
                class: 'chart-channel-line',
                stroke: channel.color
            });
        }

        markerSamples.forEach(sample => {
            const point = pointFor(sample);
            appendSvg(svg, 'circle', {
                cx: point.x,
                cy: point.y,
                r: 3.5,
                fill: toHex(sample.color),
                stroke: channel.color,
                class: 'chart-point'
            });
        });
        const lastPoint = pointFor(markerSamples[markerSamples.length - 1]);
        appendSvg(svg, 'text', {
            x: plot.right - 4,
            y: lastPoint.y - 6,
            class: 'chart-channel-label',
            color: channel.color,
            'text-anchor': 'end'
        }, channel.label);
    });
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
    pickerPairs.forEach(({ text, native, button }) => {
        const color = toHex(parseHex(text.value));
        native.value = color;
        button.style.setProperty('--swatch-color', color);
    });

    const colors = getPalette(start, end, Number(elements.stepsNumber.value), from, to, mix);
    elements.paletteCount.textContent = `${colors.length} colors`;
    elements.gradientStrip.style.background = `linear-gradient(90deg, ${getGradientStops(start, end, from, to, mix)})`;
    const steps = Number(elements.stepsNumber.value);
    drawInterpolationChart(elements.fromChart, from, start, end, steps, from, to, mix, 'from');
    drawInterpolationChart(elements.toChart, to, start, end, steps, from, to, mix, 'to');
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

elements.colorA.addEventListener('change', () => updateColorPicker(elements.colorA, elements.pickerA));
elements.colorB.addEventListener('change', () => updateColorPicker(elements.colorB, elements.pickerB));

function updateFromCustomPicker(pair, hue, saturation, value) {
    pair.text.value = toHex(hsvToRgb({ h: hue, s: saturation, v: value }));
    pair.popover.querySelector('.color-plane').style.setProperty('--hue', hue);
    pair.popover.querySelector('.color-plane').style.setProperty('--sat', `${saturation * 100}%`);
    pair.popover.querySelector('.color-plane').style.setProperty('--value', `${(1 - value) * 100}%`);
    pair.popover.querySelector('.color-plane').setAttribute('aria-valuetext', `${Math.round(saturation * 100)}% saturation, ${Math.round(value * 100)}% brightness`);
    renderPalette();
}

pickerPairs.forEach(pair => {
    const { text, native, button, popover } = pair;
    const plane = popover.querySelector('.color-plane');
    const hueSlider = popover.querySelector('.hue-slider');
    let hue = Number(hueSlider.value);
    let saturation = 1;
    let value = 0.5;

    button.addEventListener('click', () => {
        document.querySelectorAll('.color-popover').forEach(item => { if (item !== popover) item.hidden = true; });
        const opening = popover.hidden;
        popover.hidden = !opening;
        if (!opening) return;
        const rgb = parseHex(text.value);
        if (rgb) {
            const hsv = rgbToHsv(rgb);
            hue = hsv.h;
            saturation = hsv.s;
            value = hsv.v;
            hueSlider.value = hue;
            plane.style.setProperty('--hue', hue);
            plane.style.setProperty('--sat', `${saturation * 100}%`);
            plane.style.setProperty('--value', `${(1 - value) * 100}%`);
        }
    });

    hueSlider.addEventListener('input', () => {
        hue = Number(hueSlider.value);
        plane.style.setProperty('--hue', hue);
        updateFromCustomPicker(pair, hue, saturation, value);
    });

    const pickOnPlane = event => {
        const rect = plane.getBoundingClientRect();
        saturation = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        value = 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        updateFromCustomPicker(pair, hue, saturation, value);
    };
    plane.addEventListener('pointerdown', event => { plane.setPointerCapture(event.pointerId); pickOnPlane(event); });
    plane.addEventListener('pointermove', event => { if (plane.hasPointerCapture(event.pointerId)) pickOnPlane(event); });
    plane.addEventListener('keydown', event => {
        const delta = event.shiftKey ? 0.05 : 0.01;
        if (event.key === 'ArrowRight') saturation = Math.min(1, saturation + delta);
        else if (event.key === 'ArrowLeft') saturation = Math.max(0, saturation - delta);
        else if (event.key === 'ArrowUp') value = Math.min(1, value + delta);
        else if (event.key === 'ArrowDown') value = Math.max(0, value - delta);
        else return;
        event.preventDefault();
        updateFromCustomPicker(pair, hue, saturation, value);
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
elements.interpolationFrom.addEventListener('change', renderPalette);
elements.interpolationTo.addEventListener('change', renderPalette);
elements.interpolationMix.addEventListener('input', renderPalette);

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
