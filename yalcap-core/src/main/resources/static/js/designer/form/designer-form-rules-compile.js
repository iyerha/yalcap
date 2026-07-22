// @ts-check
(function initFormDesignerRulesCompile(windowAny) {
    windowAny.formDesignerRulesCompile = {
        normalizedRulesPayload() {
            const out = [];
            this.ensureDecisionTables();
            this.syncCurrentDecisionTable();
            const apiErrors = [];

            this.decisionTables.forEach((table) => {
                const tableRules = Array.isArray(table?.rules) ? table.rules : [];
                const inputColumns = Array.isArray(table?.decisionInputColumns) ? table.decisionInputColumns : [];
                const actionColumns = Array.isArray(table?.decisionActionColumns) ? table.decisionActionColumns : [];
                const tableScope = String(table?.scope || 'form').trim() || 'form';

                tableRules.forEach((rule, index) => {
                    const scope = tableScope;
                    if (!scope) {
                        return;
                    }

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

                    const normalizedActions = actions
                        .map((action) => {
                            const kind = String(action?.kind || '').trim().toLowerCase();
                            if (kind === 'api' || action?.endpoint) {
                                const endpoint = String(action?.endpoint || '').trim();
                                if (!endpoint) {
                                    apiErrors.push(`Table '${String(table?.name || table?.id || '').trim() || 'table'}', rule ${index + 1}: API action requires endpoint.`);
                                    return null;
                                }

                                const apiAction = {
                                    kind: 'api',
                                    endpoint,
                                    method: String(action?.method || 'get').trim().toLowerCase() || 'get',
                                    trigger: String(action?.trigger || 'change').trim().toLowerCase() || 'change',
                                    target: String(action?.target || '').trim(),
                                    swap: String(action?.swap || 'innerHTML').trim() || 'innerHTML',
                                    valsTemplate: String(action?.valsTemplate || '').trim()
                                };
                                apiAction.htmx = this.buildHtmxAttributesForApiAction(apiAction);
                                return apiAction;
                            }

                            if (kind === 'derive') {
                                const target = String(action?.target || '').trim();
                                if (!target) {
                                    return null;
                                }

                                const expression = action?.expression;
                                if (expression === null || expression === undefined) {
                                    return null;
                                }

                                return {
                                    kind: 'derive',
                                    effect: 'set',
                                    target,
                                    expression
                                };
                            }

                            return {
                                kind: 'ui',
                                target: String(action?.target || '').trim(),
                                ...this.parseActionIntent(action?.intent || `${action?.effect || 'visible'}:${this.normalizeBoolean(action?.value) ? 'true' : 'false'}`)
                            };
                        })
                        .filter((action) => !!action)
                        .filter((action) => {
                            if (action.kind === 'api') {
                                return !!action.endpoint;
                            }
                            if (action.kind === 'derive') {
                                return !!action.target && action.expression !== null && action.expression !== undefined;
                            }
                            return !!action.target && !!action.effect;
                        });

                    if (normalizedActions.length === 0) {
                        return;
                    }

                    const normalized = {
                        id: String(rule.id || '').trim() || `${table.id}-rule-${index + 1}`,
                        scope,
                        runOnInit: rule.runOnInit === true,
                        actions: normalizedActions
                    };

                    const whenFromJsonLogic = this.parseJsonLogicText(rule.whenJsonLogic);
                    if (whenFromJsonLogic) {
                        normalized.when = whenFromJsonLogic;
                        out.push(normalized);
                        return;
                    }

                    const conditionsFromTable = this.buildConditionsFromDecisionTable(rule, inputColumns);
                    const conditions = conditionsFromTable.length > 0
                        ? conditionsFromTable
                        : (Array.isArray(rule.conditions) ? rule.conditions : []);
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
            });

            if (apiErrors.length > 0) {
                throw new Error(apiErrors.join(' '));
            }

            return out;
        }
    };
}(window));
