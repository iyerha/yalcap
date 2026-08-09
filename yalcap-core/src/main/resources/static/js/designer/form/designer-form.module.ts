// TypeScript Form Designer Factory
interface PaletteItem {
    label: string;
    widget: string;
    type: string;
}

interface CustomTheme {
    accent: string;
    bg: string;
    surface: string;
    text: string;
}

interface FormControl {
    localId: string;
    id: string;
    name: string;
    stateKey: string;
    label: string;
    nameManual: boolean;
    type: string;
    widget: string;
    required: boolean;
    visible: boolean;
    enabled: boolean;
    validationMessage: string;
    hint: string;
    hintFormat: string;
    help: string;
    helpFormat: string;
    defaultValue: unknown;
    colSpan: number;
    placeholder: string;
    options: unknown[];
    autocompleteSourceType: string;
    autocompleteSourceUrl: string;
    autocompleteLabelField: string;
    autocompleteValueField: string;
    autocompleteSearchParam: string;
    minDate: string;
    maxDate: string;
    minDateTime: string;
    maxDateTime: string;
    assetKey: string;
    assetVersion: number;
    assetHash: string;
    assetPreviewUrl: string;
    altText: string;
    objectFit: string;
    imageWidth: number;
    imageHeight: number;
    uploadAccept: string;
    uploadAllowMultiple: boolean;
    uploadMaxBytes: number;
    buttonVariant: string;
    buttonActionType: string;
    buttonActionTarget: string;
    buttonPayload: string;
    buttonConfirmMessage: string;
    messageTone: string;
    messageTitle: string;
    messageBody: string;
    messageFormat: string;
    repeatRenderer: string;
    repeatMinItems: number;
    repeatMaxItems: number;
    repeatAllowAdd: boolean;
    repeatAllowDelete: boolean;
    repeatAllowReorder: boolean;
    tableColumns: unknown[];
    tableMinItems: number;
    tableMaxItems: number;
    tableAllowAdd: boolean;
    tableAllowDelete: boolean;
    tableAllowReorder: boolean;
    sectionDescription: string;
    sectionCollapsible: boolean;
    sectionDefaultExpanded: boolean;
    groupDescription: string;
    children: FormControl[];
    [key: string]: unknown;
}

interface FormDesignerState {
    definitionKey: string;
    formTitle: string;
    activePage: string;
    menuCollapsed: boolean;
    paletteCollapsed: boolean;
    propertiesCollapsed: boolean;
    selectedTheme: string;
    previewViewport: string;
    customTheme: CustomTheme;
    validationDisplayMode: string;
    controlPalette: PaletteItem[];
    controls: FormControl[];
    columnOptions: number[];
    selectedControlLocalId: string | null;
    selectedControl: FormControl | null;
    stateKeyEditEnabled: boolean;
    lastSelectedAt: number;
    paletteSortable: unknown;
    canvasSortable: unknown;
    nestedSortables: unknown;
    sortableObserver: unknown;
    sortableCleanupBound: unknown;
    flatpickrInstances: unknown;
    tomSelectInstances: unknown;
    nextControlSeq: number;
    resizingControlId: string | null;
    resizeStartX: number;
    resizeStartSpan: number;
    resizeGridElement: unknown;
    resizeMoveHandler?: (e: MouseEvent) => void;
    resizeUpHandler?: (e: MouseEvent) => void;
    resizeCancelHandler?: () => void;
    resizeKeyHandler?: (e: KeyboardEvent) => void;
    resizeVisibilityHandler?: () => void;
    validationErrors: unknown[];
    rules: unknown[];
    decisionTableScope: string;
    decisionTableDescription: string;
    decisionInputColumns: unknown[];
    decisionActionColumns: unknown[];
    nextDecisionColumnSeq: number;
    decisionTables: unknown[];
    activeDecisionTableId: string | null;
    nextDecisionTableSeq: number;
    controlSchemaHtml: string;
    dataSchemaYaml: string;
    [key: string]: unknown;
}

const windowAny = window as any;

function formDesigner(): FormDesignerState & { [key: string]: any } {

    const controlsApi = (windowAny.formDesignerControls as any) || {};
    const schemaApi = (windowAny.formDesignerSchema as any) || {};
    const propertiesApi = (windowAny.formDesignerProperties as any) || {};
    const interactionsApi = (windowAny.formDesignerInteractions as any) || {};
    const rulesApi = (windowAny.formDesignerRules as any) || {};
    const definitionKeyEl = document.getElementById('definitionKey') as HTMLInputElement | null;

    return {
        definitionKey: definitionKeyEl ? definitionKeyEl.value : 'generated-definition',
        formTitle: definitionKeyEl ? definitionKeyEl.value : '',
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
        selectedControlLocalId: null,
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
        resizeMoveHandler: undefined,
        resizeUpHandler: undefined,
        resizeCancelHandler: undefined,
        resizeKeyHandler: undefined,
        resizeVisibilityHandler: undefined,
        validationErrors: [],
        rules: [],
        decisionTableScope: 'form',
        decisionTableDescription: '',
        decisionInputColumns: [],
        decisionActionColumns: [],
        nextDecisionColumnSeq: 1,
        decisionTables: [],
        activeDecisionTableId: null,
        nextDecisionTableSeq: 1,
        controlSchemaHtml: '',
        dataSchemaYaml: '',

        initFromDefinitionJson(this: any): void {
            const controlSchemaEl = document.getElementById('controlSchema');
            const dataSchemaEl = document.getElementById('dataSchema');
            
            if (controlSchemaEl?.textContent) {
                this.loadControlSchema(controlSchemaEl.textContent);
            }
            if (dataSchemaEl?.textContent) {
                this.loadDataSchema(JSON.parse(dataSchemaEl.textContent));
            }
        },

        loadControlSchema(this: any, schemaHtml: string): void {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(schemaHtml, 'text/html');
                // Extract controls from parsed HTML
                this.controls = [];
                // Parse and populate this.controls array
            } catch (error) {
                console.error('Failed to load control schema:', error);
            }
        },

        applyTheme(this: any): void {
            const host = this.$root;
            if (!host) {
                return;
            }

            if (this.selectedTheme !== 'custom') {
                (host as HTMLElement).style.removeProperty('--accent');
                (host as HTMLElement).style.removeProperty('--bg');
                (host as HTMLElement).style.removeProperty('--surface');
                (host as HTMLElement).style.removeProperty('--text');
                return;
            }

            (host as HTMLElement).style.setProperty('--accent', this.customTheme.accent);
            (host as HTMLElement).style.setProperty('--bg', this.customTheme.bg);
            (host as HTMLElement).style.setProperty('--surface', this.customTheme.surface);
            (host as HTMLElement).style.setProperty('--text', this.customTheme.text);
        },

        setActivePage(this: any, page: unknown): void {
            this.activePage = String(page || 'builder');
        },

        setPreviewViewport(this: any, mode: unknown): void {
            const next = String(mode || '').toLowerCase();
            const allowed = new Set(['desktop', 'tablet', 'phone']);
            this.previewViewport = allowed.has(next) ? next : 'desktop';
        },

        viewportPreviewHint(this: any): string {
            if (this.previewViewport === 'tablet') {
                return 'Preview mode: tablet (approx 834px wide canvas).';
            }
            if (this.previewViewport === 'phone') {
                return 'Preview mode: phone (approx 390px wide canvas).';
            }
            return 'Preview mode: desktop (full canvas width).';
        },

        previewColSpan(this: any, control: any): number {
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

        toggleMenuCollapsed(this: any): void {
            this.menuCollapsed = !this.menuCollapsed;
        },

        togglePaletteCollapsed(this: any): void {
            this.paletteCollapsed = !this.paletteCollapsed;
        },

        togglePropertiesCollapsed(this: any): void {
            this.propertiesCollapsed = !this.propertiesCollapsed;
        },

        syncCurrentDecisionTable(this: any): void {
            if (!this.activeDecisionTableId) {
                return;
            }
            const table = this.decisionTables.find((item: any) => item.id === this.activeDecisionTableId);
            if (!table) {
                return;
            }
            table.scope = String(this.decisionTableScope || 'form').trim() || 'form';
            table.description = String(this.decisionTableDescription || '').trim();
            table.rules = this.rules;
            table.decisionInputColumns = this.decisionInputColumns;
            table.decisionActionColumns = this.decisionActionColumns;
        },

        newDecisionTable(this: any, name: string = ''): any {
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

        ensureDecisionTables(this: any): void {
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

            if (!this.activeDecisionTableId || !this.decisionTables.some((item: any) => item.id === this.activeDecisionTableId)) {
                this.activeDecisionTableId = this.decisionTables[0].id;
            }
            this.selectDecisionTable(this.activeDecisionTableId);
        },

        selectDecisionTable(this: any, tableId: string): void {
            this.syncCurrentDecisionTable();
            const table = this.decisionTables.find((item: any) => item.id === tableId);
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

        addDecisionTable(this: any): void {
            this.syncCurrentDecisionTable();
            const table = this.newDecisionTable();
            this.decisionTables.push(table);
            this.selectDecisionTable(table.id);
        },

        removeDecisionTable(this: any, tableId: string): void {
            if (!tableId || !Array.isArray(this.decisionTables) || this.decisionTables.length <= 1) {
                return;
            }
            const idx = this.decisionTables.findIndex((item: any) => item.id === tableId);
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

        paletteIconSvg(this: any, widget: string): string {
            const icons: Record<string, string> = {
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

        removeControl(this: any, localId: string, event: Event): void {
            if (!event || !(event.target instanceof Element) || !event.target.closest || !event.target.closest('.remove-control-btn')) {
                return;
            }

            if (this.selectedControlLocalId === localId && (Date.now() - this.lastSelectedAt) < 300) {
                return;
            }

            if (!window.confirm('Remove this control from the canvas?')) {
                return;
            }

            const found = this.findControlByLocalId(localId);
            if (found) {
                found.list.splice(found.index, 1);
                this.recomputeDerivedStateKeys();
            }
            if (this.selectedControlLocalId === localId) {
                this.selectedControlLocalId = null;
                this.selectedControl = null;
            }
        },

        loadDefinition(this: any, definition: any): void {
            if (!definition || typeof definition !== 'object') {
                return;
            }
            const form = definition.form || definition;
            this.formTitle = definition.title ? String(definition.title).trim() : '';
            const controlSchema = form.controlSchema || {};
            const dataSchema = form.dataSchema || { properties: {} };
            const layout = Array.isArray(controlSchema.layout) ? controlSchema.layout : [];

            this.validationDisplayMode = controlSchema.validation?.messagePlacement || this.validationDisplayMode;

            const theme = controlSchema.theme || {};
            this.selectedTheme = theme.preset || this.selectedTheme;
            if (theme.custom && typeof theme.custom === 'object') {
                this.customTheme = {
                    accent: (theme.custom as any).accent || this.customTheme.accent,
                    bg: (theme.custom as any).bg || this.customTheme.bg,
                    surface: (theme.custom as any).surface || this.customTheme.surface,
                    text: (theme.custom as any).text || this.customTheme.text
                };
            }

            this.controls = this.hydrateControls(layout, dataSchema, '#');
            this.recomputeDerivedStateKeys();
            const hydratedRules = this.hydrateRules(Array.isArray(definition.rules) ? definition.rules : []);
            this.deriveDecisionTableFromRules(hydratedRules);
            this.clearSelection();
        },

        deriveDecisionTableFromRules(this: any, sourceRules: any[] = []): void {
            const grouped = new Map<string, any[]>();
            sourceRules.forEach((rule: any) => {
                const scope = String(rule?.scope || 'form').trim() || 'form';
                if (!grouped.has(scope)) {
                    grouped.set(scope, []);
                }
                grouped.get(scope)!.push(rule);
            });

            this.decisionTables = [];

            if (grouped.size === 0) {
                const empty = this.newDecisionTable('Table 1');
                this.decisionTables.push(empty);
                this.selectDecisionTable(empty.id);
                return;
            }

            let tableCount = 0;
            grouped.forEach((rulesForScope: any[], scope: string) => {
                tableCount += 1;
                const table = this.newDecisionTable(`Table ${tableCount}`);
                table.scope = scope;
                table.rules = rulesForScope;

                const inputMap = new Map<string, string>();
                const actionMap = new Map<string, string>();
                const inputColumns: any[] = [];
                const actionColumns: any[] = [];

                table.rules.forEach((rule: any) => {
                    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
                    conditions.forEach((condition: any) => {
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
                    actions.forEach((action: any) => {
                        const kind = String(action?.kind || '').trim().toLowerCase();
                        if (kind === 'derive' || kind === 'set' || (action as any)?.effect === 'derive') {
                            const target = String(action?.target || '').trim();
                            if (!target) {
                                return;
                            }
                            let expressionText = '';
                            if (typeof action?.expression === 'string') {
                                expressionText = action.expression;
                            } else if (action?.expression !== undefined && action?.expression !== null) {
                                try {
                                    expressionText = JSON.stringify(action.expression);
                                } catch (_err) {
                                    expressionText = String(action.expression);
                                }
                            }
                            const key = `derive::${target}::${expressionText}`;
                            if (actionMap.has(key)) {
                                return;
                            }
                            const column = this.newDecisionActionColumn({
                                kind: 'derive',
                                deriveTarget: target,
                                deriveExpression: expressionText
                            });
                            actionMap.set(key, column.id);
                            actionColumns.push(column);
                            return;
                        }

                        if (kind === 'api' || (action as any)?.endpoint) {
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
                        const intent = this.parseActionIntent(action?.intent || `${(action as any)?.effect || 'visible'}:${this.normalizeBoolean((action as any)?.value) ? 'true' : 'false'}`);
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

                table.rules.forEach((rule: any) => {
                    rule.runOnInit = rule.runOnInit === true;
                    rule.decisionInputs = {};
                    rule.decisionActions = {};

                    table.decisionInputColumns.forEach((column: any) => {
                        rule.decisionInputs[column.id] = { op: 'eq', value: '' };
                    });
                    table.decisionActionColumns.forEach((column: any) => {
                        rule.decisionActions[column.id] = '';
                    });

                    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
                    conditions.forEach((condition: any) => {
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
                        const cell: any = { op, value: '' };
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
                    actions.forEach((action: any) => {
                        const kind = String(action?.kind || '').trim().toLowerCase();
                        if (kind === 'derive' || kind === 'set' || (action as any)?.effect === 'derive') {
                            const target = String(action?.target || '').trim();
                            if (!target) {
                                return;
                            }
                            let expressionText = '';
                            if (typeof action?.expression === 'string') {
                                expressionText = action.expression;
                            } else if (action?.expression !== undefined && action?.expression !== null) {
                                try {
                                    expressionText = JSON.stringify(action.expression);
                                } catch (_err) {
                                    expressionText = String(action.expression);
                                }
                            }
                            const key = `derive::${target}::${expressionText}`;
                            const columnId = actionMap.get(key);
                            if (!columnId) {
                                return;
                            }
                            rule.decisionActions[columnId] = 'true';
                            return;
                        }

                        if (kind === 'api' || (action as any)?.endpoint) {
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
                        const intent = this.parseActionIntent(action?.intent || `${(action as any)?.effect || 'visible'}:${this.normalizeBoolean((action as any)?.value) ? 'true' : 'false'}`);
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

        hydrateRules(this: any, rules: any[]): any[] {
            return rules.map((rule: any, index: number) => {
                const hydratedActions = Array.isArray(rule.actions) && rule.actions.length > 0
                    ? rule.actions
                        .map((action: any) => {
                            const kind = String(action?.kind || '').trim().toLowerCase();
                            if (kind === 'derive' || kind === 'set' || (action as any)?.effect === 'derive') {
                                const target = String(action?.target || '').trim();
                                if (!target) {
                                    return null;
                                }

                                let expression = '';
                                if (typeof action?.expression === 'string') {
                                    expression = action.expression;
                                } else if (action?.expression !== undefined && action?.expression !== null) {
                                    try {
                                        expression = JSON.stringify(action.expression);
                                    } catch (_err) {
                                        expression = String(action.expression);
                                    }
                                }

                                return {
                                    kind: 'derive',
                                    target,
                                    expression
                                };
                            }

                            if (kind === 'api' || (action as any)?.endpoint) {
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
                                intent: `${String((action as any)?.effect || 'visible').trim() || 'visible'}:${this.normalizeBoolean((action as any)?.value) ? 'true' : 'false'}`
                            };
                        })
                        .filter((x: any): x is any => x !== null)
                    : [{
                        kind: 'ui',
                        target: String(rule.target || ''),
                        intent: `${String(rule.effect || 'visible')}:${this.normalizeBoolean(rule.value) ? 'true' : 'false'}`
                    }].filter((action: any) => action.target);

                let conditions = [this.newConditionRow()];
                const base: any = {
                    id: String(rule.id || `rule-${index + 1}`),
                    scope: String(rule.scope || 'form'),
                    runOnInit: rule.runOnInit === true,
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

                if ((rule.when as any).fact && (rule.when as any).op) {
                    base.conditions = [{
                        field: String((rule.when as any).fact || ''),
                        op: String((rule.when as any).op || 'eq'),
                        value: '',
                        valuesText: ''
                    }];
                    base.conditionMatchMode = 'all';
                    if (Array.isArray((rule.when as any).values)) {
                        base.conditions[0].valuesText = (rule.when as any).values.join(', ');
                    }
                    if ((rule.when as any).value !== undefined && (rule.when as any).value !== null) {
                        base.conditions[0].value = String((rule.when as any).value);
                    }
                    return base;
                }

                if ((rule.when as any).all && Array.isArray((rule.when as any).all)) {
                    const mapped = (rule.when as any).all.map((condition: any) => this.hydrateCondition(condition)).filter((x: any): x is any => x !== null);
                    if (mapped.length > 0) {
                        base.conditions = mapped;
                        base.conditionMatchMode = 'all';
                    }
                    return base;
                }

                if ((rule.when as any).any && Array.isArray((rule.when as any).any)) {
                    const mapped = (rule.when as any).any.map((condition: any) => this.hydrateCondition(condition)).filter((x: any): x is any => x !== null);
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

        hydrateCondition(this: any, condition: any): any {
            if (!condition || typeof condition !== 'object') {
                return null;
            }
            if ((condition as any).fact && (condition as any).op) {
                return {
                    field: String((condition as any).fact || ''),
                    op: String((condition as any).op || 'eq'),
                    value: (condition as any).value !== undefined && (condition as any).value !== null ? String((condition as any).value) : '',
                    valuesText: Array.isArray((condition as any).values) ? (condition as any).values.join(', ') : ''
                };
            }
            return null;
        },

        hydrateControls(this: any, layout: any[], dataSchema: any, pointerBase: string): FormControl[] {
            if (!Array.isArray(layout)) {
                return [];
            }

            return layout.map((item: any, index: number) => {
                const schemaNode = this.resolveSchemaNode(dataSchema, item.pointer || '');
                const inferredWidget = this.inferHydratedWidget(item);
                const name = this.pointerLeafName(item.pointer || '', index);
                const base: any = {
                    localId: this.newControlLocalId(),
                    id: this.ensureControlId(item.id),
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
                    placeholder: String((schemaNode as any)?.placeholder || ''),
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
                    assetKey: String((item.assetRef as any)?.assetKey || ''),
                    assetVersion: Number((item.assetRef as any)?.version || 0),
                    assetHash: String((item.assetRef as any)?.sha256 || ''),
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
                    repeatMinItems: Number((schemaNode as any)?.minItems || item.minItems || 0),
                    repeatMaxItems: Number((schemaNode as any)?.maxItems || item.maxItems || 0),
                    repeatAllowAdd: item.allowAdd !== false,
                    repeatAllowDelete: item.allowDelete !== false,
                    repeatAllowReorder: item.allowReorder === true,
                    tableColumns: this.hydrateTableColumns(item),
                    tableMinItems: Number((schemaNode as any)?.minItems || item.minItems || 0),
                    tableMaxItems: Number((schemaNode as any)?.maxItems || item.maxItems || 0),
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
                        : ((schemaNode as any)?.items || dataSchema);
                    const childPointerBase = inferredWidget === 'group'
                        ? `${pointerBase}/properties/${name}`
                        : `${pointerBase}/properties/${name}/items`;
                    base.children = this.hydrateControls(item.children, childSchema, childPointerBase);
                }

                return this.normalizeControl(base);
            });
        },

        inferHydratedWidget(this: any, item: any): string {
            if (item.widget === 'repeat' && Array.isArray(item.columns) && item.columns.length > 0 && (!Array.isArray(item.children) || item.children.length === 0)) {
                return 'table';
            }
            return String(item.widget || 'text');
        },

        pointerLeafName(this: any, pointer: string, fallbackIndex: number): string {
            const raw = String(pointer || '');
            const parts = raw.split('/').filter(Boolean);
            for (let i = parts.length - 1; i >= 0; i -= 1) {
                if (parts[i] !== 'properties' && parts[i] !== 'items') {
                    return this.toIdentifier(parts[i]);
                }
            }
            return `field${fallbackIndex + 1}`;
        },

        resolveSchemaNode(this: any, rootSchema: any, pointer: string): any {
            if (!rootSchema || !pointer) {
                return null;
            }

            const parts = String(pointer).split('/').filter(Boolean);
            let current = rootSchema;
            for (let i = 0; i < parts.length; i += 1) {
                const part = parts[i];
                if (part === 'properties') {
                    const key = parts[i + 1];
                    current = (current as any)?.properties?.[key] || null;
                    i += 1;
                    continue;
                }
                if (part === 'items') {
                    current = (current as any)?.items || null;
                }
            }

            return current || null;
        },

        inferSchemaType(this: any, schemaNode: any, item: any): string {
            if ((schemaNode as any)?.type) {
                return String((schemaNode as any).type);
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

        hydrateDefaultValue(this: any, schemaNode: any, item: any): unknown {
            if (schemaNode && Object.prototype.hasOwnProperty.call(schemaNode, 'default')) {
                return (schemaNode as any).default;
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

        hydrateOptions(this: any, item: any, schemaNode: any): any[] {
            if (Array.isArray(item.options) && item.options.length > 0) {
                return item.options.map((option: any) => ({
                    label: String(option.label || option.value || ''),
                    value: String(option.value || ''),
                    autoValue: false
                }));
            }

            const enumValues = Array.isArray((schemaNode as any)?.enum)
                ? (schemaNode as any).enum
                : (Array.isArray((schemaNode as any)?.items?.enum) ? (schemaNode as any).items.enum : []);

            return enumValues.map((value: unknown) => ({
                label: String(value),
                value: String(value),
                autoValue: false
            }));
        },

        hydrateTableColumns(this: any, item: any): any[] {
            if (!Array.isArray(item.columns)) {
                return [];
            }

            return item.columns.map((column: any, index: number) => ({
                key: this.toIdentifier(column.key || `column${index + 1}`),
                title: String(column.title || column.key || `Column ${index + 1}`),
                type: String(column.type || 'string'),
                required: column.required === true,
                visible: column.visible !== false
            }));
        },

        generate(this: any): void {
            this.controlSchemaHtml = this.generateControlSchema();
            this.dataSchemaYaml = this.generateDataSchema();
        },

        generateControlSchema(this: any): string {
            const controlsHtml = this.controls
                .map((control: any) => this.controlToHtml(control, 1))
                .join('\n');
            const titleAttr = this.formTitle ? ` data-title="${this.escapeHtml(this.formTitle)}"` : '';
            return `<form th:fragment="form"${titleAttr}>\n${controlsHtml}\n</form>`;
        },

        generateDataSchema(this: any): string {
            const properties = this.buildSchemaProperties();
            return this.toYaml({ properties });
        },

        buildSchemaProperties(this: any): Record<string, any> {
            const properties: Record<string, any> = {};
            this.controls.forEach((control: FormControl) => {
                this.addControlToSchema(properties, control);
            });
            return properties;
        },

        addControlToSchema(this: any, properties: Record<string, any>, control: FormControl): void {
            if (!control.stateKey || !control.name) {
                return;
            }

            const widget = String(control.widget || 'text');
            if (widget === 'section' || widget === 'group' || widget === 'button' || widget === 'message') {
                if (widget === 'group' || widget === 'section') {
                    const groupSchema: any = { type: 'object', properties: {} };
                    if (Array.isArray(control.children)) {
                        control.children.forEach((child: FormControl) => {
                            this.addControlToSchema(groupSchema.properties, child);
                        });
                    }
                    properties[control.stateKey] = groupSchema;
                }
                return;
            }

            const schemaType = this.inferSchemaType(null, control);
            const prop: any = { type: schemaType };

            if (control.required) {
                prop.required = true;
            }

            if (control.hint) {
                prop.description = control.hint;
            }

            if (control.placeholder) {
                prop.placeholder = control.placeholder;
            }

            if (control.defaultValue !== undefined && control.defaultValue !== '' && control.defaultValue !== null) {
                prop.default = control.defaultValue;
            }

            if (Array.isArray(control.options) && control.options.length > 0) {
                prop.enum = control.options.map((opt: any) => opt.value);
            }

            properties[control.stateKey] = prop;
        },

        controlToHtml(this: any, control: FormControl, indentLevel: number = 1): string {
            const indent = ' '.repeat(indentLevel * 2);
            const widget = String(control.widget || 'text');
            const name = control.stateKey || control.name || '';

            if (widget === 'section') {
                const childrenHtml = Array.isArray(control.children)
                    ? control.children.map((c: FormControl) => this.controlToHtml(c, indentLevel + 1)).join('\n')
                    : '';
                return `${indent}<fieldset>\n${indent}  <legend>${control.label}</legend>\n${childrenHtml}\n${indent}</fieldset>`;
            }

            if (widget === 'group') {
                const childrenHtml = Array.isArray(control.children)
                    ? control.children.map((c: FormControl) => this.controlToHtml(c, indentLevel + 1)).join('\n')
                    : '';
                return `${indent}<div class="form-group">\n${childrenHtml}\n${indent}</div>`;
            }

            if (widget === 'message') {
                return `${indent}<div class="form-message" data-tone="${control.messageTone}">${control.messageBody}</div>`;
            }

            if (widget === 'button') {
                return `${indent}<button type="button" class="btn btn-${control.buttonVariant}">${control.label}</button>`;
            }

            if (widget === 'repeat' || widget === 'table') {
                return `${indent}<div class="form-repeat" data-widget="${widget}" name="${name}"></div>`;
            }

            const attrs = [`name="${name}"`];
            if (control.required) {
                attrs.push('required');
            }
            if (control.placeholder) {
                attrs.push(`placeholder="${this.escapeHtml(control.placeholder)}"`);
            }
            if (control.hint) {
                attrs.push(`title="${this.escapeHtml(control.hint)}"`);
            }

            const attrStr = attrs.join(' ');
            const label = control.label ? `${indent}  <label for="${name}">${this.escapeHtml(control.label)}</label>\n` : '';

            let inputHtml = '';
            switch (widget) {
                case 'textarea':
                    inputHtml = `${indent}  <textarea id="${name}" ${attrStr}></textarea>`;
                    break;
                case 'select':
                case 'radio':
                case 'checkbox':
                    const options = Array.isArray(control.options)
                        ? control.options.map((opt: any) => `${indent}    <option value="${this.escapeHtml(opt.value)}">${this.escapeHtml(opt.label)}</option>`).join('\n')
                        : '';
                    inputHtml = `${indent}  <select id="${name}" ${attrStr}>\n${options}\n${indent}  </select>`;
                    break;
                case 'date':
                    inputHtml = `${indent}  <input type="date" id="${name}" ${attrStr} />`;
                    break;
                case 'datetime':
                    inputHtml = `${indent}  <input type="datetime-local" id="${name}" ${attrStr} />`;
                    break;
                case 'number':
                    inputHtml = `${indent}  <input type="number" id="${name}" ${attrStr} />`;
                    break;
                case 'booleanCheckbox':
                    inputHtml = `${indent}  <input type="checkbox" id="${name}" ${attrStr} />`;
                    break;
                case 'upload':
                    inputHtml = `${indent}  <input type="file" id="${name}" ${attrStr} ${control.uploadAllowMultiple ? 'multiple' : ''} />`;
                    break;
                case 'image':
                    inputHtml = `${indent}  <img id="${name}" alt="${this.escapeHtml(control.altText)}" />`;
                    break;
                default:
                    inputHtml = `${indent}  <input type="text" id="${name}" ${attrStr} />`;
            }

            return `${label}${inputHtml}`;
        },

        toYaml(this: any, obj: any): string {
            const lines: string[] = [];
            const stringify = (val: any, indent: number = 0): string => {
                const spaces = ' '.repeat(indent);
                if (val === null || val === undefined) {
                    return 'null';
                }
                if (typeof val === 'boolean') {
                    return val ? 'true' : 'false';
                }
                if (typeof val === 'number') {
                    return String(val);
                }
                if (typeof val === 'string') {
                    return `"${val.replace(/"/g, '\\"')}"`;
                }
                if (Array.isArray(val)) {
                    return `[\n${val.map(item => `${spaces}  - ${stringify(item, indent + 2)}`).join('\n')}\n${spaces}]`;
                }
                if (typeof val === 'object') {
                    const entries = Object.entries(val).filter(([, v]) => v !== undefined);
                    return entries.map(([k, v]) => `${spaces}${k}: ${stringify(v, indent + 2)}`).join('\n');
                }
                return String(val);
            };

            return stringify(obj);
        },

        escapeHtml(this: any, text: string): string {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },
        
        ...controlsApi,
        ...schemaApi,
        ...propertiesApi,
        ...interactionsApi,
        ...rulesApi,
    };
}

export const formDesignerFactory = formDesigner;