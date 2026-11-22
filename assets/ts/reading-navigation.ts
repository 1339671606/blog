/* Dialogs keep the article in place; they never reuse the desktop TOC's IDs. */
export function setupReadingNavigation() {
    const dialogs = [...document.querySelectorAll<HTMLDialogElement>(".reading-drawer")];
    if (!dialogs.length || typeof dialogs[0].showModal !== "function") return;
    document.documentElement.classList.add("reading-navigation-ready");
    let origin: HTMLElement | null = null;
    let savedY = 0;
    let jumping = false;

    const updateCurrentChapter = (dialog: HTMLDialogElement) => {
        const links = [...dialog.querySelectorAll<HTMLAnchorElement>(".reading-drawer-toc a[href^='#']")];
        let current: HTMLAnchorElement | undefined;
        for (const link of links) {
            const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
            if (target && target.getBoundingClientRect().top <= 110) current = link;
            link.removeAttribute("aria-current");
        }
        (current || links[0])?.setAttribute("aria-current", "location");
    };
    const open = (name: string, trigger: HTMLElement) => {
        const dialog = document.getElementById(name === "notes" ? "related-notes-dialog" : "reading-toc-dialog") as HTMLDialogElement | null;
        if (!dialog || dialog.open) return;
        origin = trigger; savedY = window.scrollY; jumping = false;
        updateCurrentChapter(dialog);
        dialog.showModal();
        document.documentElement.classList.add("reading-drawer-open");
        dialog.querySelector<HTMLButtonElement>("[data-reading-close]")?.focus({ preventScroll: true });
        const active = dialog.querySelector<HTMLElement>("[data-category-panel]:not([hidden]) [aria-current], .reading-drawer-toc [aria-current]");
        const scroll = dialog.querySelector<HTMLElement>(".reading-drawer-scroll");
        if (active && scroll) scroll.scrollTop += active.getBoundingClientRect().top - scroll.getBoundingClientRect().top - scroll.clientHeight / 3;
    };
    document.querySelectorAll<HTMLElement>("[data-reading-open]").forEach(button => {
        button.addEventListener("click", () => open(button.dataset.readingOpen!, button));
    });
    document.querySelectorAll<HTMLElement>("[data-reading-toc]").forEach(button => {
        button.addEventListener("click", () => {
            if (matchMedia("(max-width: 1023px)").matches) { open("toc", button); return; }
            const toc = document.querySelector<HTMLElement>("#TableOfContents");
            const active = toc?.querySelector<HTMLElement>(".active-class > a") || toc?.querySelector<HTMLElement>("a");
            active?.focus({ preventScroll: true });
        });
    });
    for (const dialog of dialogs) {
        dialog.querySelector("[data-reading-close]")?.addEventListener("click", () => dialog.close());
        dialog.addEventListener("cancel", event => { event.preventDefault(); dialog.close(); });
        dialog.addEventListener("click", event => {
            if (event.target !== dialog) return;
            const r = dialog.getBoundingClientRect();
            if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
        });
        dialog.addEventListener("close", () => {
            document.documentElement.classList.remove("reading-drawer-open");
            if (!jumping) {
                window.scrollTo({ top: savedY, behavior: "instant" as ScrollBehavior });
                origin?.focus({ preventScroll: true });
            }
        });
        dialog.querySelectorAll<HTMLButtonElement>("[data-category-filter]").forEach(button => {
            button.addEventListener("click", () => {
                dialog.querySelectorAll<HTMLElement>("[data-category-panel]").forEach(panel => { panel.hidden = panel.id !== button.dataset.categoryFilter; });
                dialog.querySelectorAll("[data-category-filter]").forEach(filter => filter.setAttribute("aria-pressed", String(filter === button)));
                dialog.querySelector<HTMLElement>(".reading-drawer-scroll")!.scrollTop = 0;
            });
        });
        dialog.querySelectorAll<HTMLAnchorElement>(".reading-drawer-toc a").forEach(link => {
            link.addEventListener("click", event => {
                const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
                if (!target) return;
                event.preventDefault();
                jumping = true;
                dialog.close();
                document.documentElement.classList.remove("reading-drawer-open");
                history.pushState(null, "", link.hash);
                requestAnimationFrame(() => {
                    target.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
                    target.tabIndex = -1; target.focus({ preventScroll: true });
                });
            });
        });
    }
}
