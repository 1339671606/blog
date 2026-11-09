interface SearchEntry {
    title: string; permalink: string; content: string; prose: string;
    date: string; dateLabel: string; draft: boolean; categories: string[]; tags: string[];
}
function patternFor(query: string): RegExp {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    return new RegExp(terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi");
}
function countMatches(text: string, pattern: RegExp): number {
    return [...text.matchAll(pattern)].length;
}
function appendHighlighted(target: HTMLElement, text: string, pattern: RegExp) {
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
        const index = match.index!;
        target.append(document.createTextNode(text.slice(offset, index)));
        const mark = document.createElement("mark");
        mark.textContent = match[0];
        target.append(mark);
        offset = index + match[0].length;
    }
    target.append(document.createTextNode(text.slice(offset)));
}
function excerptFor(entry: SearchEntry, pattern: RegExp): string {
    const prose = entry.prose || "";
    const useProse = countMatches(prose, pattern) > 0 || countMatches(entry.content, pattern) === 0;
    const text = (useProse ? prose || entry.content : entry.content)
        .replace(/[\u2500-\u259f]+/g, " ").replace(/\s+/g, " ").trim();
    const first = text.matchAll(pattern).next().value;
    const start = first ? Math.max(0, first.index! - 35) : 0;
    const end = Math.min(text.length, start + 190);
    return (start ? "… " : "") + text.slice(start, end) + (end < text.length ? " …" : "");
}
function renderSearchEntry(entry: SearchEntry, pattern: RegExp): HTMLElement {
    const article = document.createElement("article");
    article.className = "blog-search-card";
    const link = document.createElement("a");
    link.href = entry.permalink;
    const title = document.createElement("h2");
    appendHighlighted(title, entry.title, pattern);
    link.append(title);
    const meta = document.createElement("div");
    meta.className = "blog-search-meta";
    if (entry.date) {
        const time = document.createElement("time");
        time.dateTime = entry.date;
        time.textContent = (entry.dateLabel || "发布日期") + "：" + entry.date;
        meta.append(time);
    }
    if (entry.categories?.length) {
        const category = document.createElement("span");
        category.textContent = entry.categories[0];
        meta.append(category);
    }
    if (entry.draft) {
        const draft = document.createElement("span");
        draft.className = "collection-draft";
        draft.textContent = "草稿";
        meta.append(draft);
    }
    link.append(meta);
    const excerpt = document.createElement("p");
    appendHighlighted(excerpt, excerptFor(entry, pattern), pattern);
    link.append(excerpt);
    article.append(link);
    return article;
}
function setupSearch(root: HTMLElement) {
    const form = root.querySelector<HTMLFormElement>("form")!;
    const input = form.querySelector<HTMLInputElement>("input")!;
    const results = root.querySelector<HTMLElement>("[data-search-results]")!;
    const status = root.querySelector<HTMLElement>("[data-search-status]")!;
    const empty = root.querySelector<HTMLElement>("[data-search-empty]")!;
    let index: Promise<SearchEntry[]> | undefined;
    let revision = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const getIndex = () => {
        if (!index) {
            index = fetch(form.dataset.json!)
                .then(response => { if (!response.ok) throw new Error("Search index unavailable"); return response.json(); })
                .then(data => { if (!Array.isArray(data)) throw new Error("Invalid search index"); return data as SearchEntry[]; })
                .catch(error => { index = undefined; throw error; });
        }
        return index;
    };
    const search = async (updateURL = true) => {
        const query = input.value.trim();
        const current = ++revision;
        if (updateURL) {
            const url = new URL(window.location.href);
            if (query) url.searchParams.set("keyword", query); else url.searchParams.delete("keyword");
            window.history.replaceState(null, "", url);
        }
        results.replaceChildren();
        empty.hidden = true;
        if (!query) { status.textContent = "输入关键词开始搜索。"; return; }
        status.textContent = "正在搜索…";
        try {
            const data = await getIndex();
            if (current !== revision) return;
            const pattern = patternFor(query);
            const matches = data.map(entry => ({
                entry,
                score: countMatches(entry.title, pattern) * 10
                    + countMatches((entry.categories || []).concat(entry.tags || []).join(" "), pattern) * 5
                    + countMatches(entry.content, pattern)
            })).filter(result => result.score > 0).sort((a, b) => b.score - a.score);
            for (const result of matches) results.append(renderSearchEntry(result.entry, pattern));
            status.textContent = matches.length ? "找到 " + matches.length + " 篇笔记" : "没有找到匹配结果";
            empty.hidden = matches.length > 0;
        } catch {
            if (current === revision) status.textContent = "搜索暂时不可用，请刷新页面后再试。";
        }
    };
    form.addEventListener("submit", event => {
        event.preventDefault();
        clearTimeout(timer);
        void search();
    });
    const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(() => { void search(); }, 160);
    };
    input.addEventListener("input", event => { if (!(event as InputEvent).isComposing) schedule(); });
    input.addEventListener("compositionend", schedule);
    window.addEventListener("popstate", () => {
        clearTimeout(timer);
        input.value = new URL(window.location.href).searchParams.get("keyword") || "";
        void search(false);
    });
    input.value = new URL(window.location.href).searchParams.get("keyword") || "";
    void search(false);
}
function initSearch() {
    document.querySelectorAll<HTMLElement>("[data-blog-search]").forEach(setupSearch);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSearch);
else initSearch();
export {};
