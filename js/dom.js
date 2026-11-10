export const DEFAULTS = {
    colorA: '#3867D6',
    colorB: '#EB3B5A',
    steps: 5,
    interpolationFrom: 'rgb',
    interpolationTo: 'hsl',
    interpolationMix: 0
};

export const elements = {
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
    themeToggle: document.querySelector('#theme-toggle'),
    themeToggleIcon: document.querySelector('#theme-toggle-icon'),
    themeToggleLabel: document.querySelector('#theme-toggle-label'),
    gradientToggle: document.querySelector('#gradient-toggle'),
    gradientToggleLabel: document.querySelector('#gradient-toggle-label'),
    themeColor: document.querySelector('meta[name="theme-color"]'),
    error: document.querySelector('#input-error'),
    toast: document.querySelector('#toast'),
    swapColors: document.querySelector('#swap-colors'),
    reset: document.querySelector('#reset'),
    copyAll: document.querySelector('#copy-all'),
    copyFormatWrap: document.querySelector('#copy-format-wrap'),
    copyFormatToggle: document.querySelector('#copy-format-toggle')
};

export const pickerPairs = [
    {
        text: elements.colorA,
        native: elements.pickerA,
        button: document.querySelector('#custom-picker-a'),
        popover: document.querySelector('#popover-a')
    },
    {
        text: elements.colorB,
        native: elements.pickerB,
        button: document.querySelector('#custom-picker-b'),
        popover: document.querySelector('#popover-b')
    }
];
