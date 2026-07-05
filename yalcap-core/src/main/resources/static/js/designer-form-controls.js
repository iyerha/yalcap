(function () {
    window.formDesignerControls = {
        isOptionWidget(widget) {
            return widget === 'select' || widget === 'radio' || widget === 'checkbox';
        },

        isImageWidget(widget) {
            return widget === 'image';
        },

        isTableWidget(widget) {
            return widget === 'table';
        },

        isUploadWidget(widget) {
            return widget === 'upload';
        },

        isSectionWidget(widget) {
            return widget === 'section';
        },

        isGroupWidget(widget) {
            return widget === 'group';
        },

        slugify(value) {
            return (value || '')
                .toString()
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '') || 'value';
        },

        toIdentifier(value) {
            const raw = (value || '').toString().trim();
            const tokens = raw
                .replace(/[^A-Za-z0-9_$]+/g, ' ')
                .trim()
                .split(/\s+/)
                .filter(Boolean);

            if (tokens.length === 0) {
                return 'field';
            }

            let name = tokens[0].toLowerCase();
            for (let i = 1; i < tokens.length; i += 1) {
                const token = tokens[i].toLowerCase();
                name += token.charAt(0).toUpperCase() + token.slice(1);
            }

            name = name.replace(/[^A-Za-z0-9_$]/g, '');
            if (!/^[A-Za-z_$]/.test(name)) {
                name = `field${name.charAt(0).toUpperCase()}${name.slice(1)}`;
            }

            return name || 'field';
        },

        isJsSafeIdentifier(value) {
            return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test((value || '').trim());
        },

        optionPairsFromRaw(optionsRaw) {
            if (!optionsRaw) {
                return [];
            }

            return optionsRaw
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean)
                .map((entry) => {
                    const eqIndex = entry.indexOf('=');
                    if (eqIndex === -1) {
                        return { label: entry, value: entry, autoValue: false };
                    }
                    return {
                        label: entry.substring(0, eqIndex).trim(),
                        value: entry.substring(eqIndex + 1).trim(),
                        autoValue: false
                    };
                });
        },

        ensureOptionsArray(control) {
            if (!control) {
                return;
            }
            if (Array.isArray(control.options)) {
                return;
            }
            control.options = this.optionPairsFromRaw(control.optionsRaw);
            delete control.optionsRaw;
        },

        createDefaultOptions() {
            return [
                { label: 'Option 1', value: 'option_1', autoValue: true },
                { label: 'Option 2', value: 'option_2', autoValue: true }
            ];
        },

        normalizeControl(control) {
            if (!control) {
                return control;
            }

            const normalized = { ...control };
            this.ensureOptionsArray(normalized);
            if (!Array.isArray(normalized.options)) {
                normalized.options = [];
            }

            normalized.nameManual = normalized.nameManual === true;
            normalized.name = this.toIdentifier(normalized.name || normalized.label || 'field');

            normalized.colSpan = Number(normalized.colSpan) || 12;
            if (normalized.colSpan < 1) {
                normalized.colSpan = 1;
            }
            if (normalized.colSpan > 12) {
                normalized.colSpan = 12;
            }

            if (!this.isOptionWidget(normalized.widget)) {
                normalized.options = [];
            }

            if (normalized.widget === 'checkbox') {
                normalized.type = 'array';
                normalized.placeholder = '';
                if (normalized.options.length === 0) {
                    normalized.options = this.createDefaultOptions();
                }
            }

            if (normalized.widget === 'select' || normalized.widget === 'radio') {
                if (normalized.type !== 'number') {
                    normalized.type = 'string';
                }
                if (normalized.options.length === 0) {
                    normalized.options = this.createDefaultOptions();
                }
            }

            if (normalized.widget === 'text' || normalized.widget === 'textarea') {
                normalized.type = 'string';
                normalized.options = [];
            }

            if (normalized.widget === 'number') {
                normalized.type = 'number';
                normalized.options = [];
            }

            if (normalized.widget === 'booleanCheckbox') {
                normalized.type = 'boolean';
                normalized.placeholder = '';
                normalized.options = [];
            }

            if (normalized.widget === 'image') {
                normalized.type = 'string';
                normalized.required = false;
                normalized.placeholder = '';
                normalized.options = [];
                normalized.assetKey = (normalized.assetKey || '').trim();
                normalized.assetVersion = Number(normalized.assetVersion) || 0;
                if (normalized.assetVersion < 0) {
                    normalized.assetVersion = 0;
                }
                normalized.assetHash = (normalized.assetHash || '').trim();
                normalized.altText = (normalized.altText || '').trim();
                normalized.objectFit = (normalized.objectFit || 'contain').trim() || 'contain';
                normalized.imageWidth = Number(normalized.imageWidth) || 0;
                normalized.imageHeight = Number(normalized.imageHeight) || 0;
            }

            if (normalized.widget === 'upload') {
                normalized.type = normalized.uploadAllowMultiple === true ? 'array' : 'string';
                normalized.placeholder = '';
                normalized.options = [];
                normalized.uploadAccept = (normalized.uploadAccept || '').trim();
                normalized.uploadAllowMultiple = normalized.uploadAllowMultiple === true;
                normalized.uploadMaxBytes = Number(normalized.uploadMaxBytes) || 0;
                if (normalized.uploadMaxBytes < 0) {
                    normalized.uploadMaxBytes = 0;
                }
            }

            if (normalized.widget === 'table') {
                normalized.type = 'array';
                normalized.placeholder = '';
                normalized.options = [];
                normalized.tableColumns = Array.isArray(normalized.tableColumns) ? normalized.tableColumns : [];
                if (normalized.tableColumns.length === 0) {
                    normalized.tableColumns = [
                        { key: 'column1', title: 'Column 1', type: 'string', required: false },
                        { key: 'column2', title: 'Column 2', type: 'string', required: false }
                    ];
                }
                normalized.tableColumns = normalized.tableColumns.map((col, idx) => ({
                    key: this.toIdentifier(col.key || `column${idx + 1}`),
                    title: (col.title || col.key || `Column ${idx + 1}`).trim(),
                    type: (col.type || 'string').trim(),
                    required: col.required === true
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
            }

            if (normalized.widget === 'section') {
                normalized.type = 'object';
                normalized.required = false;
                normalized.placeholder = '';
                normalized.options = [];
                normalized.children = Array.isArray(normalized.children) ? normalized.children : [];
                normalized.sectionDescription = (normalized.sectionDescription || '').trim();
                normalized.sectionCollapsible = normalized.sectionCollapsible === true;
                normalized.sectionDefaultExpanded = normalized.sectionDefaultExpanded !== false;
            }

            if (normalized.widget === 'group') {
                normalized.type = 'object';
                normalized.required = false;
                normalized.placeholder = '';
                normalized.options = [];
                normalized.children = Array.isArray(normalized.children) ? normalized.children : [];
                normalized.groupDescription = (normalized.groupDescription || '').trim();
            }

            normalized.options = normalized.options.map((opt) => ({
                label: (opt.label || '').trim(),
                value: (opt.value || '').trim(),
                autoValue: opt.autoValue !== false
            }));

            return normalized;
        },

        validateControl(control) {
            const errs = [];
            if (!control) {
                return errs;
            }

            if (!control.name || !control.name.trim()) {
                if (!this.isImageWidget(control.widget) && !this.isSectionWidget(control.widget)) {
                    errs.push('Name is required.');
                }
            }
            if (control.name && !this.isJsSafeIdentifier(control.name)) {
                errs.push('Name must be a JS-safe identifier (letters/digits/_/$ and not starting with a digit).');
            }
            if (!control.label || !control.label.trim()) {
                errs.push('Label is required.');
            }

            const normalized = this.normalizeControl(control);
            const options = Array.isArray(normalized.options) ? normalized.options : [];
            const needsOptions = this.isOptionWidget(normalized.widget);

            if (needsOptions && options.length === 0) {
                errs.push('Select, radio, and checkbox controls require at least one option.');
            }

            const malformed = options.filter((o) => !o.label || !o.value);
            if (malformed.length > 0) {
                errs.push('Each option must include both label and value.');
            }

            if (normalized.type === 'number' && options.length > 0) {
                const nonNumeric = options.filter((o) => Number.isNaN(Number(o.value)));
                if (nonNumeric.length > 0) {
                    errs.push('Number controls must have numeric option values only.');
                }
            }

            if (normalized.widget === 'checkbox' && normalized.type !== 'array') {
                errs.push('Checkbox widget must use array type.');
            }

            if (normalized.widget === 'table') {
                if (!normalized.name || !normalized.name.trim()) {
                    errs.push('Table control requires a field name for array data binding.');
                }

                if (!Array.isArray(normalized.tableColumns) || normalized.tableColumns.length === 0) {
                    errs.push('Table control requires at least one column.');
                } else {
                    const seen = new Set();
                    normalized.tableColumns.forEach((col) => {
                        if (!col.key || !this.isJsSafeIdentifier(col.key)) {
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

            if (normalized.widget === 'image') {
                if (!normalized.assetKey) {
                    errs.push('Image control requires asset key.');
                }
                if (normalized.assetVersion > 0 && !Number.isInteger(normalized.assetVersion)) {
                    errs.push('Image control asset version must be an integer when provided.');
                }
            }

            if (normalized.widget === 'upload') {
                if (!normalized.name || !normalized.name.trim()) {
                    errs.push('Upload control requires a field name.');
                }
                if (normalized.uploadMaxBytes < 0) {
                    errs.push('Upload max bytes must be 0 or greater.');
                }
            }

            if (normalized.widget === 'group' && (!normalized.name || !normalized.name.trim())) {
                errs.push('Group control requires a field name for object data binding.');
            }

            return errs;
        }
    };
})();
