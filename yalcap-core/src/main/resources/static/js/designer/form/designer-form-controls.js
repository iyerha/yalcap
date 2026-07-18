// @ts-check
(function () {
    const windowAny = /** @type {any} */ (window);

    windowAny.formDesignerControls = {
        isOptionWidget(widget) {
            return widget === 'select' || widget === 'autocomplete' || widget === 'radio' || widget === 'checkbox';
        },

        isTemporalWidget(widget) {
            return widget === 'date' || widget === 'datetime';
        },

        isImageWidget(widget) {
            return widget === 'image';
        },

        isTableWidget(widget) {
            return widget === 'table';
        },

        isRepeatWidget(widget) {
            return widget === 'repeat';
        },

        isUploadWidget(widget) {
            return widget === 'upload';
        },

        isMessageWidget(widget) {
            return widget === 'message';
        },

        isButtonWidget(widget) {
            return widget === 'button';
        },

        templatePattern: /{{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*}}/g,

        supportsDefaultValue(widget) {
            return widget === 'text'
                || widget === 'textarea'
                || widget === 'number'
                || widget === 'date'
                || widget === 'datetime'
                || widget === 'select'
                || widget === 'autocomplete'
                || widget === 'radio'
                || widget === 'checkbox'
                || widget === 'booleanCheckbox'
                || widget === 'upload';
        },

        hasExplicitDefaultValue(control) {
            if (!control || !this.supportsDefaultValue(control.widget)) {
                return false;
            }

            if (control.widget === 'booleanCheckbox') {
                return control.defaultValue === true;
            }

            if (control.widget === 'checkbox') {
                return Array.isArray(control.defaultValue) && control.defaultValue.length > 0;
            }

            if (control.widget === 'upload' && control.uploadAllowMultiple === true) {
                return Array.isArray(control.defaultValue) && control.defaultValue.length > 0;
            }

            return control.defaultValue !== null && control.defaultValue !== undefined && control.defaultValue !== '';
        },

        escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        collectStateKeyMap(controls = this.controls, map = new Map()) {
            if (!Array.isArray(controls)) {
                return map;
            }

            controls.forEach((control) => {
                if (!control) {
                    return;
                }

                const key = (control.stateKey || '').trim();
                if (key) {
                    map.set(key, control);
                }

                if (Array.isArray(control.children) && control.children.length > 0) {
                    this.collectStateKeyMap(control.children, map);
                }
            });

            return map;
        },

        templateValuesFromControls(controls = this.controls) {
            const values = {};
            const map = this.collectStateKeyMap(controls);

            map.forEach((control, key) => {
                if (control.widget === 'booleanCheckbox') {
                    values[key] = control.defaultValue === true ? 'true' : 'false';
                    return;
                }

                if (control.widget === 'checkbox') {
                    values[key] = Array.isArray(control.defaultValue) ? control.defaultValue.join(', ') : '';
                    return;
                }

                if (control.widget === 'upload' && control.uploadAllowMultiple === true) {
                    values[key] = Array.isArray(control.defaultValue) ? control.defaultValue.join(', ') : '';
                    return;
                }

                if (control.defaultValue === null || control.defaultValue === undefined) {
                    values[key] = '';
                    return;
                }

                values[key] = String(control.defaultValue);
            });

            return values;
        },

        interpolateTemplateText(value, contextValues = null) {
            const raw = String(value || '');
            const values = contextValues || this.templateValuesFromControls();

            return raw.replace(this.templatePattern, (_, key) => {
                if (!Object.prototype.hasOwnProperty.call(values, key)) {
                    return '';
                }
                return String(values[key]);
            });
        },

        collectTemplateKeys(value) {
            const raw = String(value || '');
            const keys = new Set();
            raw.replace(this.templatePattern, (_, key) => {
                keys.add(key);
                return '';
            });
            return keys;
        },

        validateTemplateKeys(value, fieldLabel, knownKeys, errs) {
            const keys = this.collectTemplateKeys(value);
            if (keys.size === 0) {
                return;
            }

            const unknownKeys = [];
            keys.forEach((key) => {
                if (!knownKeys.has(key)) {
                    unknownKeys.push(key);
                }
            });

            if (unknownKeys.length > 0) {
                errs.push(`${fieldLabel} references unknown template key(s): ${unknownKeys.join(', ')}.`);
            }
        },

        safeUrl(url) {
            const raw = (url || '').trim();
            if (!raw) {
                return '#';
            }
            const lowered = raw.toLowerCase();
            if (lowered.startsWith('javascript:') || lowered.startsWith('data:')) {
                return '#';
            }
            if (lowered.startsWith('http://') || lowered.startsWith('https://') || lowered.startsWith('mailto:') || lowered.startsWith('tel:') || lowered.startsWith('/')) {
                return raw;
            }
            return '#';
        },

        markdownToSafeHtml(markdown) {
            const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
            const out = [];
            let listType = null;

            const applyInline = (line) => {
                let html = this.escapeHtml(line);
                html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
                html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
                    const safe = this.escapeHtml(this.safeUrl(url));
                    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
                });
                return html;
            };

            const closeListIfNeeded = () => {
                if (listType === 'ul') {
                    out.push('</ul>');
                    listType = null;
                } else if (listType === 'ol') {
                    out.push('</ol>');
                    listType = null;
                }
            };

            lines.forEach((rawLine) => {
                const line = rawLine.trim();
                if (!line) {
                    closeListIfNeeded();
                    return;
                }

                const heading = /^(#{1,3})\s+(.+)$/.exec(line);
                if (heading) {
                    closeListIfNeeded();
                    const level = heading[1].length;
                    out.push(`<h${level}>${applyInline(heading[2])}</h${level}>`);
                    return;
                }

                const bullet = /^[-*]\s+(.+)$/.exec(line);
                if (bullet) {
                    if (listType !== 'ul') {
                        closeListIfNeeded();
                        out.push('<ul>');
                        listType = 'ul';
                    }
                    out.push(`<li>${applyInline(bullet[1])}</li>`);
                    return;
                }

                const ordered = /^\d+\.\s+(.+)$/.exec(line);
                if (ordered) {
                    if (listType !== 'ol') {
                        closeListIfNeeded();
                        out.push('<ol>');
                        listType = 'ol';
                    }
                    out.push(`<li>${applyInline(ordered[1])}</li>`);
                    return;
                }

                closeListIfNeeded();
                out.push(`<p>${applyInline(line)}</p>`);
            });

            closeListIfNeeded();
            return out.join('');
        },

        renderMessageBody(control) {
            if (!control) {
                return '';
            }
            return this.renderRichText(control.messageBody || '', control.messageFormat || 'markdown');
        },

        renderRichText(value, format, contextValues = null) {
            const normalizedFormat = (format || 'markdown').trim() || 'markdown';
            const interpolatedValue = this.interpolateTemplateText(value, contextValues);
            if (normalizedFormat === 'text') {
                return this.escapeHtml(interpolatedValue || '').replace(/\n/g, '<br/>');
            }
            return this.markdownToSafeHtml(interpolatedValue || '');
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

        isStateKey(value) {
            return /^[A-Za-z][A-Za-z0-9_.-]*$/.test((value || '').trim());
        },

        countStateKeyUsage(stateKey, excludeControlId = null, controls = this.controls) {
            const target = (stateKey || '').trim().toLowerCase();
            if (!target || !Array.isArray(controls)) {
                return 0;
            }

            let count = 0;
            const walk = (items) => {
                items.forEach((item) => {
                    if (!item) {
                        return;
                    }
                    const itemKey = (item.stateKey || '').trim().toLowerCase();
                    if (itemKey === target && (!excludeControlId || item.id !== excludeControlId)) {
                        count += 1;
                    }
                    if (Array.isArray(item.children) && item.children.length > 0) {
                        walk(item.children);
                    }
                });
            };

            walk(controls);
            return count;
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
            normalized.stateKey = (normalized.stateKey || '').trim();
            normalized.visible = normalized.visible !== false;
            normalized.enabled = normalized.enabled !== false;
            normalized.validationMessage = (normalized.validationMessage || '').trim();
            normalized.hint = (normalized.hint || '').trim();
            normalized.hintFormat = (normalized.hintFormat || 'markdown').trim() || 'markdown';
            normalized.help = (normalized.help || '').trim();
            normalized.helpFormat = (normalized.helpFormat || 'markdown').trim() || 'markdown';
            normalized.defaultValue = normalized.defaultValue;

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

            const allowedRichTextFormats = new Set(['text', 'markdown']);
            if (!allowedRichTextFormats.has(normalized.hintFormat)) {
                normalized.hintFormat = 'text';
            }
            if (!allowedRichTextFormats.has(normalized.helpFormat)) {
                normalized.helpFormat = 'text';
            }

            if (normalized.widget === 'checkbox') {
                normalized.type = 'array';
                normalized.placeholder = '';
                if (normalized.options.length === 0) {
                    normalized.options = this.createDefaultOptions();
                }
                if (Array.isArray(normalized.defaultValue)) {
                    normalized.defaultValue = normalized.defaultValue.map((v) => String(v)).filter(Boolean);
                } else if (typeof normalized.defaultValue === 'string' && normalized.defaultValue.trim()) {
                    normalized.defaultValue = normalized.defaultValue
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean);
                } else {
                    normalized.defaultValue = [];
                }
            }

            if (normalized.widget === 'select' || normalized.widget === 'autocomplete' || normalized.widget === 'radio') {
                if (normalized.type !== 'number') {
                    normalized.type = 'string';
                }
                if (normalized.options.length === 0) {
                    normalized.options = this.createDefaultOptions();
                }
                if (normalized.defaultValue === null || normalized.defaultValue === undefined) {
                    normalized.defaultValue = '';
                } else {
                    normalized.defaultValue = String(normalized.defaultValue);
                }
            }

            if (normalized.widget === 'autocomplete') {
                normalized.autocompleteSourceType = (normalized.autocompleteSourceType || 'static').trim() || 'static';
                normalized.autocompleteSourceUrl = (normalized.autocompleteSourceUrl || '').trim();
                normalized.autocompleteLabelField = (normalized.autocompleteLabelField || 'label').trim() || 'label';
                normalized.autocompleteValueField = (normalized.autocompleteValueField || 'value').trim() || 'value';
                normalized.autocompleteSearchParam = (normalized.autocompleteSearchParam || 'q').trim() || 'q';

                if (normalized.autocompleteSourceType === 'remote') {
                    normalized.options = [];
                }
            }

            if (normalized.widget === 'date') {
                normalized.type = 'string';
                normalized.options = [];
                normalized.minDate = (normalized.minDate || '').trim();
                normalized.maxDate = (normalized.maxDate || '').trim();
                if (normalized.defaultValue === null || normalized.defaultValue === undefined) {
                    normalized.defaultValue = '';
                } else {
                    normalized.defaultValue = String(normalized.defaultValue).trim();
                }
            }

            if (normalized.widget === 'datetime') {
                normalized.type = 'string';
                normalized.options = [];
                normalized.minDateTime = (normalized.minDateTime || '').trim();
                normalized.maxDateTime = (normalized.maxDateTime || '').trim();
                if (normalized.defaultValue === null || normalized.defaultValue === undefined) {
                    normalized.defaultValue = '';
                } else {
                    normalized.defaultValue = String(normalized.defaultValue).trim();
                }
            }

            if (normalized.widget === 'text' || normalized.widget === 'textarea') {
                normalized.type = 'string';
                normalized.options = [];
                if (normalized.defaultValue === null || normalized.defaultValue === undefined) {
                    normalized.defaultValue = '';
                } else {
                    normalized.defaultValue = String(normalized.defaultValue);
                }
            }

            if (normalized.widget === 'number') {
                normalized.type = 'number';
                normalized.options = [];
                if (normalized.defaultValue === '' || normalized.defaultValue === null || normalized.defaultValue === undefined) {
                    normalized.defaultValue = null;
                } else {
                    const parsedDefault = Number(normalized.defaultValue);
                    normalized.defaultValue = Number.isFinite(parsedDefault) ? parsedDefault : null;
                }
            }

            if (normalized.widget === 'booleanCheckbox') {
                normalized.type = 'boolean';
                normalized.placeholder = '';
                normalized.options = [];
                normalized.defaultValue = normalized.defaultValue === true;
            }

            if (normalized.widget === 'image') {
                normalized.type = 'string';
                normalized.required = false;
                normalized.placeholder = '';
                normalized.options = [];
                normalized.defaultValue = null;
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

                if (normalized.uploadAllowMultiple === true) {
                    if (Array.isArray(normalized.defaultValue)) {
                        normalized.defaultValue = normalized.defaultValue.map((v) => String(v)).filter(Boolean);
                    } else if (typeof normalized.defaultValue === 'string' && normalized.defaultValue.trim()) {
                        normalized.defaultValue = normalized.defaultValue
                            .split(',')
                            .map((v) => v.trim())
                            .filter(Boolean);
                    } else {
                        normalized.defaultValue = [];
                    }
                } else if (normalized.defaultValue === null || normalized.defaultValue === undefined) {
                    normalized.defaultValue = '';
                } else {
                    normalized.defaultValue = String(normalized.defaultValue);
                }
            }

            if (normalized.widget === 'message') {
                normalized.type = 'null';
                normalized.required = false;
                normalized.placeholder = '';
                normalized.options = [];
                normalized.name = '';
                normalized.nameManual = false;
                normalized.defaultValue = null;
                normalized.messageTone = (normalized.messageTone || 'info').trim() || 'info';
                normalized.messageTitle = (normalized.messageTitle || '').trim();
                normalized.messageBody = (normalized.messageBody || '').trim();
                normalized.messageFormat = (normalized.messageFormat || 'markdown').trim() || 'markdown';

                const allowedTones = new Set(['info', 'warning', 'error', 'success']);
                if (!allowedTones.has(normalized.messageTone)) {
                    normalized.messageTone = 'info';
                }

                const allowedFormats = new Set(['text', 'markdown']);
                if (!allowedFormats.has(normalized.messageFormat)) {
                    normalized.messageFormat = 'text';
                }
            }

            if (normalized.widget === 'button') {
                normalized.type = 'null';
                normalized.required = false;
                normalized.placeholder = '';
                normalized.options = [];
                normalized.name = '';
                normalized.nameManual = false;
                normalized.defaultValue = null;
                normalized.buttonVariant = (normalized.buttonVariant || 'primary').trim() || 'primary';
                normalized.buttonActionType = (normalized.buttonActionType || 'customEvent').trim() || 'customEvent';
                normalized.buttonActionTarget = (normalized.buttonActionTarget || '').trim();
                normalized.buttonPayload = (normalized.buttonPayload || '').trim();
                normalized.buttonConfirmMessage = (normalized.buttonConfirmMessage || '').trim();

                const allowedVariants = new Set(['primary', 'secondary', 'danger', 'link']);
                if (!allowedVariants.has(normalized.buttonVariant)) {
                    normalized.buttonVariant = 'primary';
                }

                const allowedActions = new Set(['customEvent', 'submit', 'reset', 'navigate', 'invokeWorkflowAction']);
                if (!allowedActions.has(normalized.buttonActionType)) {
                    normalized.buttonActionType = 'customEvent';
                }
            }

            if (!normalized.stateKey) {
                const seed = normalized.name || normalized.label || '';
                normalized.stateKey = this.slugify(seed);
            }

            if (normalized.widget === 'repeat') {
                normalized.type = 'array';
                normalized.placeholder = '';
                normalized.options = [];
                normalized.defaultValue = null;
                normalized.children = Array.isArray(normalized.children) ? normalized.children : [];
                normalized.repeatRenderer = (normalized.repeatRenderer || 'table').trim() || 'table';
                normalized.repeatMinItems = Number(normalized.repeatMinItems) || 0;
                if (normalized.repeatMinItems < 0) {
                    normalized.repeatMinItems = 0;
                }
                normalized.repeatMaxItems = Number(normalized.repeatMaxItems) || 0;
                if (normalized.repeatMaxItems < 0) {
                    normalized.repeatMaxItems = 0;
                }
                normalized.repeatAllowAdd = normalized.repeatAllowAdd !== false;
                normalized.repeatAllowDelete = normalized.repeatAllowDelete !== false;
                normalized.repeatAllowReorder = normalized.repeatAllowReorder === true;
            }

            if (normalized.widget === 'table') {
                normalized.type = 'array';
                normalized.placeholder = '';
                normalized.options = [];
                normalized.defaultValue = null;
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

                // Keep table editable but map to repeat semantics during schema generation.
                normalized.repeatRenderer = normalized.repeatRenderer || 'table';
                normalized.repeatMinItems = Number(normalized.tableMinItems) || 0;
                normalized.repeatMaxItems = Number(normalized.tableMaxItems) || 0;
                normalized.repeatAllowAdd = normalized.tableAllowAdd !== false;
                normalized.repeatAllowDelete = normalized.tableAllowDelete !== false;
                normalized.repeatAllowReorder = normalized.tableAllowReorder === true;
            }

            if (normalized.widget === 'section') {
                normalized.type = 'object';
                normalized.required = false;
                normalized.placeholder = '';
                normalized.options = [];
                normalized.defaultValue = null;
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
                normalized.defaultValue = null;
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

            const knownKeys = new Set();
            this.collectStateKeyMap(this.controls).forEach((_, key) => knownKeys.add(key));

            if (!control.name || !control.name.trim()) {
                if (!this.isImageWidget(control.widget) && !this.isSectionWidget(control.widget) && !this.isMessageWidget(control.widget) && !this.isButtonWidget(control.widget)) {
                    errs.push('Name is required.');
                }
            }
            if (control.name && !this.isMessageWidget(control.widget) && !this.isButtonWidget(control.widget) && !this.isJsSafeIdentifier(control.name)) {
                errs.push('Name must be a JS-safe identifier (letters/digits/_/$ and not starting with a digit).');
            }
            if (control.stateKey && !this.isStateKey(control.stateKey)) {
                errs.push('State key must start with a letter and only include letters, digits, dot, underscore, or hyphen.');
            }
            if (!control.label || !control.label.trim()) {
                errs.push('Label is required.');
            }

            const normalized = this.normalizeControl(control);
            if (normalized.stateKey && this.countStateKeyUsage(normalized.stateKey, normalized.id || null) > 0) {
                errs.push('State key must be unique across all controls.');
            }
            const options = Array.isArray(normalized.options) ? normalized.options : [];
            const needsOptions = this.isOptionWidget(normalized.widget);

            if (normalized.widget === 'autocomplete' && normalized.autocompleteSourceType === 'remote') {
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

            if (needsOptions && options.length === 0 && !(normalized.widget === 'autocomplete' && normalized.autocompleteSourceType === 'remote')) {
                errs.push('Select, autocomplete, radio, and checkbox controls require at least one option.');
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

            if (normalized.widget === 'checkbox') {
                const allowedValues = new Set(options.map((o) => o.value));
                const defaults = Array.isArray(normalized.defaultValue) ? normalized.defaultValue : [];
                const invalidDefaults = defaults.filter((v) => !allowedValues.has(String(v)));
                if (invalidDefaults.length > 0) {
                    errs.push('Checkbox default values must exist in option values.');
                }
            }

            if (normalized.widget === 'select' || normalized.widget === 'autocomplete' || normalized.widget === 'radio') {
                if (normalized.defaultValue) {
                    const allowedValues = new Set(options.map((o) => o.value));
                    if (!allowedValues.has(String(normalized.defaultValue))) {
                        errs.push('Default value must exist in option values.');
                    }
                }
            }

            if (normalized.widget === 'date') {
                if (normalized.minDate && Number.isNaN(Date.parse(`${normalized.minDate}T00:00:00`))) {
                    errs.push('Date minimum must be a valid ISO date (YYYY-MM-DD).');
                }
                if (normalized.maxDate && Number.isNaN(Date.parse(`${normalized.maxDate}T00:00:00`))) {
                    errs.push('Date maximum must be a valid ISO date (YYYY-MM-DD).');
                }
                if (normalized.minDate && normalized.maxDate && normalized.maxDate < normalized.minDate) {
                    errs.push('Date maximum must be greater than or equal to minimum.');
                }
                if (normalized.defaultValue && Number.isNaN(Date.parse(`${normalized.defaultValue}T00:00:00`))) {
                    errs.push('Date default value must be a valid ISO date (YYYY-MM-DD).');
                }
                if (normalized.defaultValue && normalized.minDate && normalized.defaultValue < normalized.minDate) {
                    errs.push('Date default value must be greater than or equal to minimum.');
                }
                if (normalized.defaultValue && normalized.maxDate && normalized.defaultValue > normalized.maxDate) {
                    errs.push('Date default value must be less than or equal to maximum.');
                }
            }

            if (normalized.widget === 'datetime') {
                if (normalized.minDateTime && Number.isNaN(Date.parse(normalized.minDateTime))) {
                    errs.push('Date & time minimum must be a valid ISO local datetime.');
                }
                if (normalized.maxDateTime && Number.isNaN(Date.parse(normalized.maxDateTime))) {
                    errs.push('Date & time maximum must be a valid ISO local datetime.');
                }
                if (normalized.minDateTime && normalized.maxDateTime && normalized.maxDateTime < normalized.minDateTime) {
                    errs.push('Date & time maximum must be greater than or equal to minimum.');
                }
                if (normalized.defaultValue && Number.isNaN(Date.parse(normalized.defaultValue))) {
                    errs.push('Date & time default value must be a valid ISO local datetime.');
                }
                if (normalized.defaultValue && normalized.minDateTime && normalized.defaultValue < normalized.minDateTime) {
                    errs.push('Date & time default value must be greater than or equal to minimum.');
                }
                if (normalized.defaultValue && normalized.maxDateTime && normalized.defaultValue > normalized.maxDateTime) {
                    errs.push('Date & time default value must be less than or equal to maximum.');
                }
            }

            if (normalized.widget === 'number' && normalized.defaultValue !== null && normalized.defaultValue !== undefined) {
                if (!Number.isFinite(Number(normalized.defaultValue))) {
                    errs.push('Number default value must be numeric.');
                }
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
                if (normalized.uploadAllowMultiple === true && normalized.defaultValue && !Array.isArray(normalized.defaultValue)) {
                    errs.push('Upload default value must be an array when multiple is enabled.');
                }
                if (normalized.uploadAllowMultiple !== true && Array.isArray(normalized.defaultValue)) {
                    errs.push('Upload default value must be a string when multiple is disabled.');
                }
            }

            if (normalized.widget === 'repeat') {
                if (!normalized.name || !normalized.name.trim()) {
                    errs.push('Repeat control requires a field name for array data binding.');
                }
                if (normalized.repeatMaxItems > 0 && normalized.repeatMaxItems < normalized.repeatMinItems) {
                    errs.push('Repeat max rows must be greater than or equal to min rows.');
                }
            }

            if (normalized.widget === 'group' && (!normalized.name || !normalized.name.trim())) {
                errs.push('Group control requires a field name for object data binding.');
            }

            if (normalized.widget === 'message') {
                if (!normalized.messageBody || !normalized.messageBody.trim()) {
                    errs.push('Message body is required.');
                }
                if (normalized.messageFormat !== 'text' && normalized.messageFormat !== 'markdown') {
                    errs.push('Message format must be text or markdown.');
                }
                this.validateTemplateKeys(normalized.messageBody, 'Message body', knownKeys, errs);
            }

            if (normalized.widget === 'button') {
                if (!normalized.label || !normalized.label.trim()) {
                    errs.push('Button label is required.');
                }
                if (normalized.buttonActionType === 'customEvent' && !normalized.buttonActionTarget) {
                    errs.push('Button customEvent action requires an event name target.');
                }
                if (normalized.buttonActionType === 'navigate' && !normalized.buttonActionTarget) {
                    errs.push('Button navigate action requires a target URL/path.');
                }
                if (normalized.buttonActionType === 'invokeWorkflowAction' && !normalized.buttonActionTarget) {
                    errs.push('Button invokeWorkflowAction requires an action key target.');
                }
            }

            if (normalized.hintFormat !== 'text' && normalized.hintFormat !== 'markdown') {
                errs.push('Hint format must be text or markdown.');
            }
            if (normalized.helpFormat !== 'text' && normalized.helpFormat !== 'markdown') {
                errs.push('Help format must be text or markdown.');
            }

            this.validateTemplateKeys(normalized.validationMessage, 'Validation message', knownKeys, errs);
            this.validateTemplateKeys(normalized.hint, 'Hint', knownKeys, errs);
            this.validateTemplateKeys(normalized.help, 'Help', knownKeys, errs);

            return errs;
        }
    };
})();
