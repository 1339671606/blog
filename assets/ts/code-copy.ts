const COPY_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const CHECK_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

function attachCopyButton(container: HTMLElement, getText: () => string) {
    if (container.querySelector(':scope > .copyCodeButton')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copyCodeButton';
    button.innerHTML = COPY_ICON;
    button.setAttribute('aria-label', '复制代码');
    button.title = '复制代码';

    let timer: number | undefined;
    button.addEventListener('click', () => {
        navigator.clipboard.writeText(getText())
            .then(() => {
                if (timer) window.clearTimeout(timer);
                button.classList.add('is-copied');
                button.innerHTML = CHECK_ICON;
                button.setAttribute('aria-label', '已复制');
                button.title = '已复制';

                timer = window.setTimeout(() => {
                    button.classList.remove('is-copied');
                    button.innerHTML = COPY_ICON;
                    button.setAttribute('aria-label', '复制代码');
                    button.title = '复制代码';
                    timer = undefined;
                }, 1000);
            })
            .catch(err => console.error('Copy failed:', err));
    });

    container.appendChild(button);
}

export function setupCodeCopy() {
    if (!navigator.clipboard) {
        console.warn('Clipboard API not supported, copy button will not work.');
        return;
    }

    document.querySelectorAll<HTMLElement>('.article-content div.highlight').forEach(highlight => {
        const codeBlock = highlight.querySelector('code[data-lang]') || highlight.querySelector('code');
        if (!codeBlock) return;
        attachCopyButton(highlight, () => codeBlock.textContent ?? '');
    });

    document.querySelectorAll<HTMLPreElement>('.article-content pre:not(.mermaid)').forEach(pre => {
        if (pre.closest('.highlight, .codeblock-plain')) return;
        const code = pre.querySelector('code');
        const source = (code?.textContent ?? pre.textContent ?? '').trim();
        if (!source) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'codeblock-plain';
        pre.parentNode!.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        attachCopyButton(wrapper, () => code?.textContent ?? pre.textContent ?? '');
    });
}
