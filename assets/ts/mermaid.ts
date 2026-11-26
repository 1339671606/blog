declare const mermaid: {
    initialize(config: Record<string, any>): void;
    run(options: { nodes: HTMLElement[] }): Promise<void>;
};

interface MermaidConfig {
    transparentBackground?: boolean;
    lightTheme?: string;
    darkTheme?: string;
    lightThemeVariables?: Record<string, any>;
    darkThemeVariables?: Record<string, any>;
    securityLevel?: string;
    look?: string;
    htmlLabels?: boolean;
    maxTextSize?: number;
    maxEdges?: number;
    fontSize?: number;
    fontFamily?: string;
    curve?: string;
    logLevel?: number;
    sequence?: Record<string, any>;
    flowchart?: Record<string, any>;
}

type Scheme = 'light' | 'dark';

const PANZOOM_CDN = 'https://cdn.jsdelivr.net/npm/panzoom@9.4.3/+esm';
const DEFAULT_FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif';
const MEASUREMENT_CSS = [
    'foreignObject > div { white-space: break-spaces !important; word-break: keep-all; overflow-wrap: anywhere; }',
    '.node foreignObject > div { max-width: 240px !important; }',
    '.nodeLabel p, .edgeLabel p { margin: 0 !important; }',
    '.edgeLabel, .labelBkg { opacity: 1 !important; }',
    '.edgeLabel .labelBkg { padding: 0 4px; border-radius: 3px; }',
].join('\n');

function getScheme(): Scheme {
    return document.documentElement.dataset.scheme === 'dark' ? 'dark' : 'light';
}

function buildThemeConfig(cfg: MermaidConfig, scheme: Scheme) {
    const isLight = scheme === 'light';
    const theme = isLight ? (cfg.lightTheme ?? 'base') : (cfg.darkTheme ?? 'base');
    const vars = isLight ? (cfg.lightThemeVariables ?? {}) : (cfg.darkThemeVariables ?? {});
    const paper = isLight ? '#faf9f5' : '#151210';
    const ink = isLight ? '#2b2621' : '#e8dfd5';
    const muted = isLight ? '#72695e' : '#a7998b';
    const fill = isLight ? '#fffdf9' : '#221d19';
    const border = isLight ? '#d9cdbf' : '#4a3e35';
    const accent = isLight ? '#bc6a3a' : '#d59567';
    const accentFill = isLight ? '#f8ebe1' : '#33241b';
    const accentBorder = isLight ? '#e3bfa4' : '#7a523a';
    const line = isLight ? '#a39382' : '#8c7b6c';
    const clusterFill = isLight ? 'rgba(243, 237, 229, 0.45)' : 'rgba(42, 35, 30, 0.45)';
    const clusterBorder = isLight ? '#dccfbf' : '#45392f';
    const noteFill = isLight ? '#fbf4e7' : '#2a2219';
    const noteBorder = isLight ? '#e8d6b9' : '#5e4a35';
    const fontFamily = cfg.fontFamily ?? DEFAULT_FONT_FAMILY;
    return {
        theme,
        themeVariables: {
            darkMode: !isLight, background: paper,
            fontFamily, fontSize: `${cfg.fontSize ?? 16}px`,
            primaryColor: fill, primaryTextColor: ink, primaryBorderColor: border,
            secondaryColor: accentFill, secondaryTextColor: ink, secondaryBorderColor: accentBorder,
            tertiaryColor: clusterFill, tertiaryTextColor: muted, tertiaryBorderColor: clusterBorder,
            textColor: ink, lineColor: line, mainBkg: fill,
            nodeBorder: border, nodeTextColor: ink, clusterBkg: clusterFill, clusterBorder,
            edgeLabelBackground: paper,
            actorBkg: fill, actorBorder: border, actorTextColor: ink, actorLineColor: border,
            signalColor: line, signalTextColor: ink,
            noteBkgColor: noteFill, noteBorderColor: noteBorder, noteTextColor: ink,
            labelBoxBkgColor: accentFill, labelBoxBorderColor: accentBorder, labelTextColor: accent,
            loopTextColor: muted, activationBkgColor: accentFill, activationBorderColor: accentBorder,
            ...vars,
        },
    };
}

function buildBaseConfig(cfg: MermaidConfig): Record<string, any> {
    const fontFamily = cfg.fontFamily ?? DEFAULT_FONT_FAMILY;
    const base: Record<string, any> = {
        startOnLoad: false,
        securityLevel: cfg.securityLevel ?? 'strict',
        look: cfg.look ?? 'classic',
        fontFamily,
        themeCSS: MEASUREMENT_CSS,
        flowchart: {
            htmlLabels: cfg.htmlLabels ?? true, useMaxWidth: true,
            wrappingWidth: 240, curve: cfg.curve ?? 'basis',
            ...cfg.flowchart,
        },
        sequence: {
            useMaxWidth: true, wrap: true, wrapPadding: 10,
            diagramMarginX: 18, diagramMarginY: 14,
            width: 156, height: 56, actorMargin: 140, boxMargin: 12,
            noteMargin: 8, messageMargin: 40, mirrorActors: false,
            actorFontFamily: fontFamily, messageFontFamily: fontFamily, noteFontFamily: fontFamily,
            actorFontSize: cfg.fontSize ?? 16, messageFontSize: cfg.fontSize ?? 16, noteFontSize: cfg.fontSize ?? 16,
            ...cfg.sequence,
        },
        gantt: { useWidth: 800 },
    };
    const optional: (keyof MermaidConfig)[] = ['maxTextSize', 'maxEdges', 'fontSize', 'fontFamily', 'logLevel'];
    for (const key of optional) {
        if (cfg[key] != null) base[key] = cfg[key];
    }
    return base;
}

function initWithTheme(
    scheme: Scheme,
    themes: Record<Scheme, ReturnType<typeof buildThemeConfig>>,
    baseConfig: Record<string, any>,
) {
    const { theme, themeVariables } = themes[scheme];
    mermaid.initialize({
        ...baseConfig,
        theme,
        themeVariables,
    });
}

function labelsForBox(box: SVGGraphicsElement): SVGGraphicsElement[] {
    const selector = box.matches('rect.note') ? 'text.noteText' : 'text.actor';
    const labels: SVGGraphicsElement[] = [];
    for (let label = box.nextElementSibling; label?.matches(selector); label = label.nextElementSibling) {
        labels.push(label as SVGGraphicsElement);
    }
    return labels;
}

function boundsForLabels(labels: SVGGraphicsElement[]) {
    const boxes = labels.map(label => label.getBBox()).filter(box => box.width && box.height);
    if (!boxes.length) return null;
    const x = Math.min(...boxes.map(box => box.x));
    const y = Math.min(...boxes.map(box => box.y));
    return {
        x, y,
        width: Math.max(...boxes.map(box => box.x + box.width)) - x,
        height: Math.max(...boxes.map(box => box.y + box.height)) - y,
    };
}

function alignSequenceBoxes(svg: SVGSVGElement) {
    const lifelines = Array.from(svg.querySelectorAll<SVGGraphicsElement>('.actor-line'))
        .map(line => line.getBBox().x);
    if (!lifelines.length) return;

    svg.querySelectorAll<SVGGraphicsElement>('rect.note').forEach(box => {
        const text = boundsForLabels(labelsForBox(box));
        if (!text) return;
        const original = box.getBBox();
        const covered = lifelines.filter(x => x >= original.x && x <= original.x + original.width);
        // Preserve the note's scope: an annotation over two actors must cross both lifelines.
        const span = covered.length >= 2 ? Math.max(...covered) - Math.min(...covered) : 0;
        const center = covered.length >= 2
            ? (Math.min(...covered) + Math.max(...covered)) / 2
            : original.x + original.width / 2;
        const width = Math.min(original.width, Math.ceil(Math.max(text.width + 24, span + 24)));
        const height = Math.min(original.height, Math.ceil(text.height + 14));
        box.setAttribute('x', String(center - width / 2));
        box.setAttribute('y', String(original.y + (original.height - height) / 2));
        box.setAttribute('width', String(width));
        box.setAttribute('height', String(height));
    });

    svg.querySelectorAll<SVGGraphicsElement>('rect.actor, rect.note').forEach(box => {
        const labels = labelsForBox(box);
        const text = boundsForLabels(labels);
        if (!text) return;
        const bounds = box.getBBox();
        const x = bounds.x + bounds.width / 2 - text.x - text.width / 2;
        const y = bounds.y + bounds.height / 2 - text.y - text.height / 2;
        labels.forEach(label => label.setAttribute('transform', `translate(${x}, ${y})`));
    });
}

function prepareDiagram(el: HTMLElement) {
    const svg = el.querySelector<SVGSVGElement>('svg');
    if (!svg) return;
    alignSequenceBoxes(svg);
    const width = Number(svg.getAttribute('viewBox')?.split(/[\s,]+/)[2]);
    if (width > 0) {
        svg.style.width = `${width}px`;
        svg.style.maxWidth = '100%';
        // Keep labels readable on small screens; the diagram itself remains scrollable.
        svg.style.minWidth = `${Math.ceil(width * 0.8)}px`;
    }
}

async function renderOffscreen(sources: string[]): Promise<string[]> {
    const container = document.createElement('div');
    container.className = 'mermaid-offscreen';
    document.body.appendChild(container);
    const nodes = sources.map(src => {
        const n = document.createElement('pre');
        n.className = 'mermaid';
        n.innerHTML = src;
        container.appendChild(n);
        return n;
    });
    try {
        await mermaid.run({ nodes });
        if (document.fonts) await document.fonts.ready;
        nodes.forEach(prepareDiagram);
        return nodes.map(n => n.innerHTML);
    } finally {
        container.remove();
    }
}

function syncScrollState(el: HTMLElement) {
    const wrapper = el.closest('.mermaid-wrapper');
    if (!wrapper) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const scrollable = maxScroll > 6;
    wrapper.classList.toggle('is-scrollable', scrollable);
    wrapper.classList.toggle('can-scroll-left', scrollable && el.scrollLeft > 4);
    wrapper.classList.toggle('can-scroll-right', scrollable && el.scrollLeft < maxScroll - 4);
}

function setupWrappers(elements: NodeListOf<HTMLElement>) {
    elements.forEach((el, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-wrapper';
        el.parentNode!.insertBefore(wrapper, el);
        wrapper.appendChild(el);
        wrapper.insertAdjacentHTML(
            'beforeend',
            `<div class="mermaid-toolbar"><span class="mermaid-scroll-hint" aria-hidden="true">↔ 可左右滑动</span><button type="button" data-idx="${idx}" title="放大图表并拖动、缩放">放大查看</button></div>`,
        );
        el.addEventListener('scroll', () => syncScrollState(el), { passive: true });
    });
}

function setupModal(elements: NodeListOf<HTMLElement>) {
    const modal = document.getElementById('mermaid-modal')!;
    const modalBody = document.getElementById('mermaid-modal-body')!;
    const modalContent = document.getElementById('mermaid-modal-content')!;
    let pzInstance: any = null;
    let panzoom: any = null;
    let returnFocus: HTMLElement | null = null;
    let previousOverflow = '';

    const loadPanzoom = async () => {
        if (!panzoom) {
            const url = PANZOOM_CDN;
            panzoom = (await import(url)).default;
        }
        return panzoom;
    };

    const fitToScreen = () => {
        const wrapper = modalContent.querySelector('.mermaid-panzoom-container') as HTMLElement | null;
        if (!pzInstance || !wrapper) return;
        const w = +(wrapper.dataset.nativeWidth ?? 0);
        const h = +(wrapper.dataset.nativeHeight ?? 0);
        const rect = modalContent.getBoundingClientRect();
        const scale = Math.min((rect.width - 60) / w, (rect.height - 60) / h);
        pzInstance.zoomAbs(0, 0, scale);
        pzInstance.moveTo((rect.width - w * scale) / 2, (rect.height - h * scale) / 2);
    };

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = previousOverflow;
        pzInstance?.dispose();
        pzInstance = null;
        modalContent.innerHTML = '';
        returnFocus?.focus({ preventScroll: true });
    };

    const openModal = async (idx: number) => {
        const svg = elements[idx].querySelector('svg');
        if (!svg) return;

        const svgClone = svg.cloneNode(true) as SVGElement;
        const viewBox = svg.getAttribute('viewBox');
        const [w, h] = viewBox
            ? viewBox.split(/[\s,]+/).slice(2).map(Number)
            : [svg.getBoundingClientRect().width || 800, svg.getBoundingClientRect().height || 600];
        svgClone.setAttribute('width', String(w));
        svgClone.setAttribute('height', String(h));
        svgClone.style.width = `${w}px`;
        svgClone.style.minWidth = '0';
        svgClone.style.maxWidth = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'mermaid-panzoom-container';
        wrapper.dataset.nativeWidth = String(w);
        wrapper.dataset.nativeHeight = String(h);
        wrapper.appendChild(svgClone);

        modalContent.innerHTML = '';
        modalContent.appendChild(wrapper);
        modal.classList.add('active');
        returnFocus = document.activeElement as HTMLElement | null;
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.getElementById('mermaid-modal-close')!.focus();

        const pz = await loadPanzoom();
        setTimeout(() => {
            if (!modal.classList.contains('active')) return;
            pzInstance = pz(wrapper, { maxZoom: 10, minZoom: 0.05, bounds: false });
            fitToScreen();
            wrapper.classList.add('ready');
        }, 50);
    };

    // Event delegation
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const toolbarBtn = target.closest('.mermaid-toolbar button') as HTMLElement | null;
        if (toolbarBtn) return openModal(+(toolbarBtn.dataset.idx!));

        const zoomBtn = target.closest('.mermaid-modal-controls button') as HTMLElement | null;
        if (zoomBtn && pzInstance) {
            const z = zoomBtn.dataset.zoom;
            const rect = modalBody.getBoundingClientRect();
            if (z === 'fit') fitToScreen();
            else if (z === '0') { pzInstance.moveTo(0, 0); pzInstance.zoomAbs(0, 0, 1); }
            else pzInstance.smoothZoom(rect.width / 2, rect.height / 2, z === '1' ? 1.5 : 0.67);
        }
    });

    document.getElementById('mermaid-modal-close')!.addEventListener('click', closeModal);
    modalBody.addEventListener('click', (e) => { if (e.target === modalBody) closeModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            closeModal();
        }
    }, true);
}

export async function initMermaidPage(config: MermaidConfig) {
    const elements = document.querySelectorAll('.mermaid') as NodeListOf<HTMLElement>;
    if (!elements.length) return;

    const sources = Array.from(elements).map(el => el.innerHTML);
    const perDiagramTransparent = sources.map(src => /%%\s*transparent\s*%%/i.test(src));
    const cache: Record<Scheme, string[]> = { light: [], dark: [] };
    const pending: Partial<Record<Scheme, Promise<string[]>>> = {};
    let queue: Promise<unknown> = Promise.resolve();

    const themes = {
        light: buildThemeConfig(config, 'light'),
        dark: buildThemeConfig(config, 'dark'),
    };
    const baseConfig = buildBaseConfig(config);

    const applyTransparency = (el: HTMLElement, i: number) => {
        if (config.transparentBackground || perDiagramTransparent[i]) {
            el.querySelector('svg')?.style.setProperty('background', 'transparent');
        }
    };

    setupWrappers(elements);
    setupModal(elements);

    const renderScheme = (scheme: Scheme): Promise<string[]> => {
        if (cache[scheme].length) return Promise.resolve(cache[scheme]);
        if (pending[scheme]) return pending[scheme]!;
        const task = queue.then(async () => {
            initWithTheme(scheme, themes, baseConfig);
            const diagrams = await renderOffscreen(sources);
            cache[scheme] = diagrams;
            return diagrams;
        });
        queue = task.catch(() => {});
        pending[scheme] = task;
        task.then(() => { delete pending[scheme]; }, () => { delete pending[scheme]; });
        return task;
    };

    const showScheme = async (scheme: Scheme) => {
        const diagrams = await renderScheme(scheme);
        if (scheme !== getScheme()) return;
        elements.forEach((el, i) => {
            el.innerHTML = diagrams[i];
            el.style.visibility = '';
            el.dataset.processed = 'true';
            el.dataset.mermaidReady = 'true';
            applyTransparency(el, i);
            syncScrollState(el);
        });
    };

    const syncAll = () => elements.forEach(syncScrollState);
    window.addEventListener('resize', syncAll, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(syncAll);
        elements.forEach(el => observer.observe(el));
    }

    window.addEventListener('onColorSchemeChange', () => {
        showScheme(getScheme()).catch(error => console.error('Mermaid theme change:', error));
    });
    await showScheme(getScheme());

    // Pre-render alternate theme during idle time
    const alt: Scheme = getScheme() === 'dark' ? 'light' : 'dark';
    const idle = window.requestIdleCallback ?? ((fn: IdleRequestCallback) => setTimeout(fn, 1000));
    idle(() => {
        renderScheme(alt).catch(error => console.error('Mermaid alternate theme:', error));
    });

}
