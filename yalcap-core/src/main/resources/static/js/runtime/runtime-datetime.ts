interface RuntimeDateTimeModule {
    wireAll: () => void;
}

function toLocalDateTimeValue(rawValue: any): string {
    const text = String(rawValue == null ? '' : rawValue).trim();
    if (!text) {
        return '';
    }

    const targetFormatter = (date: Date): string => {
        const year = String(date.getFullYear()).padStart(4, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
    };

    if (text.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(text)) {
        const zoned = new Date(text);
        if (!Number.isNaN(zoned.getTime())) {
            return targetFormatter(zoned);
        }
    }

    const localDate = new Date(text);
    if (!Number.isNaN(localDate.getTime())) {
        return targetFormatter(localDate);
    }

    return text;
}

function wireDateTimeInputs(root: Document | Element | null | undefined): void {
    const scope = root && (root as any).querySelectorAll ? root : document;
    const inputs = (scope as any).querySelectorAll('input[type="datetime-local"][data-datetime-value]');
    for (let i = 0; i < inputs.length; i += 1) {
        const input = inputs[i] as HTMLInputElement;
        if (input.dataset.runtimeDatetimeBound === 'true') {
            continue;
        }
        input.dataset.runtimeDatetimeBound = 'true';

        const rawValue = input.getAttribute('data-datetime-value') || input.dataset.datetimeValue || '';
        const localValue = toLocalDateTimeValue(rawValue);
        if (localValue) {
            input.value = localValue;
        }
    }
}

function onReady(): void {
    wireDateTimeInputs(document);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
} else {
    onReady();
}

document.addEventListener('htmx:load', (event: Event) => {
    const htmxEvent = event as CustomEvent;
    wireDateTimeInputs(htmxEvent.detail && htmxEvent.detail.elt ? htmxEvent.detail.elt : document);
});

(window as any).runtimeDateTime = {
    wireAll: () => {
        wireDateTimeInputs(document);
    }
} as RuntimeDateTimeModule;
