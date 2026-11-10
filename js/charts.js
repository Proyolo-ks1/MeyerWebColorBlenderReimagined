import { INTERPOLATION_STYLES, interpolateStyles, toHex } from './color.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function appendSvg(parent, tag, attributes, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    if (text !== undefined) node.textContent = text;
    parent.append(node);
    return node;
}

export function drawInterpolationChart(svg, titleElement, scaleElement, spaceKey, start, end, steps, from, to, mix, side) {
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
    const figureTitle = titleElement;
    const scaleCaption = scaleElement;
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

    const gradientId = `chart-progress-${side}`;
    const defs = appendSvg(svg, 'defs', {});
    const progressGradient = appendSvg(defs, 'linearGradient', { id: gradientId, x1: '0%', x2: '100%', y1: '0%', y2: '0%' });
    for (let index = 0; index <= 20; index++) {
        const progress = index / 20;
        appendSvg(progressGradient, 'stop', {
            offset: `${progress * 100}%`,
            'stop-color': toHex(colorAt(progress))
        });
    }
    appendSvg(svg, 'rect', {
        x: plot.left,
        y: plot.bottom + 4,
        width: plotWidth,
        height: 7,
        rx: 3.5,
        fill: `url(#${gradientId})`,
        class: 'chart-progress-strip'
    });

    appendSvg(svg, 'text', { x: plot.left, y: plot.bottom + 25, class: 'chart-label', 'text-anchor': 'middle' }, '0%');
    appendSvg(svg, 'text', { x: plot.right, y: plot.bottom + 25, class: 'chart-label', 'text-anchor': 'middle' }, '100%');
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

