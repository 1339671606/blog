/* Search annotations affect the rendered page only, never the source Markdown. */
export function setupSearchTarget() {
    const content = document.querySelector<HTMLElement>(".main-article .article-content");
    const query = new URL(location.href).searchParams.get("find")?.trim().slice(0, 160);
    if (!content || !query) return;
    const terms = query.split(/\s+/).filter(Boolean);
    const pattern = new RegExp(terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi");
    let anchor = "";
    try { anchor = decodeURIComponent(location.hash.slice(1)); } catch { }
    const heading = anchor ? document.getElementById(anchor) : null;
    const headings = [...content.querySelectorAll<HTMLElement>("h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]")];
    const nextHeading = heading ? headings[headings.indexOf(heading) + 1] : headings[0];
    const range = document.createRange();
    range.selectNodeContents(content);
    if (heading && content.contains(heading)) range.setStartBefore(heading);
    if (nextHeading && nextHeading !== heading) range.setEndBefore(nextHeading);
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node.textContent?.trim() || !range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
            return node.parentElement?.closest("svg,script,style,button,textarea,.mermaid,.header-anchor,[aria-hidden=true]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    const marks: HTMLElement[] = [];
    for (const node of nodes) {
        if (marks.length >= 200) break;
        const text = node.textContent || "";
        const matches = [...text.matchAll(pattern)];
        if (!matches.length) continue;
        const fragment = document.createDocumentFragment();
        let offset = 0;
        for (const match of matches) {
            fragment.append(document.createTextNode(text.slice(offset, match.index)));
            const mark = document.createElement("mark");
            mark.className = "search-reading-match"; mark.textContent = match[0];
            marks.push(mark); fragment.append(mark); offset = match.index! + match[0].length;
        }
        fragment.append(document.createTextNode(text.slice(offset))); node.replaceWith(fragment);
    }
    const hint = document.createElement("aside");
    hint.className = "search-reading-hint"; hint.setAttribute("aria-label", "搜索定位提示");
    const label = document.createElement("span");
    label.textContent = "搜索定位 · “" + query + "”";
    const back = document.createElement("a");
    const url = new URL(document.querySelector<HTMLElement>(".reading-tools")?.dataset.searchUrl || "../../search/", location.href);
    url.searchParams.set("keyword", query); back.href = url.href; back.textContent = "返回搜索";
    const clear = document.createElement("button");
    clear.type = "button"; clear.textContent = "×"; clear.setAttribute("aria-label", "清除搜索高亮");
    clear.addEventListener("click", () => {
        for (const mark of marks) mark.replaceWith(...mark.childNodes);
        hint.remove();
        const clean = new URL(location.href); clean.searchParams.delete("find"); history.replaceState(null, "", clean);
    });
    hint.append(label, back, clear); content.closest(".main-article")!.before(hint);
    const destination = heading || marks[0];
    if (destination) requestAnimationFrame(() => destination.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior }));
}
