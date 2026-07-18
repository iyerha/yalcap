// @ts-check
function formDesigner() {
    const windowAny = /** @type {any} */ (window);
    const controlsApi = windowAny.formDesignerControls || {};
    const schemaApi = windowAny.formDesignerSchema || {};
    const propertiesApi = windowAny.formDesignerProperties || {};
    const interactionsApi = windowAny.formDesignerInteractions || {};
    const definitionKeyEl = /** @type {HTMLInputElement | null} */ (document.getElementById('definitionKey'));

    return {
        definitionKey: definitionKeyEl ? definitionKeyEl.value : 'generated-definition',
        activePage: 'builder',
        menuCollapsed: false,
        paletteCollapsed: false,
        propertiesCollapsed: false,
        selectedTheme: 'default',
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

        ...controlsApi,
        ...schemaApi,
        ...propertiesApi,
        ...interactionsApi,

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

        toggleMenuCollapsed() {
            this.menuCollapsed = !this.menuCollapsed;
        },

        togglePaletteCollapsed() {
            this.paletteCollapsed = !this.paletteCollapsed;
        },

        togglePropertiesCollapsed() {
            this.propertiesCollapsed = !this.propertiesCollapsed;
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
            }
            if (this.selectedControlId === id) {
                this.selectedControlId = null;
                this.selectedControl = null;
            }
        },

        addRule() {
            const nextIndex = this.rules.length + 1;
            this.rules.push({
                id: `rule-${nextIndex}`,
                scope: 'form',
                whenFact: '',
                whenOp: 'eq',
                whenValue: '',
                whenValuesText: '',
                whenJsonLogic: '',
                conditionMatchMode: 'all',
                conditions: [this.newConditionRow()],
                actions: [
                    { target: '', intent: 'visible:true' }
                ]
            });
        },

        newConditionRow() {
            return { field: '', op: 'eq', value: '', valuesText: '' };
        },

        addRuleCondition(rule) {
            if (!rule || !Array.isArray(rule.conditions)) {
                return;
            }
            rule.conditions.push(this.newConditionRow());
        },

        removeRuleCondition(rule, conditionIndex) {
            if (!rule || !Array.isArray(rule.conditions) || rule.conditions.length <= 1) {
                return;
            }
            if (conditionIndex < 0 || conditionIndex >= rule.conditions.length) {
                return;
            }
            rule.conditions.splice(conditionIndex, 1);
        },

        moveRuleUp(index) {
            if (index <= 0 || index >= this.rules.length) {
                return;
            }
            const prev = this.rules[index - 1];
            this.rules[index - 1] = this.rules[index];
            this.rules[index] = prev;
        },

        moveRuleDown(index) {
            if (index < 0 || index >= this.rules.length - 1) {
                return;
            }
            const next = this.rules[index + 1];
            this.rules[index + 1] = this.rules[index];
            this.rules[index] = next;
        },

        removeRule(index) {
            if (index < 0 || index >= this.rules.length) {
                return;
            }
            this.rules.splice(index, 1);
        },

        addRuleAction(rule) {
            if (!rule || !Array.isArray(rule.actions)) {
                return;
            }
            rule.actions.push({ target: '', intent: 'visible:true' });
        },

        removeRuleAction(rule, actionIndex) {
            if (!rule || !Array.isArray(rule.actions) || rule.actions.length <= 1) {
                return;
            }
            if (actionIndex < 0 || actionIndex >= rule.actions.length) {
                return;
            }
            rule.actions.splice(actionIndex, 1);
        },

        availableStateKeyOptions() {
            const options = [];
            const seen = new Set();
            const walk = (controls) => {
                if (!Array.isArray(controls)) {
                    return;
                }
                controls.forEach((control) => {
                    if (!control) {
                        return;
                    }
                    const key = String(control.stateKey || control.name || '').trim();
                    if (key && !seen.has(key)) {
                        seen.add(key);
                        options.push({
                            key,
                            label: String(control.label || control.name || control.stateKey || key).trim()
                        });
                    }
                    if (Array.isArray(control.children) && control.children.length > 0) {
                        walk(control.children);
                    }
                });
            };
            walk(this.controls);
            options.sort((a, b) => a.key.localeCompare(b.key));
            return options;
        },

        availableStateKeys() {
            return this.availableStateKeyOptions().map((item) => item.key);
        },

        availableConditionFieldOptions() {
            const builtIns = [
                { key: 'workflow.stepId', label: 'Workflow Step' },
                { key: 'workflow.definitionKey', label: 'Workflow Definition' },
                { key: 'user.id', label: 'User Id' },
                { key: 'user.groups', label: 'User Groups' },
                { key: 'tenant.id', label: 'Tenant Id' }
            ];

            const dataFields = this.availableStateKeyOptions().map((item) => ({
                key: `data.${item.key}`,
                label: item.label
            }));

            return [...builtIns, ...dataFields];
        },

        hasSimpleConditionInputs(condition) {
            if (!condition) {
                return false;
            }
            return String(condition.field || '').trim() !== ''
                || String(condition.value || '').trim() !== ''
                || String(condition.valuesText || '').trim() !== '';
        },

        isKnownConditionField(fieldPath) {
            const field = String(fieldPath || '').trim();
            if (!field) {
                return false;
            }
            const known = new Set(this.availableConditionFieldOptions().map((item) => item.key));
            if (known.has(field)) {
                return true;
            }
            if (field.startsWith('data.') || field.startsWith('workflow.') || field.startsWith('user.') || field.startsWith('tenant.')) {
                return true;
            }
            return false;
        },

        conditionFieldError(condition) {
            if (!condition) {
                return '';
            }
            return this.validateConditionField(condition);
        },

        validateConditionField(condition) {
            const field = String(condition?.field || '').trim();
            if (!field) {
                return 'Field is required for simple conditions.';
            }
            if (!this.isKnownConditionField(field)) {
                return 'Unknown field. Use picker or one of: data.*, workflow.*, user.*, tenant.*';
            }
            return '';
        },

        conditionValueError(condition) {
            if (!condition) {
                return '';
            }
            return this.validateConditionValue(condition);
        },

        validateConditionValue(condition) {
            const op = String(condition?.op || 'eq').trim();
            if (op === 'exists') {
                return '';
            }
            if (op === 'in' || op === 'notIn') {
                if (String(condition?.valuesText || '').trim() === '') {
                    return 'Value is required for list operators.';
                }
                return '';
            }
            if (String(condition?.value || '').trim() === '') {
                return 'Value is required for this operator.';
            }
            return '';
        },

        normalizeBoolean(value) {
            if (value === true || value === false) {
                return value;
            }
            const text = String(value ?? '').trim().toLowerCase();
            return text === 'true' || text === '1' || text === 'yes';
        },

        actionValueMeaning(action) {
            const effect = String(action?.effect || '').trim();
            const value = this.normalizeBoolean(action?.value);
            return `Set ${effect || 'effect'} to ${value ? 'true' : 'false'}`;
        },

        actionIntentMeaning(action) {
            const intent = String(action?.intent || 'visible:true').trim();
            const phrases = {
                'visible:true': 'Set to be visible',
                'visible:false': 'Set to be hidden',
                'readable:true': 'Set to be readable',
                'readable:false': 'Set to be unreadable',
                'writable:true': 'Set to be editable',
                'writable:false': 'Set to be read only',
                'enabled:true': 'Set to be enabled',
                'enabled:false': 'Set to be disabled',
                'required:true': 'Set to be required',
                'required:false': 'Set to be optional'
            };
            return phrases[intent] || 'Set action';
        },

        parseActionIntent(intent) {
            const text = String(intent || '').trim();
            const [effect, rawValue] = text.split(':');
            const normalizedEffect = String(effect || '').trim();
            const normalizedValue = String(rawValue || 'true').trim().toLowerCase() === 'false' ? false : true;
            if (!normalizedEffect) {
                return { effect: 'visible', value: true };
            }
            return { effect: normalizedEffect, value: normalizedValue };
        },

        parseRuleLiteral(raw) {
            const text = String(raw || '').trim();
            if (text === '') {
                return '';
            }
            if (text === 'true') {
                return true;
            }
            if (text === 'false') {
                return false;
            }
            if (text === 'null') {
                return null;
            }
            const asNumber = Number(text);
            if (!Number.isNaN(asNumber) && text !== '') {
                return asNumber;
            }
            return text;
        },

        buildJsonLogicFromSimpleCondition(condition) {
            const whenFact = String(condition?.field || '').trim();
            const whenOp = String(condition?.op || '').trim();
            if (!whenFact || !whenOp) {
                return null;
            }

            const varRef = { var: whenFact };
            if (whenOp === 'exists') {
                return { '!': [{ '==': [varRef, null] }] };
            }

            if (whenOp === 'in' || whenOp === 'notIn') {
                const values = String(condition?.valuesText || '')
                    .split(',')
                    .map((v) => this.parseRuleLiteral(v))
                    .filter((v) => v !== '');
                if (values.length === 0) {
                    return null;
                }

                if (values.length === 1) {
                    const inExpr = { in: [values[0], varRef] };
                    return whenOp === 'notIn' ? { '!': [inExpr] } : inExpr;
                }

                const listExpr = { in: [varRef, values] };
                return whenOp === 'notIn' ? { '!': [listExpr] } : listExpr;
            }

            const value = this.parseRuleLiteral(condition?.value);
            const operators = {
                eq: '==',
                ne: '!=',
                gt: '>',
                gte: '>=',
                lt: '<',
                lte: '<=',
                matches: 'matches'
            };
            const jsonOp = operators[whenOp] || '==';
            return { [jsonOp]: [varRef, value] };
        },

        parseJsonLogicText(raw) {
            const text = String(raw || '').trim();
            if (!text) {
                return null;
            }

            try {
                const parsed = JSON.parse(text);
                if (windowAny.jsonLogic && typeof windowAny.jsonLogic.apply === 'function') {
                    windowAny.jsonLogic.apply(parsed, {});
                }
                return parsed;
            } catch (err) {
                throw new Error(`Invalid JSON Logic: ${err instanceof Error ? err.message : String(err)}`);
            }
        },

        normalizedRulesPayload() {
            const out = [];
            this.rules.forEach((rule, index) => {
                const scope = String(rule.scope || '').trim();
                if (!scope) {
                    return;
                }

                const actions = Array.isArray(rule.actions)
                    ? rule.actions
                    : [{
                        target: rule.target,
                        intent: rule.intent,
                        effect: rule.effect,
                        value: rule.value
                    }];

                const normalizedActions = actions
                    .map((action) => ({
                        target: String(action?.target || '').trim(),
                        ...this.parseActionIntent(action?.intent || `${action?.effect || 'visible'}:${this.normalizeBoolean(action?.value) ? 'true' : 'false'}`)
                    }))
                    .filter((action) => action.target && action.effect);

                if (normalizedActions.length === 0) {
                    return;
                }

                const normalized = {
                    id: String(rule.id || '').trim() || `rule-${index + 1}`,
                    scope,
                    actions: normalizedActions
                };

                const whenFromJsonLogic = this.parseJsonLogicText(rule.whenJsonLogic);
                if (whenFromJsonLogic) {
                    normalized.when = whenFromJsonLogic;
                    out.push(normalized);
                    return;
                }

                const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
                const conditionErrors = conditions
                    .map((condition) => this.validateConditionField(condition) || this.validateConditionValue(condition))
                    .filter(Boolean);
                if (conditionErrors.length > 0) {
                    return;
                }

                const simpleConditions = conditions
                    .map((condition) => this.buildJsonLogicFromSimpleCondition(condition))
                    .filter(Boolean);

                if (simpleConditions.length === 1) {
                    normalized.when = simpleConditions[0];
                } else if (simpleConditions.length > 1) {
                    const matchMode = String(rule.conditionMatchMode || 'all').trim();
                    normalized.when = matchMode === 'any'
                        ? { any: simpleConditions }
                        : { all: simpleConditions };
                }

                out.push(normalized);
            });

            return out;
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
            this.rules = this.hydrateRules(Array.isArray(definition.rules) ? definition.rules : []);
            this.clearSelection();
        },

        hydrateRules(rules) {
            return rules.map((rule, index) => {
                const hydratedActions = Array.isArray(rule.actions) && rule.actions.length > 0
                    ? rule.actions
                        .map((action) => ({
                            target: String(action?.target || '').trim(),
                            intent: `${String(action?.effect || 'visible').trim() || 'visible'}:${this.normalizeBoolean(action?.value) ? 'true' : 'false'}`
                        }))
                        .filter((action) => action.target)
                    : [{
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
                required: column.required === true
            }));
        }
    };
}

const windowAny = /** @type {any} */ (window);
windowAny.formDesigner = formDesigner;
