export function parseHex(value) {
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

export function toHex({ r, g, b }) {
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

export function rgbToHsv({ r, g, b }) {
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

export function hsvToRgb({ h, s, v }) {
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

export const INTERPOLATION_STYLES = {
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

export function interpolateStyles(start, end, t, from, to, mix) {
    const firstColor = INTERPOLATION_STYLES[from].interpolate(start, end, t);
    const secondColor = INTERPOLATION_STYLES[to].interpolate(start, end, t);
    const amount = mix / 100;
    return interpolateRgb(firstColor, secondColor, amount);
}

export function getPalette(start, end, steps, from, to, mix) {
    const colors = [];

    for (let index = 0; index <= steps + 1; index++) {
        const t = index / (steps + 1);
        colors.push(toHex(interpolateStyles(start, end, t, from, to, mix)));
    }

    return colors;
}

export function getGradientStops(start, end, from, to, mix) {
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

