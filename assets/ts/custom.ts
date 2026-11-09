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
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupReadingTools);
else setupReadingTools();
export {};
