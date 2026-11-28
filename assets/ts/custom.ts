import { setupReadingNavigation } from "./reading-navigation";
import { setupSearchTarget } from "./search-target";

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
    document.querySelectorAll<HTMLButtonElement>("[data-reader-exit]").forEach(button => {
        button.addEventListener("click", () => setMode(false));
    });
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape" || !focused() || document.querySelector(".pswp--open, .reading-drawer[open]")) return;
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
    const primary = document.querySelector<HTMLButtonElement>("button#dark-mode-toggle");
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("button.scheme-toggle")];
    if (!buttons.length) return;
    const sync = () => {
        const dark = document.documentElement.dataset.scheme === "dark";
        const label = dark ? "切换为浅色模式" : "切换为暗色模式";
        for (const button of buttons) {
            const visibleLabel = button.querySelector<HTMLElement>(".scheme-toggle-label");
            if (visibleLabel) {
                visibleLabel.textContent = dark ? "浅色模式" : "暗色模式";
            }
            button.setAttribute("aria-pressed", String(dark));
            button.setAttribute("aria-label", label);
            button.title = label;
        }
    };
    buttons.forEach(button => {
        if (button.hasAttribute("data-scheme-proxy")) {
            button.addEventListener("click", () => primary?.click());
        }
    });
    window.addEventListener("onColorSchemeChange", sync);
    sync();
}

function setupSearchShortcut() {
    document.addEventListener("keydown", event => {
        if (event.defaultPrevented || event.isComposing) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
        if (document.querySelector(".pswp--open, .reading-drawer[open], .mermaid-modal.active")) return;

        const isSlash = event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey;
        const isModK = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
        if (!isSlash && !isModK) return;

        const searchInput = document.querySelector<HTMLInputElement>("#blog-search-query");
        if (searchInput) {
            event.preventDefault();
            searchInput.focus();
            searchInput.select();
            return;
        }
        const searchUrl =
            document.querySelector<HTMLElement>(".reading-tools")?.dataset.searchUrl
            || document.querySelector<HTMLAnchorElement>("#main-menu a[href*='/search']")?.href;
        if (searchUrl) {
            event.preventDefault();
            window.location.href = searchUrl;
        }
    });
}

function setupProjectUI() {
    setupReadingNavigation();
    setupReadingTools();
    setupReaderMode();
    setupSchemeButton();
    setupSearchTarget();
    setupSearchShortcut();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupProjectUI);
else setupProjectUI();
export {};
