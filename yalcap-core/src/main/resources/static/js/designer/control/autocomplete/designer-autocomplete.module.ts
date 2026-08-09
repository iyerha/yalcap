export interface AutocompleteHooks extends DesignerControlHooksApi {
    normalize(control: DesignerControl, api: DesignerCoreApi): DesignerControl;
    validate(normalized: DesignerControl, errs: string[]): void;
}

export const autocompleteHooks: AutocompleteHooks = {
    normalize(control: DesignerControl, api: DesignerCoreApi): DesignerControl {
        const normalized = { ...(control || {}) } as DesignerControl;

        normalized.autocompleteSourceType = (normalized.autocompleteSourceType || 'static').trim() || 'static';
        normalized.autocompleteSourceUrl = (normalized.autocompleteSourceUrl || '').trim();
        normalized.autocompleteLabelField = (normalized.autocompleteLabelField || 'label').trim() || 'label';
        normalized.autocompleteValueField = (normalized.autocompleteValueField || 'value').trim() || 'value';
        normalized.autocompleteSearchParam = (normalized.autocompleteSearchParam || 'q').trim() || 'q';

        if (normalized.autocompleteSourceType === 'remote') {
            normalized.options = [];
        }

        // Keep scalar select-like behavior in designer.
        if (normalized.defaultValue === null || normalized.defaultValue === undefined) {
            normalized.defaultValue = '';
        } else {
            normalized.defaultValue = String(normalized.defaultValue);
        }

        if (!Array.isArray(normalized.options)) {
            normalized.options = [];
        }

        // Static autocomplete still needs options if none supplied.
        if (normalized.autocompleteSourceType !== 'remote' && normalized.options.length === 0 && api && typeof api.createDefaultOptions === 'function') {
            normalized.options = api.createDefaultOptions();
        }

        return normalized;
    },

    validate(normalized: DesignerControl, errs: string[]): void {
        if (!normalized || !Array.isArray(errs)) {
            return;
        }

        if (normalized.autocompleteSourceType === 'remote') {
            if (!normalized.autocompleteSourceUrl) {
                errs.push('Autocomplete remote source requires a source URL.');
            }
            if (!normalized.autocompleteLabelField) {
                errs.push('Autocomplete remote source requires a label field.');
            }
            if (!normalized.autocompleteValueField) {
                errs.push('Autocomplete remote source requires a value field.');
            }
        }
    }
};

export function register(hooks?: Record<string, DesignerControlHooksApi>): void {
    const target = hooks || ((window as any).designerControlHooks ||= {}) as Record<string, DesignerControlHooksApi>;
    
    if (!target.autocomplete) {
        target.autocomplete = autocompleteHooks;
    }
}