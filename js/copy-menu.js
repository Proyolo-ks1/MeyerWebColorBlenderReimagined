export function initializeCopyMenu(elements, copyText) {
    const { copyFormatWrap: wrap, copyFormatToggle: toggle, copyAll, palette } = elements;
    let mouseHovered = false;

    function setOpen(isOpen) {
        wrap.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
    }

    function copyPalette(separator, formatName) {
        const colors = [...palette.querySelectorAll('.swatch-label')].map(label => label.textContent);
        if (colors.length) copyText(colors.join(separator), `Copied palette (${formatName})`);
    }

    const formats = {
        csv: { separator: ',', label: 'CSV' },
        scsv: { separator: ';', label: 'SCSV' },
        tsv: { separator: '\t', label: 'TSV' },
        lines: { separator: '\n', label: 'one color per line' }
    };

    copyAll.addEventListener('click', () => copyPalette('\n', 'one color per line'));
    toggle.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        mouseHovered = true;
        setOpen(true);
    });
    wrap.addEventListener('pointerleave', () => {
        mouseHovered = false;
        setOpen(false);
    });
    wrap.addEventListener('focusin', event => {
        if (event.target === toggle || event.target.matches('[role="menuitem"]')) setOpen(true);
    });
    wrap.addEventListener('focusout', event => {
        if (!wrap.contains(event.relatedTarget)) setOpen(false);
    });
    toggle.addEventListener('click', event => {
        if (event.detail === 0 || mouseHovered) setOpen(true);
        else setOpen(!wrap.classList.contains('is-open'));
    });
    wrap.addEventListener('keydown', event => {
        const items = [...wrap.querySelectorAll('[role="menuitem"]')];
        const activeIndex = items.indexOf(document.activeElement);
        let nextIndex;
        if (event.key === 'ArrowDown') nextIndex = (activeIndex + 1) % items.length;
        else if (event.key === 'ArrowUp') nextIndex = (activeIndex <= 0 ? items.length : activeIndex) - 1;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = items.length - 1;
        else return;

        event.preventDefault();
        setOpen(true);
        items[nextIndex].focus();
    });

    wrap.querySelectorAll('[data-copy-format]').forEach(button => {
        button.addEventListener('click', () => {
            const format = formats[button.dataset.copyFormat];
            copyPalette(format.separator, format.label);
            toggle.focus();
            setOpen(false);
        });
    });

    document.addEventListener('pointerdown', event => {
        if (!event.target.closest('#copy-format-wrap')) setOpen(false);
    });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !wrap.classList.contains('is-open')) return;
        toggle.focus();
        setOpen(false);
    });
}
