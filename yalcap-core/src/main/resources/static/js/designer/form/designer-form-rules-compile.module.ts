interface DecisionTable {
    id: string;
    name?: string;
    scope?: string;
    rules?: FormRule[];
    decisionInputColumns?: InputColumn[];
    decisionActionColumns?: ActionColumn[];
}

interface FormRule {
    id?: string;
    target?: string;
    intent?: string;
    effect?: string;
    value?: any;
    runOnInit?: boolean;
    actions?: Action[];
    conditions?: Condition[];
    conditionMatchMode?: string;
    whenJsonLogic?: string;
}

interface InputColumn {
    field?: string;
    operator?: string;
    value?: any;
}

interface ActionColumn {
    target?: string;
    action?: string;
    value?: any;
}

interface ApiAction {
    kind: 'api';
    endpoint: string;
    method: string;
    trigger: string;
    target: string;
    swap: string;
    valsTemplate: string;
    htmx: Record<string, string>;
}

interface DeriveAction {
    kind: 'derive';
    effect: 'set';
    target: string;
    expression: any;
}

interface UiAction {
    kind: 'ui';
    target: string;
    effect?: string;
    value?: any;
    [key: string]: any;
}

interface Action {
    kind?: string;
    endpoint?: string;
    method?: string;
    trigger?: string;
    target?: string;
    swap?: string;
    valsTemplate?: string;
    effect?: string;
    value?: any;
    intent?: string;
    expression?: any;
    htmx?: Record<string, string>;
}

interface Condition {
    field?: string;
    operator?: string;
    value?: any;
}

type ActionType = ApiAction | DeriveAction | UiAction;

interface NormalizedRule {
    id: string;
    scope: string;
    runOnInit: boolean;
    actions: ActionType[];
    when?: any;
}

export interface FormDesignerRulesCompile {
    decisionTables: DecisionTable[];
    normalizedRulesPayload(): NormalizedRule[];
    normalizeRuleActions(rule: FormRule, actionColumns: ActionColumn[], table: DecisionTable, index: number, apiErrors: string[]): ActionType[];
    normalizeRuleConditions(rule: FormRule, inputColumns: InputColumn[]): Condition[];
    buildNormalizedRule(rule: FormRule, actions: ActionType[], conditions: Condition[], table: DecisionTable, index: number): NormalizedRule;
    ensureDecisionTables(): void;
    syncCurrentDecisionTable(): void;
    buildActionsFromDecisionTable(rule: FormRule, columns: ActionColumn[]): Action[];
    buildHtmxAttributesForApiAction(apiAction: ApiAction): Record<string, string>;
    parseActionIntent(intent: string): Record<string, any>;
    parseJsonLogicText(text?: string): any;
    buildConditionsFromDecisionTable(rule: FormRule, columns: InputColumn[]): Condition[];
    validateConditionField(condition: Condition): string | null;
    buildJsonLogicFromSimpleCondition(condition: Condition): any;
    normalizeBoolean(value: any): boolean;
    [key: string]: any;
}

export const formDesignerRulesCompile: FormDesignerRulesCompile = {
    decisionTables: [],

    normalizedRulesPayload(): NormalizedRule[] {
        const out: NormalizedRule[] = [];
        this.ensureDecisionTables();
        this.syncCurrentDecisionTable();
        const apiErrors: string[] = [];

        this.decisionTables.forEach((table: DecisionTable) => {
            const tableRules = Array.isArray(table?.rules) ? table.rules : [];
            const inputColumns = Array.isArray(table?.decisionInputColumns) ? table.decisionInputColumns : [];
            const actionColumns = Array.isArray(table?.decisionActionColumns) ? table.decisionActionColumns : [];
            const tableScope = String(table?.scope || 'form').trim() || 'form';

            tableRules.forEach((rule: FormRule, index: number) => {
                if (!tableScope) return;
                const conditions = this.normalizeRuleConditions(rule, inputColumns);
                const normalizedActions = this.normalizeRuleActions(rule, actionColumns, table, index, apiErrors);
                if (normalizedActions.length === 0) return;

                const normalized = this.buildNormalizedRule(rule, normalizedActions, conditions, table, index);
                
                out.push(normalized);
            });
        });

        if (apiErrors.length > 0) {
            throw new Error(apiErrors.join(' '));
        }

        return out;
    },

    normalizeRuleActions(rule: FormRule, actionColumns: ActionColumn[], table: DecisionTable, index: number, apiErrors: string[]): ActionType[] {
        const actionsFromTable = this.buildActionsFromDecisionTable(rule, actionColumns);
        const actions = actionsFromTable.length > 0
            ? actionsFromTable
            : (Array.isArray(rule.actions)
                ? rule.actions
                : [{
                    target: rule.target,
                    intent: rule.intent,
                    effect: rule.effect,
                    value: rule.value
                }]);

        return actions
            .map((action: Action) => {
                const kind = String(action?.kind || '').trim().toLowerCase();
                if (kind === 'api' || action?.endpoint) {
                    const endpoint = String(action?.endpoint || '').trim();
                    if (!endpoint) {
                        apiErrors.push(`Table '${String(table?.name || table?.id || '').trim() || 'table'}', rule ${index + 1}: API action requires endpoint.`);
                        return null;
                    }

                    const apiAction: ApiAction = {
                        kind: 'api',
                        endpoint,
                        method: String(action?.method || 'get').trim().toLowerCase() || 'get',
                        trigger: String(action?.trigger || 'change').trim().toLowerCase() || 'change',
                        target: String(action?.target || '').trim(),
                        swap: String(action?.swap || 'innerHTML').trim() || 'innerHTML',
                        valsTemplate: String(action?.valsTemplate || '').trim(),
                        htmx: {}
                    };
                    apiAction.htmx = this.buildHtmxAttributesForApiAction(apiAction);
                    return apiAction;
                }

                if (kind === 'derive') {
                    const target = String(action?.target || '').trim();
                    if (!target) return null;

                    const expression = action?.expression;
                    if (expression === null || expression === undefined) return null;

                    return {
                        kind: 'derive',
                        effect: 'set',
                        target,
                        expression
                    } as DeriveAction;
                }

                return {
                    kind: 'ui',
                    target: String(action?.target || '').trim(),
                    ...this.parseActionIntent(action?.intent || `${action?.effect || 'visible'}:${this.normalizeBoolean(action?.value) ? 'true' : 'false'}`)
                } as UiAction;
            })
            .filter((action: any): action is ActionType => !!action)
            .filter((action: ActionType) => {
                if (action.kind === 'api') return !!(action as ApiAction).endpoint;
                if (action.kind === 'derive') return !!action.target && (action as DeriveAction).expression !== null && (action as DeriveAction).expression !== undefined;
                return !!action.target && !!(action as UiAction).effect;
            });
    },

    normalizeRuleConditions(rule: FormRule, inputColumns: InputColumn[]): Condition[] {
        const conditionsFromTable = this.buildConditionsFromDecisionTable(rule, inputColumns);
        const conditions = conditionsFromTable.length > 0
            ? conditionsFromTable
            : (Array.isArray(rule.conditions) ? rule.conditions : []);

        const conditionErrors = conditions
            .map((condition: Condition) => {
                const fieldError = this.validateConditionField(condition);
                if (fieldError) return fieldError;
                
                const operator = String(condition?.operator || '').trim();
                if (!operator) return 'Condition operator cannot be empty';
                
                return null;
            })
            .filter((err: string | null): err is string => !!err);

        if (conditionErrors.length > 0) {
            throw new Error(conditionErrors.join('; '));
        }

        return conditions;
    },

    buildNormalizedRule(rule: FormRule, actions: ActionType[], conditions: Condition[], table: DecisionTable, index: number): NormalizedRule {
        const scope = String(table?.scope || 'form').trim() || 'form';
        const normalized: NormalizedRule = {
            id: String(rule.id || '').trim() || `${table.id}-rule-${index + 1}`,
            scope,
            runOnInit: rule.runOnInit === true,
            actions
        };

        const whenFromJsonLogic = this.parseJsonLogicText(rule.whenJsonLogic);
        if (whenFromJsonLogic) {
            normalized.when = whenFromJsonLogic;
            return normalized;
        }

        const simpleConditions = conditions
            .map((condition: Condition) => this.buildJsonLogicFromSimpleCondition(condition))
            .filter((logic: any): logic is any => !!logic);

        if (simpleConditions.length === 1) {
            normalized.when = simpleConditions[0];
        } else if (simpleConditions.length > 1) {
            const matchMode = String(rule.conditionMatchMode || 'all').trim();
            normalized.when = matchMode === 'any'
                ? { any: simpleConditions }
                : { all: simpleConditions };
        }

        return normalized;
    },

    ensureDecisionTables(): void {
        // Placeholder - will be implemented by mixin
    },

    syncCurrentDecisionTable(): void {
        // Placeholder - will be implemented by mixin
    },

    buildActionsFromDecisionTable(rule: FormRule, columns: ActionColumn[]): Action[] {
        // Placeholder - will be implemented by mixin
        return [];
    },

    buildHtmxAttributesForApiAction(apiAction: ApiAction): Record<string, string> {
        // Placeholder - will be implemented by mixin
        return {};
    },

    parseActionIntent(intent: string): Record<string, any> {
        const text = String(intent || '').trim();
        if (!text) return {};

        const parts = text.split(':');
        if (parts.length !== 2) return {};

        const effect = parts[0].trim();
        const value = parts[1].trim();

        return { effect, value: this.normalizeBoolean(value) };
    },

    parseJsonLogicText(text?: string): any {
        // Placeholder - will be implemented by mixin
        return null;
    },

    buildConditionsFromDecisionTable(rule: FormRule, columns: InputColumn[]): Condition[] {
        // Placeholder - will be implemented by mixin
        return [];
    },

    validateConditionField(condition: Condition): string | null {
        const field = String(condition?.field || '').trim();
        if (!field) {
            return 'Condition field cannot be empty';
        }
        return null;
    },

    buildJsonLogicFromSimpleCondition(condition: Condition): any {
        const field = String(condition?.field || '').trim();
        const operator = String(condition?.operator || '').trim();
        const value = condition?.value;

        if (!field || !operator) return null;

        const opMap: Record<string, string> = {
            'eq': '==',
            'neq': '!=',
            'gt': '>',
            'gte': '>=',
            'lt': '<',
            'lte': '<=',
            'in': 'in',
            'contains': 'in'
        };

        const jsonOp = opMap[operator] || operator;
        return { [jsonOp]: [{ var: field }, value] };
    },

    normalizeBoolean(value: any): boolean {
        if (typeof value === 'boolean') return value;
        const str = String(value || '').trim().toLowerCase();
        return str === 'true' || str === '1' || str === 'yes';
    }
};