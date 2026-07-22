// @ts-check
function formDesigner() {
    const windowAny = /** @type {any} */ (window);
    const controlsApi = windowAny.formDesignerControls || {};
    const schemaApi = windowAny.formDesignerSchema || {};
    const propertiesApi = windowAny.formDesignerProperties || {};
    const interactionsApi = windowAny.formDesignerInteractions || {};
    const rulesApi = windowAny.formDesignerRules || {};
    const definitionKeyEl = /** @type {HTMLInputElement | null} */ (document.getElementById('definitionKey'));

    return {
        definitionKey: definitionKeyEl ? definitionKeyEl.value : 'generated-definition',
        activePage: 'builder',
        menuCollapsed: false,
        paletteCollapsed: false,
        propertiesCollapsed: false,
        selectedTheme: 'default',
        previewViewport: 'desktop',
        customTheme: {
            accent: '#2563eb',
            bg: '#f7f8fa',
            surface: '#ffffff',
            text: '#1f2937'
        },
        validationDisplayMode: 'inline-summary',
        controlPalette: [
            { label: 'Text Input', widget: 'text', type: 'string' },
            { label: 'Number Input', widget: 'number', type: 'number' },
            { label: 'Textarea', widget: 'textarea', type: 'string' },
            { label: 'Date', widget: 'date', type: 'string' },
            { label: 'Date & Time', widget: 'datetime', type: 'string' },
            { label: 'Select', widget: 'select', type: 'string' },
            { label: 'Autocomplete', widget: 'autocomplete', type: 'string' },
            { label: 'Radio Group', widget: 'radio', type: 'string' },
            { label: 'Checkbox Group', widget: 'checkbox', type: 'array' },
            { label: 'Boolean Checkbox', widget: 'booleanCheckbox', type: 'boolean' },
            { label: 'Image', widget: 'image', type: 'string' },
            { label: 'File Upload', widget: 'upload', type: 'string' },
            { label: 'Button', widget: 'button', type: 'null' },
            { label: 'Message', widget: 'message', type: 'null' },
            { label: 'Repeat Group', widget: 'repeat', type: 'array' },
            { label: 'Table', widget: 'table', type: 'array' },
            { label: 'Section', widget: 'section', type: 'object' },
            { label: 'Group', widget: 'group', type: 'object' }
        ],
        controls: [],
        columnOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        selectedControlId: null,
        selectedControl: null,
        stateKeyEditEnabled: false,
        lastSelectedAt: 0,
        paletteSortable: null,
        canvasSortable: null,
        nestedSortables: null,
        sortableObserver: null,
        sortableCleanupBound: null,
        flatpickrInstances: null,
        tomSelectInstances: null,
        nextControlSeq: 1,
        resizingControlId: null,
        resizeStartX: 0,
        resizeStartSpan: 12,
        resizeGridElement: null,
        resizeMoveHandler: null,
        resizeUpHandler: null,
        resizeCancelHandler: null,
        resizeKeyHandler: null,
        resizeVisibilityHandler: null,
        validationErrors: [],
        definitionJson: '',
        rules: [],
        decisionTableScope: 'form',
        decisionTableDescription: '',
        decisionInputColumns: [],
        decisionActionColumns: [],
        nextDecisionColumnSeq: 1,
        decisionTables: [],
        activeDecisionTableId: null,
        nextDecisionTableSeq: 1,

        ...controlsApi,
        ...schemaApi,
        ...propertiesApi,
        ...interactionsApi,
        ...rulesApi,

        applyTheme() {
            const host = this.$root;
            if (!host) {
                return;
            }

            if (this.selectedTheme !== 'custom') {
                host.style.removeProperty('--accent');
                host.style.removeProperty('--bg');
                host.style.removeProperty('--surface');
                host.style.removeProperty('--text');
                return;
            }

            host.style.setProperty('--accent', this.customTheme.accent);
            host.style.setProperty('--bg', this.customTheme.bg);
            host.style.setProperty('--surface', this.customTheme.surface);
            host.style.setProperty('--text', this.customTheme.text);
        },

        setActivePage(page) {
            this.activePage = String(page || 'builder');
        },

        setPreviewViewport(mode) {
            const next = String(mode || '').toLowerCase();
            const allowed = new Set(['desktop', 'tablet', 'phone']);
            this.previewViewport = allowed.has(next) ? next : 'desktop';
        },

        viewportPreviewHint() {
            if (this.previewViewport === 'tablet') {
                return 'Preview mode: tablet (approx 834px wide canvas).';
            }
            if (this.previewViewport === 'phone') {
                return 'Preview mode: phone (approx 390px wide canvas).';
            }
            return 'Preview mode: desktop (full canvas width).';
        },

        previewColSpan(control) {
            const raw = Number(control && control.colSpan);
            const baseSpan = Number.isFinite(raw)
                ? Math.max(1, Math.min(12, Math.round(raw)))
                : 12;

            if (this.previewViewport === 'phone') {
                return 4;
            }

            if (this.previewViewport === 'tablet') {
                const mapped = Math.round((baseSpan / 12) * 8);
                return Math.max(1, Math.min(8, mapped));
            }

            return baseSpan;
        },

        toggleMenuCollapsed() {
            this.menuCollapsed = !this.menuCollapsed;
        },

        togglePaletteCollapsed() {
            this.paletteCollapsed = !this.paletteCollapsed;
        },

        togglePropertiesCollapsed() {
            this.propertiesCollapsed = !this.propertiesCollapsed;
        },

        syncCurrentDecisionTable() {
            if (!this.activeDecisionTableId) {
                return;
            }
            const table = this.decisionTables.find((item) => item.id === this.activeDecisionTableId);
            if (!table) {
                return;
            }
            table.scope = String(this.decisionTableScope || 'form').trim() || 'form';
            table.description = String(this.decisionTableDescription || '').trim();
            table.rules = this.rules;
            table.decisionInputColumns = this.decisionInputColumns;
            table.decisionActionColumns = this.decisionActionColumns;
        },

        newDecisionTable(name = '') {
            const next = this.nextDecisionTableSeq;
            this.nextDecisionTableSeq += 1;
            return {
                id: `table-${next}`,
                name: String(name || `Table ${next}`).trim() || `Table ${next}`,
                scope: 'form',
                description: '',
                rules: [],
                decisionInputColumns: [],
                decisionActionColumns: []
            };
        },

        ensureDecisionTables() {
            if (!Array.isArray(this.decisionTables)) {
                this.decisionTables = [];
            }
            if (this.decisionTables.length === 0) {
                const table = this.newDecisionTable('Table 1');
                table.scope = String(this.decisionTableScope || 'form').trim() || 'form';
                table.rules = Array.isArray(this.rules) ? this.rules : [];
                table.decisionInputColumns = Array.isArray(this.decisionInputColumns) ? this.decisionInputColumns : [];
                table.decisionActionColumns = Array.isArray(this.decisionActionColumns) ? this.decisionActionColumns : [];
                this.decisionTables.push(table);
                this.activeDecisionTableId = table.id;
            }

            if (!this.activeDecisionTableId || !this.decisionTables.some((item) => item.id === this.activeDecisionTableId)) {
                this.activeDecisionTableId = this.decisionTables[0].id;
            }
            this.selectDecisionTable(this.activeDecisionTableId);
        },

        selectDecisionTable(tableId) {
            this.syncCurrentDecisionTable();
            const table = this.decisionTables.find((item) => item.id === tableId);
            if (!table) {
                return;
            }
            this.activeDecisionTableId = table.id;
            this.rules = Array.isArray(table.rules) ? table.rules : [];
            this.decisionInputColumns = Array.isArray(table.decisionInputColumns) ? table.decisionInputColumns : [];
            this.decisionActionColumns = Array.isArray(table.decisionActionColumns) ? table.decisionActionColumns : [];
            this.decisionTableScope = String(table.scope || 'form').trim() || 'form';
            this.decisionTableDescription = String(table.description || '').trim();
            this.ensureDecisionTableSchema();
            this.syncCurrentDecisionTable();
        },

        addDecisionTable() {
            this.syncCurrentDecisionTable();
            const table = this.newDecisionTable();
            this.decisionTables.push(table);
            this.selectDecisionTable(table.id);
        },

        removeDecisionTable(tableId) {
            if (!tableId || !Array.isArray(this.decisionTables) || this.decisionTables.length <= 1) {
                return;
            }
            const idx = this.decisionTables.findIndex((item) => item.id === tableId);
            if (idx < 0) {
                return;
            }
            this.syncCurrentDecisionTable();
            this.decisionTables.splice(idx, 1);
            const nextIndex = Math.max(0, idx - 1);
            const next = this.decisionTables[nextIndex];
            if (next) {
                this.selectDecisionTable(next.id);
            }
        },

        paletteIconSvg(widget) {
            const icons = {
                text: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><path d="M4 6h16M12 6v12M8 18h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                number: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><path d="M7 5l-2 14M15 5l-2 14M4 10h16M3 15h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                textarea: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 10h10M7 14h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                date: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                datetime: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="4" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 2v4M13 2v4M3 9h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 13v3l2 1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="19" cy="16" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
                select: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 11h6M15 11l2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                autocomplete: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 10h7M7 14h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="17" cy="13" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
                radio: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><circle cx="7" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="7" cy="8" r="1.2" fill="currentColor"/><path d="M13 8h7M13 16h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                checkbox: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="4" y="5" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 8l1.4 1.4L9 7.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 8h7M13 16h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                booleanCheckbox: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="4" y="6" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 10l2 2 3-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                image: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.4" fill="currentColor"/><path d="M5 17l5-5 3 3 3-2 3 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                button: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="7" width="18" height="10" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 12h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                message: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><path d="M12 3l9 16H3L12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>',
                repeat: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="4" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 9h6M8 13h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18 8l2 2-2 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                table: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M9 5v14M15 5v14" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
                section: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 9h8M8 13h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                group: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="4" y="6" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13" y="6" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="8.5" y="14" width="7" height="4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
            };

            return icons[widget] || icons.text;
        },

        removeControl(id, event) {
            if (!event || !event.target || !event.target.closest || !event.target.closest('.remove-control-btn')) {
                return;
            }

            if (this.selectedControlId === id && (Date.now() - this.lastSelectedAt) < 300) {
                return;
            }

            if (!window.confirm('Remove this control from the canvas?')) {
                return;
            }

            const found = this.findControlById(id);
            if (found) {
                found.list.splice(found.index, 1);
                this.recomputeDerivedStateKeys();
            }
            if (this.selectedControlId === id) {
                this.selectedControlId = null;
                this.selectedControl = null;
            }
        },

        initFromDefinitionJson() {
            const definitionField = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('definition-json'));
            if (!definitionField) {
                return;
            }

            const raw = String(definitionField.value || '').trim();
            if (!raw) {
                return;
            }

            try {
                const definition = JSON.parse(raw);
                this.loadDefinition(definition);
                this.definitionJson = JSON.stringify(definition, null, 2);
            } catch (_err) {
                this.definitionJson = raw;
            }
        },

        loadDefinition(definition) {
            if (!definition || typeof definition !== 'object') {
                return;
            }

            const form = definition.form || definition;
            const controlSchema = form.controlSchema || {};
            const dataSchema = form.dataSchema || { properties: {} };
            const layout = Array.isArray(controlSchema.layout) ? controlSchema.layout : [];

            this.validationDisplayMode = controlSchema.validation?.messagePlacement || this.validationDisplayMode;

            const theme = controlSchema.theme || {};
            this.selectedTheme = theme.preset || this.selectedTheme;
            if (theme.custom && typeof theme.custom === 'object') {
                this.customTheme = {
                    accent: theme.custom.accent || this.customTheme.accent,
                    bg: theme.custom.bg || this.customTheme.bg,
                    surface: theme.custom.surface || this.customTheme.surface,
                    text: theme.custom.text || this.customTheme.text
                };
            }

            this.controls = this.hydrateControls(layout, dataSchema, '#');
            this.recomputeDerivedStateKeys();
            const hydratedRules = this.hydrateRules(Array.isArray(definition.rules) ? definition.rules : []);
            this.deriveDecisionTableFromRules(hydratedRules);
            this.clearSelection();
        },

        deriveDecisionTableFromRules(sourceRules = []) {
            const grouped = new Map();
            sourceRules.forEach((rule) => {
                const scope = String(rule?.scope || 'form').trim() || 'form';
                if (!grouped.has(scope)) {
                    grouped.set(scope, []);
                }
                grouped.get(scope).push(rule);
            });

            this.decisionTables = [];

            if (grouped.size === 0) {
                const empty = this.newDecisionTable('Table 1');
                this.decisionTables.push(empty);
                this.selectDecisionTable(empty.id);
                return;
            }

            let tableCount = 0;
            grouped.forEach((rulesForScope, scope) => {
                tableCount += 1;
                const table = this.newDecisionTable(`Table ${tableCount}`);
                table.scope = scope;
                table.rules = rulesForScope;

                const inputMap = new Map();
                const actionMap = new Map();
                const inputColumns = [];
                const actionColumns = [];

                table.rules.forEach((rule) => {
                    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
                    conditions.forEach((condition) => {
                        const field = String(condition?.field || '').trim();
                        if (!field || !field.startsWith('data.')) {
                            return;
                        }
                        const stateKey = field.substring(5);
                        if (!stateKey || inputMap.has(stateKey)) {
                            return;
                        }
                        const column = this.newDecisionInputColumn(stateKey);
                        inputMap.set(stateKey, column.id);
                        inputColumns.push(column);
                    });

                    const actions = Array.isArray(rule.actions) ? rule.actions : [];
                    actions.forEach((action) => {
                        const kind = String(action?.kind || '').trim().toLowerCase();
                        if (kind === 'api' || action?.endpoint) {
                            const endpoint = String(action?.endpoint || '').trim();
                            if (!endpoint) {
                                return;
                            }
                            const method = String(action?.method || 'get').trim().toLowerCase() || 'get';
                            const trigger = String(action?.trigger || 'change').trim().toLowerCase() || 'change';
                            const target = String(action?.target || '').trim();
                            const swap = String(action?.swap || 'innerHTML').trim() || 'innerHTML';
                            const valsTemplate = String(action?.valsTemplate || '').trim();
                            const key = `api::${endpoint}::${method}::${trigger}::${target}::${swap}::${valsTemplate}`;
                            if (actionMap.has(key)) {
                                return;
                            }
                            const column = this.newDecisionActionColumn({
                                kind: 'api',
                                apiEndpoint: endpoint,
                                apiMethod: method,
                                apiTrigger: trigger,
                                apiTarget: target,
                                apiSwap: swap,
                                apiValsTemplate: valsTemplate
                            });
                            actionMap.set(key, column.id);
                            actionColumns.push(column);
                            return;
                        }

                        const target = String(action?.target || '').trim();
                        const intent = this.parseActionIntent(action?.intent || `${action?.effect || 'visible'}:${this.normalizeBoolean(action?.value) ? 'true' : 'false'}`);
                        const property = String(intent.effect || 'visible').trim() || 'visible';
                        if (!target) {
                            return;
                        }
                        const key = `${target}::${property}`;
                        if (actionMap.has(key)) {
                            return;
                        }
                        const column = this.newDecisionActionColumn({ kind: 'ui', target, property });
                        actionMap.set(key, column.id);
                        actionColumns.push(column);
                    });
                });

                table.decisionInputColumns = inputColumns;
                table.decisionActionColumns = actionColumns;
                if (table.decisionInputColumns.length === 0) {
                    const firstStateKey = this.availableStateKeys()[0] || '';
                    table.decisionInputColumns.push(this.newDecisionInputColumn(firstStateKey));
                }
                if (table.decisionActionColumns.length === 0) {
                    table.decisionActionColumns.push(this.newDecisionActionColumn('', 'visible'));
                }

                table.rules.forEach((rule) => {
                    rule.decisionInputs = {};
                    rule.decisionActions = {};

                    table.decisionInputColumns.forEach((column) => {
                        rule.decisionInputs[column.id] = { op: 'eq', value: '' };
                    });
                    table.decisionActionColumns.forEach((column) => {
                        rule.decisionActions[column.id] = '';
                    });

                    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
                    conditions.forEach((condition) => {
                        const field = String(condition?.field || '').trim();
                        if (!field.startsWith('data.')) {
                            return;
                        }
                        const stateKey = field.substring(5);
                        const columnId = inputMap.get(stateKey);
                        if (!columnId) {
                            return;
                        }
                        const op = String(condition?.op || 'eq').trim() || 'eq';
                        const cell = { op, value: '' };
                        if (op === 'in' || op === 'notIn') {
                            cell.value = String(condition?.valuesText || '').trim();
                        } else if (op === 'exists') {
                            cell.value = 'true';
                        } else {
                            cell.value = String(condition?.value || '').trim();
                        }
                        rule.decisionInputs[columnId] = cell;
                    });

                    const actions = Array.isArray(rule.actions) ? rule.actions : [];
                    actions.forEach((action) => {
                        const kind = String(action?.kind || '').trim().toLowerCase();
                        if (kind === 'api' || action?.endpoint) {
                            const endpoint = String(action?.endpoint || '').trim();
                            if (!endpoint) {
                                return;
                            }
                            const method = String(action?.method || 'get').trim().toLowerCase() || 'get';
                            const trigger = String(action?.trigger || 'change').trim().toLowerCase() || 'change';
                            const target = String(action?.target || '').trim();
                            const swap = String(action?.swap || 'innerHTML').trim() || 'innerHTML';
                            const valsTemplate = String(action?.valsTemplate || '').trim();
                            const key = `api::${endpoint}::${method}::${trigger}::${target}::${swap}::${valsTemplate}`;
                            const columnId = actionMap.get(key);
                            if (!columnId) {
                                return;
                            }
                            rule.decisionActions[columnId] = 'true';
                            return;
                        }

                        const target = String(action?.target || '').trim();
                        const intent = this.parseActionIntent(action?.intent || `${action?.effect || 'visible'}:${this.normalizeBoolean(action?.value) ? 'true' : 'false'}`);
                        const property = String(intent.effect || 'visible').trim() || 'visible';
                        const key = `${target}::${property}`;
                        const columnId = actionMap.get(key);
                        if (!columnId) {
                            return;
                        }
                        rule.decisionActions[columnId] = intent.value ? 'true' : 'false';
                    });
                });

                this.decisionTables.push(table);
            });

            this.selectDecisionTable(this.decisionTables[0].id);
        },

        hydrateRules(rules) {
            return rules.map((rule, index) => {
                const hydratedActions = Array.isArray(rule.actions) && rule.actions.length > 0
                    ? rule.actions
                        .map((action) => {
                            const kind = String(action?.kind || '').trim().toLowerCase();
                            if (kind === 'api' || action?.endpoint) {
                                const endpoint = String(action?.endpoint || '').trim();
                                if (!endpoint) {
                                    return null;
                                }
                                return {
                                    kind: 'api',
                                    endpoint,
                                    method: String(action?.method || 'get').trim().toLowerCase() || 'get',
                                    trigger: String(action?.trigger || 'change').trim().toLowerCase() || 'change',
                                    target: String(action?.target || '').trim(),
                                    swap: String(action?.swap || 'innerHTML').trim() || 'innerHTML',
                                    valsTemplate: String(action?.valsTemplate || '').trim()
                                };
                            }

                            const target = String(action?.target || '').trim();
                            if (!target) {
                                return null;
                            }
                            return {
                                kind: 'ui',
                                target,
                                intent: `${String(action?.effect || 'visible').trim() || 'visible'}:${this.normalizeBoolean(action?.value) ? 'true' : 'false'}`
                            };
                        })
                        .filter(Boolean)
                    : [{
                        kind: 'ui',
                        target: String(rule.target || ''),
                        intent: `${String(rule.effect || 'visible')}:${this.normalizeBoolean(rule.value) ? 'true' : 'false'}`
                    }].filter((action) => action.target);

                let conditions = [this.newConditionRow()];
                const base = {
                    id: String(rule.id || `rule-${index + 1}`),
                    scope: String(rule.scope || 'form'),
                    conditionMatchMode: 'all',
                    actions: hydratedActions.length > 0
                        ? hydratedActions
                        : [{ target: '', intent: 'visible:true' }],
                    conditions,
                    whenJsonLogic: ''
                };

                if (!rule.when || typeof rule.when !== 'object') {
                    return base;
                }

                if (rule.when.fact && rule.when.op) {
                    base.conditions = [{
                        field: String(rule.when.fact || ''),
                        op: String(rule.when.op || 'eq'),
                        value: '',
                        valuesText: ''
                    }];
                    base.conditionMatchMode = 'all';
                    if (Array.isArray(rule.when.values)) {
                        base.conditions[0].valuesText = rule.when.values.join(', ');
                    }
                    if (rule.when.value !== undefined && rule.when.value !== null) {
                        base.conditions[0].value = String(rule.when.value);
                    }
                    return base;
                }

                if (rule.when.all && Array.isArray(rule.when.all)) {
                    const mapped = rule.when.all.map((condition) => this.hydrateCondition(condition)).filter(Boolean);
                    if (mapped.length > 0) {
                        base.conditions = mapped;
                        base.conditionMatchMode = 'all';
                    }
                    return base;
                }

                if (rule.when.any && Array.isArray(rule.when.any)) {
                    const mapped = rule.when.any.map((condition) => this.hydrateCondition(condition)).filter(Boolean);
                    if (mapped.length > 0) {
                        base.conditions = mapped;
                        base.conditionMatchMode = 'any';
                    }
                    return base;
                }

                base.whenJsonLogic = JSON.stringify(rule.when, null, 2);
                return base;
            });
        },

        hydrateCondition(condition) {
            if (!condition || typeof condition !== 'object') {
                return null;
            }
            if (condition.fact && condition.op) {
                return {
                    field: String(condition.fact || ''),
                    op: String(condition.op || 'eq'),
                    value: condition.value !== undefined && condition.value !== null ? String(condition.value) : '',
                    valuesText: Array.isArray(condition.values) ? condition.values.join(', ') : ''
                };
            }
            return null;
        },

        hydrateControls(layout, dataSchema, pointerBase) {
            if (!Array.isArray(layout)) {
                return [];
            }

            return layout.map((item, index) => {
                const schemaNode = this.resolveSchemaNode(dataSchema, item.pointer || '');
                const inferredWidget = this.inferHydratedWidget(item);
                const name = this.pointerLeafName(item.pointer || '', index);
                const base = {
                    id: this.newControlId(),
                    name,
                    stateKey: String(item.stateKey || name),
                    label: String(item.label || name),
                    nameManual: true,
                    type: this.inferSchemaType(schemaNode, item),
                    widget: inferredWidget,
                    required: item.required === true,
                    visible: item.visible !== false,
                    enabled: item.enabled !== false,
                    validationMessage: String(item.validationMessage || ''),
                    hint: String(item.hint || ''),
                    hintFormat: String(item.hintFormat || 'markdown'),
                    help: String(item.help || ''),
                    helpFormat: String(item.helpFormat || 'markdown'),
                    defaultValue: this.hydrateDefaultValue(schemaNode, item),
                    colSpan: Number(item.colSpan) || 12,
                    placeholder: String(schemaNode?.placeholder || ''),
                    options: this.hydrateOptions(item, schemaNode),
                    autocompleteSourceType: String(item.autocompleteSourceType || 'static'),
                    autocompleteSourceUrl: String(item.autocompleteSourceUrl || ''),
                    autocompleteLabelField: String(item.autocompleteLabelField || 'label'),
                    autocompleteValueField: String(item.autocompleteValueField || 'value'),
                    autocompleteSearchParam: String(item.autocompleteSearchParam || 'q'),
                    minDate: String(item.minDate || ''),
                    maxDate: String(item.maxDate || ''),
                    minDateTime: String(item.minDateTime || ''),
                    maxDateTime: String(item.maxDateTime || ''),
                    assetKey: String(item.assetRef?.assetKey || ''),
                    assetVersion: Number(item.assetRef?.version || 0),
                    assetHash: String(item.assetRef?.sha256 || ''),
                    assetPreviewUrl: '',
                    altText: String(item.alt || ''),
                    objectFit: String(item.fit || 'contain'),
                    imageWidth: Number(item.width || 0),
                    imageHeight: Number(item.height || 0),
                    uploadAccept: String(item.accept || ''),
                    uploadAllowMultiple: item.multiple === true,
                    uploadMaxBytes: Number(item.maxBytes || 0),
                    buttonVariant: String(item.variant || 'primary'),
                    buttonActionType: String(item.actionType || 'customEvent'),
                    buttonActionTarget: String(item.actionTarget || ''),
                    buttonPayload: typeof item.payload === 'string' ? item.payload : (item.payload ? JSON.stringify(item.payload, null, 2) : ''),
                    buttonConfirmMessage: String(item.confirmMessage || ''),
                    messageTone: String(item.messageTone || 'info'),
                    messageTitle: String(item.messageTitle || ''),
                    messageBody: String(item.messageBody || ''),
                    messageFormat: String(item.messageFormat || 'markdown'),
                    repeatRenderer: String(item.renderer || 'table'),
                    repeatMinItems: Number(schemaNode?.minItems || item.minItems || 0),
                    repeatMaxItems: Number(schemaNode?.maxItems || item.maxItems || 0),
                    repeatAllowAdd: item.allowAdd !== false,
                    repeatAllowDelete: item.allowDelete !== false,
                    repeatAllowReorder: item.allowReorder === true,
                    tableColumns: this.hydrateTableColumns(item),
                    tableMinItems: Number(schemaNode?.minItems || item.minItems || 0),
                    tableMaxItems: Number(schemaNode?.maxItems || item.maxItems || 0),
                    tableAllowAdd: item.allowAdd !== false,
                    tableAllowDelete: item.allowDelete !== false,
                    tableAllowReorder: item.allowReorder === true,
                    sectionDescription: String(item.description || ''),
                    sectionCollapsible: item.collapsible === true,
                    sectionDefaultExpanded: item.defaultExpanded !== false,
                    groupDescription: String(item.description || ''),
                    children: []
                };

                if (Array.isArray(item.children) && item.children.length > 0) {
                    const childSchema = inferredWidget === 'group'
                        ? (schemaNode || { properties: {} })
                        : (schemaNode?.items || dataSchema);
                    const childPointerBase = inferredWidget === 'group'
                        ? `${pointerBase}/properties/${name}`
                        : `${pointerBase}/properties/${name}/items`;
                    base.children = this.hydrateControls(item.children, childSchema, childPointerBase);
                }

                return this.normalizeControl(base);
            });
        },

        inferHydratedWidget(item) {
            if (item.widget === 'repeat' && Array.isArray(item.columns) && item.columns.length > 0 && (!Array.isArray(item.children) || item.children.length === 0)) {
                return 'table';
            }
            return String(item.widget || 'text');
        },

        pointerLeafName(pointer, fallbackIndex) {
            const raw = String(pointer || '');
            const parts = raw.split('/').filter(Boolean);
            for (let i = parts.length - 1; i >= 0; i -= 1) {
                if (parts[i] !== 'properties' && parts[i] !== 'items') {
                    return this.toIdentifier(parts[i]);
                }
            }
            return `field${fallbackIndex + 1}`;
        },

        resolveSchemaNode(rootSchema, pointer) {
            if (!rootSchema || !pointer) {
                return null;
            }

            const parts = String(pointer).split('/').filter(Boolean);
            let current = rootSchema;
            for (let i = 0; i < parts.length; i += 1) {
                const part = parts[i];
                if (part === 'properties') {
                    const key = parts[i + 1];
                    current = current?.properties?.[key] || null;
                    i += 1;
                    continue;
                }
                if (part === 'items') {
                    current = current?.items || null;
                }
            }

            return current || null;
        },

        inferSchemaType(schemaNode, item) {
            if (schemaNode?.type) {
                return String(schemaNode.type);
            }
            if (item.widget === 'checkbox') {
                return 'array';
            }
            if (item.widget === 'number') {
                return 'number';
            }
            if (item.widget === 'booleanCheckbox') {
                return 'boolean';
            }
            if (item.widget === 'group' || item.widget === 'section') {
                return 'object';
            }
            if (item.widget === 'repeat' || item.widget === 'table') {
                return 'array';
            }
            return 'string';
        },

        hydrateDefaultValue(schemaNode, item) {
            if (schemaNode && Object.prototype.hasOwnProperty.call(schemaNode, 'default')) {
                return schemaNode.default;
            }
            if (item.widget === 'checkbox') {
                return [];
            }
            if (item.widget === 'number') {
                return null;
            }
            if (item.widget === 'booleanCheckbox') {
                return false;
            }
            if (item.widget === 'message' || item.widget === 'button' || item.widget === 'section' || item.widget === 'group' || item.widget === 'repeat' || item.widget === 'table' || item.widget === 'image') {
                return null;
            }
            return '';
        },

        hydrateOptions(item, schemaNode) {
            if (Array.isArray(item.options) && item.options.length > 0) {
                return item.options.map((option) => ({
                    label: String(option.label || option.value || ''),
                    value: String(option.value || ''),
                    autoValue: false
                }));
            }

            const enumValues = Array.isArray(schemaNode?.enum)
                ? schemaNode.enum
                : (Array.isArray(schemaNode?.items?.enum) ? schemaNode.items.enum : []);

            return enumValues.map((value) => ({
                label: String(value),
                value: String(value),
                autoValue: false
            }));
        },

        hydrateTableColumns(item) {
            if (!Array.isArray(item.columns)) {
                return [];
            }

            return item.columns.map((column, index) => ({
                key: this.toIdentifier(column.key || `column${index + 1}`),
                title: String(column.title || column.key || `Column ${index + 1}`),
                type: String(column.type || 'string'),
                required: column.required === true,
                visible: column.visible !== false
            }));
        }
    };
}

const windowAny = /** @type {any} */ (window);
windowAny.formDesigner = formDesigner;
