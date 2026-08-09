interface AutocompleteItem {
    label: string;
    value: string;
}

function toItems(payload: any, labelField: string, valueField: string): AutocompleteItem[] {
    let list: any[] = [];
    if (Array.isArray(payload)) {
        list = payload;
    } else if (payload && Array.isArray(payload.items)) {
        list = payload.items;
    } else if (payload && Array.isArray(payload.results)) {
        list = payload.results;
    } else if (payload && Array.isArray(payload.data)) {
        list = payload.data;
    }

    const out: AutocompleteItem[] = [];
    for (let i = 0; i < list.length; i += 1) {
        const item = list[i];
        let label = '';
        let value = '';

        if (item == null) {
            continue;
        }

        if (typeof item === 'object') {
            label = String(item[labelField] == null ? '' : item[labelField]).trim();
            value = String(item[valueField] == null ? '' : item[valueField]).trim();
            if (!label && value) {
                label = value;
            }
            if (!value && label) {
                value = label;
            }
        } else {
            label = String(item).trim();
            value = label;
        }

        if (!label || !value) {
            continue;
        }

        out.push({ label: label, value: value });
    }

    return out;
}

function normalizeKey(value: any): string {
    return String(value == null ? '' : value).trim().toLowerCase();
}

function parseInteger(value: any, fallback: number): number {
    const parsed = Number.parseInt(String(value == null ? '' : value), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }
    return parsed;
}

function setState(input: HTMLInputElement | null, state: string): void {
    if (!input) {
        return;
    }
    input.setAttribute('data-autocomplete-state', state);
    const host = input.closest('.resolved-control');
    if (host) {
        host.setAttribute('data-autocomplete-state', state);
    }

    let spinnerNode: HTMLElement | null = null;
    const valueInputId = (input.dataset.autocompleteValueId || '').trim();
    if (valueInputId) {
        spinnerNode = document.querySelector('[data-autocomplete-spinner-for="' + valueInputId + '"]');
    }
    if (spinnerNode) {
        if (state === 'loading') {
            spinnerNode.classList.remove('hidden');
        } else {
            spinnerNode.classList.add('hidden');
        }
    }

    let statusNode: HTMLElement | null = null;
    if (valueInputId) {
        statusNode = document.querySelector('[data-autocomplete-status-for="' + valueInputId + '"]');
    }
    if (!statusNode) {
        return;
    }

    let message = '';
    if (state === 'loading') {
        message = 'Loading suggestions...';
    } else if (state === 'empty') {
        message = 'No matches found.';
    } else if (state === 'error') {
        message = 'Could not load suggestions.';
    }

    statusNode.textContent = message;
}

function escapeHtml(value: any): string {
    return String(value == null ? '' : value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function highlightLabel(label: any, query: any): string {
    const text = String(label == null ? '' : label);
    const q = String(query == null ? '' : query).trim();
    if (!q) {
        return escapeHtml(text);
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = q.toLowerCase();
    const start = lowerText.indexOf(lowerQuery);
    if (start < 0) {
        return escapeHtml(text);
    }

    const end = start + q.length;
    const before = escapeHtml(text.slice(0, start));
    const match = escapeHtml(text.slice(start, end));
    const after = escapeHtml(text.slice(end));
    return before + '<mark>' + match + '</mark>' + after;
}

function renderDatalist(datalist: HTMLDataListElement, items: AutocompleteItem[]): void {
    while (datalist.firstChild) {
        datalist.removeChild(datalist.firstChild);
    }

    for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        const option = document.createElement('option');
        option.value = item.label;
        option.setAttribute('data-submit-value', item.value);
        option.label = item.label;
        option.textContent = item.label;
        datalist.appendChild(option);
    }
}

function optionsFromDatalist(datalist: HTMLDataListElement | null): AutocompleteItem[] {
    if (!datalist) {
        return [];
    }

    const out: AutocompleteItem[] = [];
    const options = datalist.querySelectorAll('option');
    for (let i = 0; i < options.length; i += 1) {
        const option = options[i];
        const label = String(option.value || '').trim();
        const submitValue = String(option.getAttribute('data-submit-value') || option.value || '').trim();
        if (!label || !submitValue) {
            continue;
        }
        out.push({ label: label, value: submitValue });
    }

    return out;
}

function buildLookup(datalist: HTMLDataListElement | null): Record<string, string> {
    const lookup: Record<string, string> = {};
    if (!datalist) {
        return lookup;
    }

    const options = datalist.querySelectorAll('option');
    for (let i = 0; i < options.length; i += 1) {
        const option = options[i];
        const optionLabel = String(option.value || '').trim();
        const submitValue = String(option.getAttribute('data-submit-value') || option.value || '').trim();
        const key = normalizeKey(optionLabel);
        if (!key || !submitValue || Object.prototype.hasOwnProperty.call(lookup, key)) {
            continue;
        }
        lookup[key] = submitValue;
    }

    return lookup;
}

function syncHiddenValue(
    input: HTMLInputElement,
    hiddenInput: HTMLInputElement,
    datalist: HTMLDataListElement | null,
    allowFreeText: boolean
): void {
    if (!input || !hiddenInput) {
        return;
    }

    const typed = String(input.value || '').trim();
    if (!typed) {
        hiddenInput.value = '';
        input.removeAttribute('data-autocomplete-match');
        input.setCustomValidity('');
        return;
    }

    const lookup = buildLookup(datalist);
    const submitValue = lookup[normalizeKey(typed)] || '';
    if (submitValue) {
        hiddenInput.value = submitValue;
        input.setAttribute('data-autocomplete-match', 'true');
        input.setCustomValidity('');
        return;
    }

    if (allowFreeText) {
        hiddenInput.value = typed;
        input.setAttribute('data-autocomplete-match', 'free-text');
        input.setCustomValidity('');
        return;
    }

    hiddenInput.value = '';
    input.setAttribute('data-autocomplete-match', 'false');
    input.setCustomValidity('Select a value from suggestions.');
}

function wireAutocompleteInput(input: HTMLInputElement): void {
    if (!input || input.dataset.autocompleteBound === 'true') {
        return;
    }

    const sourceType = (input.dataset.autocompleteSourceType || 'static').trim().toLowerCase();
    const endpoint = (input.dataset.autocompleteSourceUrl || '').trim();
    const listId = (input.dataset.autocompleteListId || '').trim();
    const listboxId = (input.dataset.autocompleteListboxId || '').trim();
    const valueInputId = (input.dataset.autocompleteValueId || '').trim();
    const searchParam = (input.dataset.autocompleteSearchParam || 'q').trim() || 'q';
    const labelField = (input.dataset.autocompleteLabelField || 'label').trim() || 'label';
    const valueField = (input.dataset.autocompleteValueField || 'value').trim() || 'value';
    const minChars = parseInteger(input.dataset.autocompleteMinChars, 2);
    const maxResults = parseInteger(input.dataset.autocompleteMaxResults, 25);
    const allowFreeText = (input.dataset.autocompleteAllowFreeText || 'false').trim().toLowerCase() === 'true';
    const datalist = listId ? (document.getElementById(listId) as HTMLDataListElement) : null;
    const listbox = listboxId ? document.getElementById(listboxId) : null;
    const menu = valueInputId ? document.querySelector('[data-autocomplete-menu-for="' + valueInputId + '"]') : null;
    const hiddenInput = valueInputId ? (document.getElementById(valueInputId) as HTMLInputElement) : null;

    if (!datalist || !hiddenInput || !listbox || !menu) {
        input.dataset.autocompleteBound = 'true';
        return;
    }

    const staticItems = optionsFromDatalist(datalist);
    let visibleItems = staticItems.slice();
    let activeIndex = -1;

    function setExpanded(expanded: boolean): void {
        input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    function setActiveIndex(nextIndex: number): void {
        if (visibleItems.length === 0) {
            activeIndex = -1;
            input.removeAttribute('aria-activedescendant');
            return;
        }

        let idx = nextIndex;
        if (idx < 0) {
            idx = visibleItems.length - 1;
        }
        if (idx >= visibleItems.length) {
            idx = 0;
        }

        activeIndex = idx;
        const activeId = (listbox as HTMLElement).id + '-opt-' + String(activeIndex);
        input.setAttribute('aria-activedescendant', activeId);

        const options = (listbox as HTMLElement).querySelectorAll('[role="option"]');
        for (let i = 0; i < options.length; i += 1) {
            const selected = i === activeIndex;
            options[i].setAttribute('aria-selected', selected ? 'true' : 'false');
            options[i].classList.toggle('is-active', selected);
        }
    }

    function closeMenu(): void {
        (menu as HTMLElement).classList.add('hidden');
        setExpanded(false);
        activeIndex = -1;
        input.removeAttribute('aria-activedescendant');
    }

    function openMenu(): void {
        if (visibleItems.length === 0) {
            closeMenu();
            return;
        }
        (menu as HTMLElement).classList.remove('hidden');
        setExpanded(true);
    }

    function selectItem(item: AutocompleteItem): void {
        if (!item) {
            return;
        }

        input.value = item.label;
        (hiddenInput as HTMLInputElement).value = item.value;
        input.setAttribute('data-autocomplete-match', 'true');
        input.setCustomValidity('');
        setState(input, 'ready');
        closeMenu();
    }

    function renderListbox(items: AutocompleteItem[], query: string): void {
        visibleItems = Array.isArray(items) ? items.slice() : [];
        const box = listbox as HTMLElement;
        while (box.firstChild) {
            box.removeChild(box.firstChild);
        }

        for (let i = 0; i < visibleItems.length; i += 1) {
            const item = visibleItems[i];
            const option = document.createElement('li');
            option.id = box.id + '-opt-' + String(i);
            option.className = 'runtime-autocomplete-option';
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            option.setAttribute('data-submit-value', item.value);
            option.innerHTML = highlightLabel(item.label, query);
            option.addEventListener('mousedown', (event: MouseEvent) => {
                event.preventDefault();
                const submit = (event.currentTarget as HTMLElement).getAttribute('data-submit-value');
                for (let j = 0; j < visibleItems.length; j += 1) {
                    if (visibleItems[j].value === submit) {
                        selectItem(visibleItems[j]);
                        break;
                    }
                }
            });
            box.appendChild(option);
        }

        if (visibleItems.length > 0) {
            openMenu();
            setActiveIndex(0);
        } else {
            closeMenu();
        }
    }

    function filterStaticItems(query: string): AutocompleteItem[] {
        const q = normalizeKey(query);
        if (!q) {
            return staticItems.slice(0, maxResults);
        }

        const filtered: AutocompleteItem[] = [];
        for (let i = 0; i < staticItems.length; i += 1) {
            if (normalizeKey(staticItems[i].label).includes(q)) {
                filtered.push(staticItems[i]);
            }
            if (filtered.length >= maxResults) {
                break;
            }
        }
        return filtered;
    }

    syncHiddenValue(input, hiddenInput as HTMLInputElement, datalist, allowFreeText);
    setState(input, 'idle');

    if (sourceType !== 'remote') {
        input.addEventListener('input', () => {
            syncHiddenValue(input, hiddenInput as HTMLInputElement, datalist, allowFreeText);
            const query = String(input.value || '').trim();
            if (query.length < minChars) {
                closeMenu();
                setState(input, 'idle');
                return;
            }

            const filtered = filterStaticItems(query);
            renderListbox(filtered, query);
            setState(input, filtered.length > 0 ? 'ready' : 'empty');
        });
        input.addEventListener('focus', () => {
            syncHiddenValue(input, hiddenInput as HTMLInputElement, datalist, allowFreeText);
            const query = String(input.value || '').trim();
            if (query.length < minChars) {
                setState(input, 'idle');
                return;
            }

            const filtered = filterStaticItems(query);
            renderListbox(filtered, query);
            setState(input, filtered.length > 0 ? 'ready' : 'empty');
        });
        input.addEventListener('blur', () => {
            window.setTimeout(closeMenu, 120);
        });
        input.dataset.autocompleteBound = 'true';
        return;
    }

    if (!endpoint) {
        input.dataset.autocompleteBound = 'true';
        setState(input, 'error');
        return;
    }

    let timerId: number | null = null;
    let abortController: AbortController | null = null;
    let requestSequence = 0;

    function requestSuggestions(query: string): void {
        requestSequence += 1;
        const sequence = requestSequence;

        if (abortController) {
            abortController.abort();
        }

        abortController = new AbortController();
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set(searchParam, query);
        setState(input, 'loading');

        fetch(url.toString(), {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: abortController.signal
        })
            .then((response: Response) => {
                if (!response.ok) {
                    throw new Error('remote autocomplete request failed');
                }
                return response.json();
            })
            .then((payload: any) => {
                if (sequence !== requestSequence) {
                    return;
                }

                let items = toItems(payload, labelField, valueField);
                if (maxResults > 0 && items.length > maxResults) {
                    items = items.slice(0, maxResults);
                }

                renderDatalist(datalist as HTMLDataListElement, items);
                renderListbox(items, query);
                syncHiddenValue(input, hiddenInput as HTMLInputElement, datalist, allowFreeText);
                setState(input, items.length > 0 ? 'ready' : 'empty');
            })
            .catch((error: any) => {
                if (error && error.name === 'AbortError') {
                    return;
                }
                renderDatalist(datalist as HTMLDataListElement, []);
                renderListbox([], query);
                syncHiddenValue(input, hiddenInput as HTMLInputElement, datalist, allowFreeText);
                setState(input, 'error');
            });
    }

    function scheduleRequest(): void {
        if (timerId) {
            window.clearTimeout(timerId);
        }

        const query = (input.value || '').trim();
        syncHiddenValue(input, hiddenInput as HTMLInputElement, datalist, allowFreeText);

        if (query.length < minChars) {
            renderDatalist(datalist as HTMLDataListElement, []);
            renderListbox([], query);
            setState(input, 'idle');
            return;
        }

        timerId = window.setTimeout(() => {
            requestSuggestions(query);
        }, 180);
    }

    input.addEventListener('input', scheduleRequest);
    input.addEventListener('focus', scheduleRequest);
    input.addEventListener('blur', () => {
        window.setTimeout(closeMenu, 120);
    });
    input.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
            if (visibleItems.length === 0) {
                return;
            }
            event.preventDefault();
            openMenu();
            setActiveIndex(activeIndex + 1);
            return;
        }

        if (event.key === 'ArrowUp') {
            if (visibleItems.length === 0) {
                return;
            }
            event.preventDefault();
            openMenu();
            setActiveIndex(activeIndex - 1);
            return;
        }

        if (event.key === 'Enter') {
            if (visibleItems.length === 0 || activeIndex < 0 || activeIndex >= visibleItems.length) {
                return;
            }
            event.preventDefault();
            selectItem(visibleItems[activeIndex]);
            return;
        }

        if (event.key === 'Escape') {
            closeMenu();
            setState(input, 'idle');
        }
    });
    input.dataset.autocompleteBound = 'true';
}

export function bindAll(): void {
    const inputs = document.querySelectorAll('input[data-autocomplete-list-id]');
    for (let i = 0; i < inputs.length; i += 1) {
        wireAutocompleteInput(inputs[i] as HTMLInputElement);
    }
}

export function init(): RuntimeAutocompleteModule {
    const runtimeNamespace = (window as any).runtimeAutocomplete || (window as any).autocompleteRuntime;
    if (runtimeNamespace && runtimeNamespace.initialized) {
        return runtimeNamespace as RuntimeAutocompleteModule;
    }

    const runtimeAutocompleteModule: RuntimeAutocompleteModule = {
        initialized: true,
        bindAll: bindAll
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAll);
    } else {
        bindAll();
    }

    document.addEventListener('htmx:afterSwap', bindAll);

    return runtimeAutocompleteModule;
}