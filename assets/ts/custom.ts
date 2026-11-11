/* Project reading controls. Stack retains its TOC, code-copy and image behavior. */
function setupReadingTools() {
    const tools = document.querySelector<HTMLElement>(".reading-tools");
    if (!tools) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const behavior = (): ScrollBehavior => reduced.matches ? "auto" : "smooth";
    let queued = false;
    const update = () => {
        tools.hidden = window.scrollY < Math.min(600, window.innerHeight * 0.75);
        queued = false;
    };
    window.addEventListener("scroll", () => {
        if (!queued) { queued = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    tools.querySelector<HTMLButtonElement>("[data-reading-top]")?.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: behavior() });
        const title = document.querySelector<HTMLElement>(".article-header .article-title");
        if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
    });
    tools.querySelector<HTMLButtonElement>("[data-reading-toc]")?.addEventListener("click", () => {
        const inline = document.querySelector<HTMLElement>(".article-toc");
        if (inline && inline.getClientRects().length) {
            const details = inline.querySelector<HTMLDetailsElement>("details");
            if (details) details.open = true;
            inline.scrollIntoView({ block: "start", behavior: behavior() });
            inline.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
        } else {
            const sidebar = document.querySelector<HTMLElement>("#TableOfContents");
            sidebar?.scrollTo({ top: 0, behavior: behavior() });
            sidebar?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
        }
    });
    update();
}
function setupReaderMode() {
    const toggle = document.querySelector<HTMLButtonElement>("[data-reader-toggle]");
    if (!toggle) return;
    const root = document.documentElement;
    const focused = () => root.dataset.readerMode === "focus";
    const sync = () => {
        const active = focused();
        toggle.setAttribute("aria-pressed", String(active));
        toggle.setAttribute("aria-label", active ? "退出沉浸阅读" : "开启沉浸阅读");
        toggle.title = active ? "恢复左侧导航（Esc）" : "收起左侧导航，扩大正文";
        toggle.querySelector<HTMLElement>("[data-reader-label]")!.textContent = active ? "退出沉浸" : "沉浸阅读";
    };
    const setMode = (active: boolean) => {
        const anchor = [...document.querySelectorAll<HTMLElement>(".article-content > *")]
            .find(el => { const r = el.getBoundingClientRect(); return r.bottom > 90 && r.top < innerHeight; });
        const oldTop = anchor?.getBoundingClientRect().top;
        const keepPosition = scrollY > 150;
        root.dataset.readerMode = active ? "focus" : "normal";
        try { localStorage.setItem(toggle.dataset.readerKey!, active ? "focus" : "normal"); } catch (_) { }
        sync();
        if (anchor && oldTop !== undefined && keepPosition) {
            window.scrollBy({top:anchor.getBoundingClientRect().top - oldTop, behavior:"auto"});
        }
    };
    toggle.addEventListener("click", () => setMode(!focused()));
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape" || !focused() || document.querySelector(".pswp--open")) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
        setMode(false);
        toggle.focus({preventScroll:true});
    });
    window.addEventListener("storage", event => {
        if (event.key === toggle.dataset.readerKey) {
            root.dataset.readerMode = event.newValue === "focus" ? "focus" : "normal";
            sync();
        }
    });
    sync();
}

function setupSchemeButton() {
    const button = document.querySelector<HTMLButtonElement>("button#dark-mode-toggle");
    if (!button) return;
    const visibleLabel = button.querySelector<HTMLElement>(".scheme-toggle-label");
    const sync = () => {
        const dark = document.documentElement.dataset.scheme === "dark";
        const label = dark ? "切换为浅色模式" : "切换为暗色模式";
        if (visibleLabel) {
            visibleLabel.textContent = dark ? "浅色模式" : "暗色模式";
        }
        button.setAttribute("aria-pressed", String(dark));
        button.setAttribute("aria-label", label);
        button.title = label;
    };
    window.addEventListener("onColorSchemeChange", sync);
    sync();
}

function setupProjectUI() { setupReadingTools(); setupReaderMode(); setupSchemeButton(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupProjectUI);
else setupProjectUI();
export {};
