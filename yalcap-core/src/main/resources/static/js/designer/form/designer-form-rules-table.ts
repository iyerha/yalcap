interface DecisionInputCell {
    op: string;
    value: string;
}

interface RuleCondition {
    field: string;
    op: string;
    value: string;
    valuesText?: string;
}

interface RuleAction {
    target?: string;
    intent?: string;
}

interface DecisionTableRule {
    id: string;
    scope?: string;
    runOnInit?: boolean;
    whenFact?: string;
    whenOp?: string;
    whenValue?: string;
    whenValuesText?: string;
    whenJsonLogic?: string;
    conditionMatchMode?: string;
    conditions: RuleCondition[];
    actions: RuleAction[];
    decisionInputs: Record<string, DecisionInputCell>;
    decisionActions: Record<string, string>;
}

interface OperatorOption {
    value: string;
    label: string;
}

interface FormDesignerRulesTable {
    activeDecisionTableId: string | null;
    nextDecisionTableSeq: number;
    nextDecisionColumnSeq: number;
    decisionTableScope: string;
    decisionTableDescription: string;
    rules: DecisionTableRule[];
    decisionInputColumns: DecisionInputColumn[];
    decisionActionColumns: DecisionActionColumn[];
    syncCurrentDecisionTable(): void;
    newDecisionTable(name?: string): any;
    ensureDecisionTables(): void;
    selectDecisionTable(tableId: string): void;
    addDecisionTable(): void;
    removeDecisionTable(tableId: string): void;
    addRule(): void;
    insertRuleAfter(index: number): void;
    newConditionRow(): RuleCondition;
    addRuleCondition(rule: DecisionTableRule): void;
    removeRuleCondition(rule: DecisionTableRule, conditionIndex: number): void;
    moveRuleUp(index: number): void;
    moveRuleDown(index: number): void;
    removeRule(index: number): void;
    addRuleAction(rule: DecisionTableRule): void;
    removeRuleAction(rule: DecisionTableRule, actionIndex: number): void;
    ensureRuleRowDefaults(rule: DecisionTableRule): void;
    primaryCondition(rule: DecisionTableRule): RuleCondition;
    primaryAction(rule: DecisionTableRule): RuleAction;
    isSetMembershipOperator(op: string): boolean;
    newDecisionInputColumn(stateKey?: string): DecisionInputColumn;
    newDecisionActionColumn(target?: string, property?: string): DecisionActionColumn;
    ensureDecisionTableSchema(): void;
    addDecisionInputColumn(): void;
    insertDecisionInputColumnAfter(columnId: string): void;
    removeDecisionInputColumn(columnId: string): void;
    addDecisionActionColumn(): void;
    insertDecisionActionColumnAfter(columnId: string): void;
    removeDecisionActionColumn(columnId: string): void;
    decisionInputCell(rule: DecisionTableRule, columnId: string): string;
    setDecisionInputCell(rule: DecisionTableRule, columnId: string, value: string): void;
    decisionInputOperator(rule: DecisionTableRule, columnId: string): string;
    setDecisionInputOperator(rule: DecisionTableRule, columnId: string, op: string): void;
    operatorOptionsForInputColumn(column: DecisionInputColumn): OperatorOption[];
    ruleInputColumnMeta(column: DecisionInputColumn): StateKeyOption | null;
    ruleInputColumnType(column: DecisionInputColumn): string;
    inputCellValueInputType(rule: DecisionTableRule, columnId: string, column: DecisionInputColumn): string;
    decisionMatrixGridStyle(): string;
    decisionActionCell(rule: DecisionTableRule, columnId: string): string;
    setDecisionActionCell(rule: DecisionTableRule, columnId: string, value: string): void;
    availableStateKeys(): string[];
    availableStateKeyOptions(): StateKeyOption[];
    [key: string]: any;
}

(function initFormDesignerRulesTable(windowAny: any) {
    const api: FormDesignerRulesTable = {
        activeDecisionTableId: null,
        nextDecisionTableSeq: 0,
        nextDecisionColumnSeq: 0,
        decisionTableScope: 'form',
        decisionTableDescription: '',
        rules: [],
        decisionInputColumns: [],
        decisionActionColumns: [],

        syncCurrentDecisionTable(): void {
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

        newDecisionTable(name: string = ''): any {
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

        ensureDecisionTables(): void {
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

        selectDecisionTable(tableId: string): void {
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

        addDecisionTable(): void {
            this.syncCurrentDecisionTable();
            const table = this.newDecisionTable();
            this.decisionTables.push(table);
            this.selectDecisionTable(table.id);
        },

        removeDecisionTable(tableId: string): void {
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

        addRule(): void {
            const nextIndex = this.rules.length + 1;
            this.ensureDecisionTableSchema();
            const decisionInputs: Record<string, DecisionInputCell> = {};
            const decisionActions: Record<string, string> = {};
            this.decisionInputColumns.forEach((column: DecisionInputColumn) => {
                decisionInputs[column.id] = { op: 'eq', value: '' };
            });
            this.decisionActionColumns.forEach((column: DecisionActionColumn) => {
                decisionActions[column.id] = '';
            });
            this.rules.push({
                id: `rule-${nextIndex}`,
                scope: 'form',
                runOnInit: false,
                whenFact: '',
                whenOp: 'eq',
                whenValue: '',
                whenValuesText: '',
                whenJsonLogic: '',
                conditionMatchMode: 'all',
                conditions: [this.newConditionRow()],
                actions: [
                    { target: '', intent: 'visible:true' }
                ],
                decisionInputs,
                decisionActions
            });
        },

        insertRuleAfter(index: number): void {
            const nextIndex = this.rules.length + 1;
            this.ensureDecisionTableSchema();
            const decisionInputs: Record<string, DecisionInputCell> = {};
            const decisionActions: Record<string, string> = {};
            this.decisionInputColumns.forEach((column: DecisionInputColumn) => {
                decisionInputs[column.id] = { op: 'eq', value: '' };
            });
            this.decisionActionColumns.forEach((column: DecisionActionColumn) => {
                decisionActions[column.id] = '';
            });
            const rule: DecisionTableRule = {
                id: `rule-${nextIndex}`,
                scope: 'form',
                runOnInit: false,
                whenFact: '',
                whenOp: 'eq',
                whenValue: '',
                whenValuesText: '',
                whenJsonLogic: '',
                conditionMatchMode: 'all',
                conditions: [this.newConditionRow()],
                actions: [
                    { target: '', intent: 'visible:true' }
                ],
                decisionInputs,
                decisionActions
            };

            if (index < 0 || index >= this.rules.length) {
                this.rules.push(rule);
                return;
            }
            this.rules.splice(index + 1, 0, rule);
        },

        newConditionRow(): RuleCondition {
            return { field: '', op: 'eq', value: '', valuesText: '' };
        },

        addRuleCondition(rule: DecisionTableRule): void {
            if (!rule || !Array.isArray(rule.conditions)) {
                return;
            }
            rule.conditions.push(this.newConditionRow());
        },

        removeRuleCondition(rule: DecisionTableRule, conditionIndex: number): void {
            if (!rule || !Array.isArray(rule.conditions) || rule.conditions.length <= 1) {
                return;
            }
            if (conditionIndex < 0 || conditionIndex >= rule.conditions.length) {
                return;
            }
            rule.conditions.splice(conditionIndex, 1);
        },

        moveRuleUp(index: number): void {
            if (index <= 0 || index >= this.rules.length) {
                return;
            }
            const prev = this.rules[index - 1];
            this.rules[index - 1] = this.rules[index];
            this.rules[index] = prev;
        },

        moveRuleDown(index: number): void {
            if (index < 0 || index >= this.rules.length - 1) {
                return;
            }
            const next = this.rules[index + 1];
            this.rules[index + 1] = this.rules[index];
            this.rules[index] = next;
        },

        removeRule(index: number): void {
            if (index < 0 || index >= this.rules.length) {
                return;
            }
            this.rules.splice(index, 1);
        },

        addRuleAction(rule: DecisionTableRule): void {
            if (!rule || !Array.isArray(rule.actions)) {
                return;
            }
            rule.actions.push({ target: '', intent: 'visible:true' });
        },

        removeRuleAction(rule: DecisionTableRule, actionIndex: number): void {
            if (!rule || !Array.isArray(rule.actions) || rule.actions.length <= 1) {
                return;
            }
            if (actionIndex < 0 || actionIndex >= rule.actions.length) {
                return;
            }
            rule.actions.splice(actionIndex, 1);
        },

        ensureRuleRowDefaults(rule: DecisionTableRule): void {
            if (!rule) {
                return;
            }

            this.ensureDecisionTableSchema();

            if (!Array.isArray(rule.conditions)) {
                rule.conditions = [];
            }
            if (!Array.isArray(rule.actions)) {
                rule.actions = [];
            }

            if (rule.conditions.length === 0) {
                rule.conditions.push(this.newConditionRow());
            }
            if (rule.actions.length === 0) {
                rule.actions.push({ target: '', intent: 'visible:true' });
            }

            if (!rule.conditionMatchMode) {
                rule.conditionMatchMode = 'all';
            }
            if (!rule.scope) {
                rule.scope = this.decisionTableScope || 'form';
            }
            if (rule.runOnInit !== true) {
                rule.runOnInit = false;
            }

            if (!rule.decisionInputs || typeof rule.decisionInputs !== 'object') {
                rule.decisionInputs = {};
            }
            if (!rule.decisionActions || typeof rule.decisionActions !== 'object') {
                rule.decisionActions = {};
            }

            this.decisionInputColumns.forEach((column: DecisionInputColumn) => {
                if (rule.decisionInputs[column.id] === undefined) {
                    rule.decisionInputs[column.id] = { op: 'eq', value: '' };
                    return;
                }

                const existing = rule.decisionInputs[column.id];
                if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
                    rule.decisionInputs[column.id] = { op: 'eq', value: String(existing || '') };
                }

                if (!rule.decisionInputs[column.id].op) {
                    rule.decisionInputs[column.id].op = 'eq';
                }
            });
            this.decisionActionColumns.forEach((column: DecisionActionColumn) => {
                if (rule.decisionActions[column.id] === undefined) {
                    rule.decisionActions[column.id] = '';
                }
            });
        },

        primaryCondition(rule: DecisionTableRule): RuleCondition {
            this.ensureRuleRowDefaults(rule);
            return rule.conditions[0];
        },

        primaryAction(rule: DecisionTableRule): RuleAction {
            this.ensureRuleRowDefaults(rule);
            return rule.actions[0];
        },

        isSetMembershipOperator(op: string): boolean {
            return op === 'in' || op === 'notIn';
        },

        newDecisionInputColumn(stateKey: string = ''): DecisionInputColumn {
            const next = this.nextDecisionColumnSeq;
            this.nextDecisionColumnSeq += 1;
            return {
                id: `in-${next}`,
                stateKey: String(stateKey || '').trim()
            };
        },

        newDecisionActionColumn(target: string = '', property: string = 'visible'): DecisionActionColumn {
            const config = (target && typeof target === 'object' && !Array.isArray(target))
                ? target
                : { target, property };
            const next = this.nextDecisionColumnSeq;
            this.nextDecisionColumnSeq += 1;
            return {
                id: `out-${next}`,
                kind: (() => {
                    const raw = String((config as any).kind || 'ui').trim().toLowerCase();
                    if (raw === 'api') {
                        return 'api';
                    }
                    if (raw === 'derive') {
                        return 'derive';
                    }
                    return 'ui';
                })(),
                target: String((config as any).target || '').trim(),
                property: String((config as any).property || 'visible').trim() || 'visible',
                apiEndpoint: String((config as any).apiEndpoint || '').trim(),
                apiMethod: String((config as any).apiMethod || 'get').trim().toLowerCase() || 'get',
                apiTrigger: String((config as any).apiTrigger || 'change').trim().toLowerCase() || 'change',
                apiTarget: String((config as any).apiTarget || '').trim(),
                apiSwap: String((config as any).apiSwap || 'innerHTML').trim() || 'innerHTML',
                apiValsTemplate: String((config as any).apiValsTemplate || '').trim(),
                deriveTarget: String((config as any).deriveTarget || (config as any).target || '').trim(),
                deriveExpression: String((config as any).deriveExpression || '').trim()
            };
        },

        ensureDecisionTableSchema(): void {
            if (!Array.isArray(this.decisionInputColumns)) {
                this.decisionInputColumns = [];
            }
            if (!Array.isArray(this.decisionActionColumns)) {
                this.decisionActionColumns = [];
            }

            if (this.decisionInputColumns.length === 0) {
                const firstStateKey = this.availableStateKeys()[0] || '';
                this.decisionInputColumns.push(this.newDecisionInputColumn(firstStateKey));
            }
            if (this.decisionActionColumns.length === 0) {
                this.decisionActionColumns.push(this.newDecisionActionColumn('', 'visible'));
            }
        },

        addDecisionInputColumn(): void {
            this.ensureDecisionTableSchema();
            const column = this.newDecisionInputColumn('');
            this.decisionInputColumns.push(column);
            this.rules.forEach((rule: DecisionTableRule) => {
                this.ensureRuleRowDefaults(rule);
                rule.decisionInputs[column.id] = { op: 'eq', value: '' };
            });
        },

        insertDecisionInputColumnAfter(columnId: string): void {
            this.ensureDecisionTableSchema();
            const column = this.newDecisionInputColumn('');
            const index = this.decisionInputColumns.findIndex((item: DecisionInputColumn) => item.id === columnId);
            if (index < 0) {
                this.decisionInputColumns.push(column);
            } else {
                this.decisionInputColumns.splice(index + 1, 0, column);
            }
            this.rules.forEach((rule: DecisionTableRule) => {
                this.ensureRuleRowDefaults(rule);
                rule.decisionInputs[column.id] = { op: 'eq', value: '' };
            });
        },

        removeDecisionInputColumn(columnId: string): void {
            if (!columnId || this.decisionInputColumns.length <= 1) {
                return;
            }
            const index = this.decisionInputColumns.findIndex((column: DecisionInputColumn) => column.id === columnId);
            if (index >= 0) {
                this.decisionInputColumns.splice(index, 1);
            }
            this.rules.forEach((rule: DecisionTableRule) => {
                if (rule && rule.decisionInputs && Object.prototype.hasOwnProperty.call(rule.decisionInputs, columnId)) {
                    delete rule.decisionInputs[columnId];
                }
            });
            this.syncCurrentDecisionTable();
        },

        addDecisionActionColumn(): void {
            this.ensureDecisionTableSchema();
            const column = this.newDecisionActionColumn('', 'visible');
            this.decisionActionColumns.push(column);
            this.rules.forEach((rule: DecisionTableRule) => {
                this.ensureRuleRowDefaults(rule);
                rule.decisionActions[column.id] = '';
            });
        },

        insertDecisionActionColumnAfter(columnId: string): void {
            this.ensureDecisionTableSchema();
            const column = this.newDecisionActionColumn('', 'visible');
            const index = this.decisionActionColumns.findIndex((item: DecisionActionColumn) => item.id === columnId);
            if (index < 0) {
                this.decisionActionColumns.push(column);
            } else {
                this.decisionActionColumns.splice(index + 1, 0, column);
            }
            this.rules.forEach((rule: DecisionTableRule) => {
                this.ensureRuleRowDefaults(rule);
                rule.decisionActions[column.id] = '';
            });
        },

        removeDecisionActionColumn(columnId: string): void {
            if (!columnId || this.decisionActionColumns.length <= 1) {
                return;
            }
            const index = this.decisionActionColumns.findIndex((column: DecisionActionColumn) => column.id === columnId);
            if (index >= 0) {
                this.decisionActionColumns.splice(index, 1);
            }
            this.rules.forEach((rule: DecisionTableRule) => {
                if (rule && rule.decisionActions && Object.prototype.hasOwnProperty.call(rule.decisionActions, columnId)) {
                    delete rule.decisionActions[columnId];
                }
            });
            this.syncCurrentDecisionTable();
        },

        decisionInputCell(rule: DecisionTableRule, columnId: string): string {
            this.ensureRuleRowDefaults(rule);
            return String(rule.decisionInputs[columnId]?.value || '');
        },

        setDecisionInputCell(rule: DecisionTableRule, columnId: string, value: string): void {
            this.ensureRuleRowDefaults(rule);
            const cell = rule.decisionInputs[columnId] || { op: 'eq', value: '' };
            cell.value = String(value || '');
            rule.decisionInputs[columnId] = cell;
        },

        decisionInputOperator(rule: DecisionTableRule, columnId: string): string {
            this.ensureRuleRowDefaults(rule);
            return String(rule.decisionInputs[columnId]?.op || 'eq');
        },

        setDecisionInputOperator(rule: DecisionTableRule, columnId: string, op: string): void {
            this.ensureRuleRowDefaults(rule);
            const cell = rule.decisionInputs[columnId] || { op: 'eq', value: '' };
            cell.op = String(op || 'eq').trim() || 'eq';
            if (cell.op === 'exists') {
                cell.value = 'true';
            }
            rule.decisionInputs[columnId] = cell;
        },

        operatorOptionsForInputColumn(column: DecisionInputColumn): OperatorOption[] {
            const type = this.ruleInputColumnType(column);
            if (type === 'boolean') {
                return [
                    { value: 'eq', label: '=' },
                    { value: 'ne', label: '!=' }
                ];
            }
            if (type === 'number' || type === 'integer') {
                return [
                    { value: 'eq', label: '=' },
                    { value: 'ne', label: '!=' },
                    { value: 'gt', label: '>' },
                    { value: 'gte', label: '>=' },
                    { value: 'lt', label: '<' },
                    { value: 'lte', label: '<=' }
                ];
            }
            return [
                { value: 'eq', label: '=' },
                { value: 'ne', label: '!=' },
                { value: 'gt', label: '>' },
                { value: 'gte', label: '>=' },
                { value: 'lt', label: '<' },
                { value: 'lte', label: '<=' },
                { value: 'in', label: 'in' },
                { value: 'notIn', label: 'not in' },
                { value: 'matches', label: 'matches' },
                { value: 'exists', label: 'exists' }
            ];
        },

        ruleInputColumnMeta(column: DecisionInputColumn): StateKeyOption | null {
            const key = String(column?.stateKey || '').trim();
            if (!key) {
                return null;
            }
            return this.availableStateKeyOptions().find((item: StateKeyOption) => item.key === key) || null;
        },

        ruleInputColumnType(column: DecisionInputColumn): string {
            const meta = this.ruleInputColumnMeta(column);
            if (!meta) {
                return 'string';
            }
            if (meta.type) {
                return String(meta.type).toLowerCase();
            }
            return 'string';
        },

        inputCellValueInputType(rule: DecisionTableRule, columnId: string, column: DecisionInputColumn): string {
            const op = this.decisionInputOperator(rule, columnId);
            if (op === 'exists') {
                return 'none';
            }
            if (this.ruleInputColumnType(column) === 'number' || this.ruleInputColumnType(column) === 'integer') {
                return 'number';
            }
            if (this.ruleInputColumnType(column) === 'boolean') {
                return 'boolean';
            }
            return 'text';
        },

        decisionMatrixGridStyle(): string {
            const inputCount = Math.max(1, Array.isArray(this.decisionInputColumns) ? this.decisionInputColumns.length : 0);
            const actionCount = Math.max(1, Array.isArray(this.decisionActionColumns) ? this.decisionActionColumns.length : 0);
            return `grid-template-columns: 64px repeat(${inputCount}, minmax(220px, 1fr)) repeat(${actionCount}, minmax(180px, 1fr)) 120px;`;
        },

        decisionActionCell(rule: DecisionTableRule, columnId: string): string {
            this.ensureRuleRowDefaults(rule);
            return String(rule.decisionActions[columnId] || '');
        },

        setDecisionActionCell(rule: DecisionTableRule, columnId: string, value: string): void {
            this.ensureRuleRowDefaults(rule);
            const raw = String(value || '').trim().toLowerCase();
            if (raw === 'true' || raw === 'false') {
                rule.decisionActions[columnId] = raw;
                return;
            }
            rule.decisionActions[columnId] = '';
        },

        availableStateKeys(): string[] {
            // Placeholder - will be implemented by mixin
            return [];
        },

        availableStateKeyOptions(): StateKeyOption[] {
            // Placeholder - will be implemented by mixin
            return [];
        }
    };

    windowAny.formDesignerRulesTable = api;
}(window));
