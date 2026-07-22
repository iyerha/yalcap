// @ts-check
(function registerAutocompleteDesignerHooks(windowAny) {
    const host = /** @type {any} */ (windowAny);
    if (!host.designerControlHooks || typeof host.designerControlHooks !== 'object') {
        host.designerControlHooks = {};
    }

    /** @type {DesignerControlHooksApi} */
    const hooks = {
        /** @param {DesignerControl} control @param {DesignerCoreApi} api */
        normalize(control, api) {
            const normalized = { ...(control || {}) };

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

        /** @param {DesignerControl} normalized @param {string[]} errs */
        validate(normalized, errs) {
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

    host.designerControlHooks.autocomplete = hooks;
}(window));
