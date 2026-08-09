interface RuntimeClientModule {
    initialized: boolean;
    bindAll: () => void;
}

interface RuntimeRepeatsModule extends RuntimeClientModule {}

function asInt(value: any, fallback: number): number {
    const parsed = Number.parseInt(String(value == null ? '' : value), 10);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return parsed;
}

function updateButtons(control: Element, rowsHost: Element, minItems: number, maxItems: number): void {
    const add = control.querySelector('[data-repeat-add]');
    const removeButtons = rowsHost.querySelectorAll('[data-repeat-remove]');
    const count = rowsHost.querySelectorAll(':scope > .runtime-repeat-row').length;

    if (add) {
        (add as HTMLButtonElement).disabled = maxItems > 0 && count >= maxItems;
    }

    for (let i = 0; i < removeButtons.length; i += 1) {
        (removeButtons[i] as HTMLButtonElement).disabled = count <= minItems;
    }
}

function createRemoveButton(rowsHost: Element): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'runtime-repeat-remove';
    button.setAttribute('data-repeat-remove', '');
    button.textContent = 'Remove';
    button.addEventListener('click', () => {
        const row = button.closest('.runtime-repeat-row');
        if (row && rowsHost.contains(row)) {
            row.remove();
            rowsHost.dispatchEvent(new CustomEvent('repeat:rows-changed'));
        }
    });
    return button;
}

function buildRowFromTemplate(template: Element, rowsHost: Element): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'runtime-repeat-row';

    const actions = document.createElement('div');
    actions.className = 'runtime-repeat-row-actions';
    actions.appendChild(createRemoveButton(rowsHost));
    row.appendChild(actions);

    const body = document.createElement('div');
    body.className = 'runtime-repeat-row-body';
    body.innerHTML = template.innerHTML;
    row.appendChild(body);

    return row;
}

function wireRepeatControl(control: HTMLElement): void {
    if (!control || control.dataset.repeatBound === 'true') {
        return;
    }

    const template = control.querySelector(':scope > .resolved-children[data-repeat-template]');
    if (!template) {
        control.dataset.repeatBound = 'true';
        return;
    }

    const minItems = Math.max(0, asInt(control.getAttribute('data-repeat-min-items'), 0));
    let maxItems = Math.max(0, asInt(control.getAttribute('data-repeat-max-items'), 0));
    if (maxItems > 0 && maxItems < minItems) {
        maxItems = minItems;
    }

    const rowsHost = document.createElement('div');
    rowsHost.className = 'runtime-repeat-rows';
    template.insertAdjacentElement('afterend', rowsHost);
    template.setAttribute('hidden', 'hidden');

    const add = control.querySelector('[data-repeat-add]');
    if (add) {
        add.addEventListener('click', () => {
            const count = rowsHost.querySelectorAll(':scope > .runtime-repeat-row').length;
            if (maxItems > 0 && count >= maxItems) {
                return;
            }
            rowsHost.appendChild(buildRowFromTemplate(template, rowsHost));
            rowsHost.dispatchEvent(new CustomEvent('repeat:rows-changed'));
        });
    }

    rowsHost.addEventListener('repeat:rows-changed', () => {
        updateButtons(control, rowsHost, minItems, maxItems);
    });

    const initialRows = Math.max(1, minItems);
    for (let i = 0; i < initialRows; i += 1) {
        rowsHost.appendChild(buildRowFromTemplate(template, rowsHost));
    }
    updateButtons(control, rowsHost, minItems, maxItems);

    control.dataset.repeatBound = 'true';
}

export function bindAll(): void {
    const controls = document.querySelectorAll('.resolved-control.widget-repeat');
    for (let i = 0; i < controls.length; i += 1) {
        wireRepeatControl(controls[i] as HTMLElement);
    }
}

export function init(): RuntimeRepeatsModule {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAll);
    } else {
        bindAll();
    }

    document.addEventListener('htmx:afterSwap', bindAll);

    return {
        initialized: true,
        bindAll
    };
}