interface ConditionFieldOption {
    key: string;
    label: string;
}

interface HtmxAttributes {
    [key: string]: string;
}

interface FormDesignerRulesUtils {
    controls?: any[];
    decisionInputColumns?: any[];
    decisionActionColumns?: any[];
    availableStateKeyOptions(): StateKeyOption[];
    availableActionTargetOptions(): StateKeyOption[];
    availableStateKeys(): string[];
    availableConditionFieldOptions(): ConditionFieldOption[];
    hasSimpleConditionInputs(condition: RuleCondition): boolean;
    isKnownConditionField(fieldPath: string): boolean;
    conditionFieldError(condition: RuleCondition): string;
    validateConditionField(condition: RuleCondition): string;
    conditionValueError(condition: RuleCondition): string;
    validateConditionValue(condition: RuleCondition): string;
    normalizeBoolean(value: any): boolean;
    actionValueMeaning(action: any): string;
    actionIntentMeaning(action: any): string;
    parseActionIntent(intent: string): { effect: string; value: boolean };
    buildHtmxAttributesForApiAction(apiAction: ApiAction): HtmxAttributes;
    validateApiActionColumn(column: DecisionActionColumn): string;
    parseDerivedExpressionText(raw: string): any;
    parseRuleLiteral(raw: string): any;
    buildJsonLogicFromSimpleCondition(condition: RuleCondition): any;
    parseJsonLogicText(raw: string): any;
    buildConditionsFromDecisionTable(rule: any, inputColumns?: any[]): RuleCondition[];
    buildActionsFromDecisionTable(rule: any, actionColumns?: any[]): any[];
    [key: string]: any;
}

export const formDesignerRulesUtils: FormDesignerRulesUtils = {
    controls: [],
    decisionInputColumns: [],
    decisionActionColumns: [],

    availableStateKeyOptions(): StateKeyOption[] {
        const options: StateKeyOption[] = [];
        const seen = new Set<string>();
        const walk = (controls: any[]) => {
            if (!Array.isArray(controls)) {
                return;
            }
            controls.forEach((control: any) => {
                if (!control) {
                    return;
                }
                const key = String(control.stateKey || control.name || '').trim();
                if (key && !seen.has(key)) {
                    seen.add(key);
                    options.push({
                        key,
                        label: String(control.label || control.name || control.stateKey || key).trim(),
                        type: String(control.type || '').trim().toLowerCase() || 'string',
                        widget: String(control.widget || '').trim().toLowerCase() || 'text'
                    });
                }
                if (Array.isArray(control.children) && control.children.length > 0) {
                    walk(control.children);
                }
            });
        };
        walk(this.controls || []);
        options.sort((a: StateKeyOption, b: StateKeyOption) => String(a.key).localeCompare(String(b.key)));
        return options;
    },

    availableActionTargetOptions(): StateKeyOption[] {
        const options = this.availableStateKeyOptions().map((item: StateKeyOption) => ({ ...item }));
        const seen = new Set(options.map((item: StateKeyOption) => String(item.key || '').trim()));

        const walk = (controls: any[]) => {
            if (!Array.isArray(controls)) {
                return;
            }

            controls.forEach((control: any) => {
                if (!control) {
                    return;
                }

                const stateKey = String(control.stateKey || control.name || '').trim();
                const widget = String(control.widget || '').trim().toLowerCase();
                if (widget === 'table' && stateKey && Array.isArray(control.tableColumns)) {
                    control.tableColumns.forEach((column: any) => {
                        if (!column) {
                            return;
                        }

                        const columnKey = String(column.key || '').trim();
                        if (!columnKey) {
                            return;
                        }

                        const key = `${stateKey}.columns.${columnKey}`;
                        if (seen.has(key)) {
                            return;
                        }

                        seen.add(key);
                        options.push({
                            key,
                            label: `${String(control.label || control.name || stateKey).trim()} / ${String(column.title || columnKey).trim()} visibility`,
                            type: 'boolean',
                            widget: 'table-column-visibility',
                            ruleTargetOnly: true
                        });
                    });
                }

                if (Array.isArray(control.children) && control.children.length > 0) {
                    walk(control.children);
                }
            });
        };

        walk(this.controls || []);
        options.sort((a: StateKeyOption, b: StateKeyOption) => String(a.key || '').localeCompare(String(b.key || '')));
        return options;
    },

    availableStateKeys(): string[] {
        return this.availableStateKeyOptions()
            .filter((item: StateKeyOption) => item.ruleTargetOnly !== true)
            .map((item: StateKeyOption) => item.key);
    },

    availableConditionFieldOptions(): ConditionFieldOption[] {
        const builtIns: ConditionFieldOption[] = [
            { key: 'workflow.stepId', label: 'Workflow Step' },
            { key: 'workflow.definitionKey', label: 'Workflow Definition' },
            { key: 'user.id', label: 'User Id' },
            { key: 'user.groups', label: 'User Groups' },
            { key: 'tenant.id', label: 'Tenant Id' }
        ];

        const dataFields = this.availableStateKeyOptions()
            .filter((item: StateKeyOption) => item.ruleTargetOnly !== true)
            .map((item: StateKeyOption) => ({
                key: `data.${item.key}`,
                label: item.label || ''
            }));

        return [...builtIns, ...dataFields];
    },

    hasSimpleConditionInputs(condition: RuleCondition): boolean {
        if (!condition) {
            return false;
        }
        return String(condition.field || '').trim() !== ''
            || String(condition.value || '').trim() !== ''
            || String(condition.valuesText || '').trim() !== '';
    },

    isKnownConditionField(fieldPath: string): boolean {
        const field = String(fieldPath || '').trim();
        if (!field) {
            return false;
        }
        const known = new Set(this.availableConditionFieldOptions().map((item: ConditionFieldOption) => item.key));
        if (known.has(field)) {
            return true;
        }
        if (field.startsWith('data.') || field.startsWith('workflow.') || field.startsWith('user.') || field.startsWith('tenant.')) {
            return true;
        }
        return false;
    },

    conditionFieldError(condition: RuleCondition): string {
        if (!condition) {
            return '';
        }
        return this.validateConditionField(condition);
    },

    validateConditionField(condition: RuleCondition): string {
        const field = String(condition?.field || '').trim();
        if (!field) {
            return 'Field is required for simple conditions.';
        }
        if (!this.isKnownConditionField(field)) {
            return 'Unknown field. Use picker or one of: data.*, workflow.*, user.*, tenant.*';
        }
        return '';
    },

    conditionValueError(condition: RuleCondition): string {
        if (!condition) {
            return '';
        }
        return this.validateConditionValue(condition);
    },

    validateConditionValue(condition: RuleCondition): string {
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

    normalizeBoolean(value: any): boolean {
        if (value === true || value === false) {
            return value;
        }
        const text = String(value ?? '').trim().toLowerCase();
        return text === 'true' || text === '1' || text === 'yes';
    },

    actionValueMeaning(action: any): string {
        const effect = String(action?.effect || '').trim();
        const value = this.normalizeBoolean(action?.value);
        return `Set ${effect || 'effect'} to ${value ? 'true' : 'false'}`;
    },

    actionIntentMeaning(action: any): string {
        const intent = String(action?.intent || 'visible:true').trim();
        const phrases: Record<string, string> = {
            'visible:true': 'Set to be visible',
            'visible:false': 'Set to be hidden',
            'readable:true': 'Set to be readable',
            'readable:false': 'Set to be unreadable',
            'writable:true': 'Set to be editable',
            'writable:false': 'Set to be read only',
            'enabled:true': 'Set to be enabled',
            'enabled:false': 'Set to be disabled',
            'required:true': 'Set to be required',
            'required:false': 'Set to be optional',
            'collapsed:true': 'Set to be collapsed',
            'collapsed:false': 'Set to be expanded'
        };
        return phrases[intent] || 'Set action';
    },

    parseActionIntent(intent: string): { effect: string; value: boolean } {
        const text = String(intent || '').trim();
        const [effect, rawValue] = text.split(':');
        const normalizedEffect = String(effect || '').trim();
        const normalizedValue = String(rawValue || 'true').trim().toLowerCase() === 'false' ? false : true;
        if (!normalizedEffect) {
            return { effect: 'visible', value: true };
        }
        return { effect: normalizedEffect, value: normalizedValue };
    },

    buildHtmxAttributesForApiAction(apiAction: ApiAction): HtmxAttributes {
        const endpoint = String(apiAction?.endpoint || '').trim();
        const method = String(apiAction?.method || 'get').trim().toLowerCase() || 'get';
        const trigger = String(apiAction?.trigger || 'change').trim().toLowerCase() || 'change';
        const target = String(apiAction?.target || '').trim();
        const swap = String(apiAction?.swap || 'innerHTML').trim() || 'innerHTML';
        const valsTemplate = String(apiAction?.valsTemplate || '').trim();

        const attrs: HtmxAttributes = {
            hxTrigger: trigger,
            hxSwap: swap
        };

        if (method === 'get') {
            attrs.hxGet = endpoint;
        } else {
            attrs.hxPost = endpoint;
            attrs.hxMethod = method;
        }

        if (target) {
            attrs.hxTarget = target;
        }
        if (valsTemplate) {
            attrs.hxVals = valsTemplate;
        }

        return attrs;
    },

    validateApiActionColumn(column: DecisionActionColumn): string {
        const endpoint = String(column?.apiEndpoint || '').trim();
        if (!endpoint) {
            return 'API action requires endpoint.';
        }
        return '';
    },

    parseDerivedExpressionText(raw: string): any {
        const text = String(raw || '').trim();
        if (!text) {
            return null;
        }

        if (text.startsWith('{') || text.startsWith('[')) {
            try {
                return JSON.parse(text);
            } catch (_) {
                return null;
            }
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

    parseRuleLiteral(raw: string): any {
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

    buildJsonLogicFromSimpleCondition(condition: RuleCondition): any {
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
                .map((v: string) => this.parseRuleLiteral(v))
                .filter((v: any) => v !== '');
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

        const value = this.parseRuleLiteral(condition?.value || '');
        const operators: Record<string, string> = {
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

    parseJsonLogicText(raw: string): any {
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

    buildConditionsFromDecisionTable(rule: any, inputColumns?: any[]): RuleCondition[] {
        const columns = inputColumns || this.decisionInputColumns || [];
        const conditions: RuleCondition[] = [];
        const coveredDataFields = new Set<string>();
        columns.forEach((column: any) => {
            const stateKey = String(column?.stateKey || '').trim();
            if (!stateKey) {
                return;
            }

            const field = `data.${stateKey}`;
            coveredDataFields.add(field);

            const cell = rule?.decisionInputs?.[column.id] || null;
            const op = String(cell?.op || 'eq').trim() || 'eq';
            const rawValue = String(cell?.value || '').trim();

            if (op !== 'exists' && rawValue === '') {
                return;
            }

            if (op === 'in' || op === 'notIn') {
                conditions.push({
                    field,
                    op,
                    value: '',
                    valuesText: rawValue
                });
                return;
            }

            if (op === 'exists') {
                if (rawValue === 'false') {
                    return;
                }
                conditions.push({
                    field,
                    op,
                    value: '',
                    valuesText: ''
                });
                return;
            }

            conditions.push({
                field,
                op,
                value: rawValue,
                valuesText: ''
            });
        });

        const originalConditions = Array.isArray(rule?.conditions) ? rule.conditions : [];
        originalConditions.forEach((condition: RuleCondition) => {
            const field = String(condition?.field || '').trim();
            if (!field) {
                return;
            }
            if (coveredDataFields.has(field)) {
                return;
            }
            conditions.push({
                field,
                op: String(condition?.op || 'eq').trim() || 'eq',
                value: String(condition?.value || ''),
                valuesText: String(condition?.valuesText || '')
            });
        });

        return conditions;
    },

    buildActionsFromDecisionTable(rule: any, actionColumns?: any[]): any[] {
        const columns = actionColumns || this.decisionActionColumns || [];
        const actions: any[] = [];
        columns.forEach((column: any) => {
            const kindRaw = String(column?.kind || 'ui').trim().toLowerCase();
            const kind = kindRaw === 'api' ? 'api' : (kindRaw === 'derive' ? 'derive' : 'ui');
            const cell = String(rule?.decisionActions?.[column.id] || '').trim().toLowerCase();
            if (cell !== 'true' && cell !== 'false') {
                return;
            }

            if (kind === 'api') {
                if (cell !== 'true') {
                    return;
                }
                const endpoint = String(column?.apiEndpoint || '').trim();
                if (!endpoint) {
                    return;
                }
                actions.push({
                    kind: 'api',
                    endpoint,
                    method: String(column?.apiMethod || 'get').trim().toLowerCase() || 'get',
                    trigger: String(column?.apiTrigger || 'change').trim().toLowerCase() || 'change',
                    target: String(column?.apiTarget || '').trim(),
                    swap: String(column?.apiSwap || 'innerHTML').trim() || 'innerHTML',
                    valsTemplate: String(column?.apiValsTemplate || '').trim()
                });
                return;
            }

            if (kind === 'derive') {
                if (cell !== 'true') {
                    return;
                }

                const target = String(column?.deriveTarget || column?.target || '').trim();
                if (!target) {
                    return;
                }

                const expression = this.parseDerivedExpressionText(column?.deriveExpression || '');
                if (expression === null || expression === undefined) {
                    return;
                }

                actions.push({
                    kind: 'derive',
                    effect: 'set',
                    target,
                    expression
                });
                return;
            }

            const target = String(column?.target || '').trim();
            const property = String(column?.property || 'visible').trim() || 'visible';
            if (!target) {
                return;
            }

            actions.push({
                kind: 'ui',
                target,
                intent: `${property}:${cell}`
            });
        });

        return actions;
    }
};
