// @ts-check
(function registerTableDesignerHooks(windowAny) {
    const host = /** @type {any} */ (windowAny);
    if (!host.designerControlHooks || typeof host.designerControlHooks !== 'object') {
        host.designerControlHooks = {};
    }

    /** @type {DesignerControlHooksApi} */
    const hooks = {
        /** @param {DesignerControl} control @param {DesignerCoreApi} api */
        normalize(control, api) {
            const normalized = { ...(control || {}) };

            normalized.type = 'array';
            normalized.placeholder = '';
            normalized.options = [];
            normalized.defaultValue = null;

            normalized.tableColumns = Array.isArray(normalized.tableColumns) ? normalized.tableColumns : [];
            if (normalized.tableColumns.length === 0) {
                normalized.tableColumns = [
                    { key: 'column1', title: 'Column 1', type: 'string', required: false, visible: true },
                    { key: 'column2', title: 'Column 2', type: 'string', required: false, visible: true }
                ];
            }

            const toIdentifier = api && typeof api.toIdentifier === 'function'
                ? api.toIdentifier.bind(api)
                : (v) => String(v || 'column').replace(/[^A-Za-z0-9_$]/g, '');

            normalized.tableColumns = normalized.tableColumns.map((col, idx) => ({
                key: toIdentifier(col.key || `column${idx + 1}`),
                title: (col.title || col.key || `Column ${idx + 1}`).trim(),
                type: (col.type || 'string').trim(),
                required: col.required === true,
                visible: col.visible !== false
            }));

            normalized.tableMinItems = Number(normalized.tableMinItems) || 0;
            if (normalized.tableMinItems < 0) {
                normalized.tableMinItems = 0;
            }
            normalized.tableMaxItems = Number(normalized.tableMaxItems) || 0;
            if (normalized.tableMaxItems < 0) {
                normalized.tableMaxItems = 0;
            }
            normalized.tableAllowAdd = normalized.tableAllowAdd !== false;
            normalized.tableAllowDelete = normalized.tableAllowDelete !== false;
            normalized.tableAllowReorder = normalized.tableAllowReorder === true;

            // Preserve current behavior: table is a designer convenience mapped to repeat semantics.
            normalized.repeatRenderer = normalized.repeatRenderer || 'table';
            normalized.repeatMinItems = Number(normalized.tableMinItems) || 0;
            normalized.repeatMaxItems = Number(normalized.tableMaxItems) || 0;
            normalized.repeatAllowAdd = normalized.tableAllowAdd !== false;
            normalized.repeatAllowDelete = normalized.tableAllowDelete !== false;
            normalized.repeatAllowReorder = normalized.tableAllowReorder === true;

            return normalized;
        },

        /** @param {DesignerControl} normalized @param {string[]} errs @param {DesignerCoreApi} api */
        validate(normalized, errs, api) {
            if (!normalized || !Array.isArray(errs)) {
                return;
            }

            if (!normalized.name || !normalized.name.trim()) {
                errs.push('Table control requires a field name for array data binding.');
            }

            if (!Array.isArray(normalized.tableColumns) || normalized.tableColumns.length === 0) {
                errs.push('Table control requires at least one column.');
            } else {
                const seen = new Set();
                const isJsSafeIdentifier = api && typeof api.isJsSafeIdentifier === 'function'
                    ? api.isJsSafeIdentifier.bind(api)
                    : (value) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test((value || '').trim());

                normalized.tableColumns.forEach((col) => {
                    if (!col.key || !isJsSafeIdentifier(col.key)) {
                        errs.push('Each table column key must be a JS-safe identifier.');
                    }
                    if (!col.title || !col.title.trim()) {
                        errs.push('Each table column requires a title.');
                    }
                    if (seen.has(col.key)) {
                        errs.push('Table column keys must be unique.');
                    }
                    seen.add(col.key);
                });
            }

            if (normalized.tableMaxItems > 0 && normalized.tableMaxItems < normalized.tableMinItems) {
                errs.push('Table max rows must be greater than or equal to min rows.');
            }
        }
    };

    host.designerControlHooks.table = hooks;
}(window));
