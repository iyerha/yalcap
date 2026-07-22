// @ts-nocheck
(function initFormDesignerRulesTable(windowAny) {
    windowAny.formDesignerRulesTable = {
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

        addRule() {
            const nextIndex = this.rules.length + 1;
            this.ensureDecisionTableSchema();
            const decisionInputs = {};
            const decisionActions = {};
            this.decisionInputColumns.forEach((column) => {
                decisionInputs[column.id] = { op: 'eq', value: '' };
            });
            this.decisionActionColumns.forEach((column) => {
                decisionActions[column.id] = '';
            });
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
                ],
                decisionInputs,
                decisionActions
            });
        },

        insertRuleAfter(index) {
            const nextIndex = this.rules.length + 1;
            this.ensureDecisionTableSchema();
            const decisionInputs = {};
            const decisionActions = {};
            this.decisionInputColumns.forEach((column) => {
                decisionInputs[column.id] = { op: 'eq', value: '' };
            });
            this.decisionActionColumns.forEach((column) => {
                decisionActions[column.id] = '';
            });
            const rule = {
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

        ensureRuleRowDefaults(rule) {
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

            if (!rule.decisionInputs || typeof rule.decisionInputs !== 'object') {
                rule.decisionInputs = {};
            }
            if (!rule.decisionActions || typeof rule.decisionActions !== 'object') {
                rule.decisionActions = {};
            }

            this.decisionInputColumns.forEach((column) => {
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
            this.decisionActionColumns.forEach((column) => {
                if (rule.decisionActions[column.id] === undefined) {
                    rule.decisionActions[column.id] = '';
                }
            });
        },

        primaryCondition(rule) {
            this.ensureRuleRowDefaults(rule);
            return rule.conditions[0];
        },

        primaryAction(rule) {
            this.ensureRuleRowDefaults(rule);
            return rule.actions[0];
        },

        isSetMembershipOperator(op) {
            return op === 'in' || op === 'notIn';
        },

        newDecisionInputColumn(stateKey = '') {
            const next = this.nextDecisionColumnSeq;
            this.nextDecisionColumnSeq += 1;
            return {
                id: `in-${next}`,
                stateKey: String(stateKey || '').trim()
            };
        },

        newDecisionActionColumn(target = '', property = 'visible') {
            const config = (target && typeof target === 'object' && !Array.isArray(target))
                ? target
                : { target, property };
            const next = this.nextDecisionColumnSeq;
            this.nextDecisionColumnSeq += 1;
            return {
                id: `out-${next}`,
                kind: String(config.kind || 'ui').trim().toLowerCase() === 'api' ? 'api' : 'ui',
                target: String(config.target || '').trim(),
                property: String(config.property || 'visible').trim() || 'visible',
                apiEndpoint: String(config.apiEndpoint || '').trim(),
                apiMethod: String(config.apiMethod || 'get').trim().toLowerCase() || 'get',
                apiTrigger: String(config.apiTrigger || 'change').trim().toLowerCase() || 'change',
                apiTarget: String(config.apiTarget || '').trim(),
                apiSwap: String(config.apiSwap || 'innerHTML').trim() || 'innerHTML',
                apiValsTemplate: String(config.apiValsTemplate || '').trim()
            };
        },

        ensureDecisionTableSchema() {
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

        addDecisionInputColumn() {
            this.ensureDecisionTableSchema();
            const column = this.newDecisionInputColumn('');
            this.decisionInputColumns.push(column);
            this.rules.forEach((rule) => {
                this.ensureRuleRowDefaults(rule);
                rule.decisionInputs[column.id] = { op: 'eq', value: '' };
            });
        },

        insertDecisionInputColumnAfter(columnId) {
            this.ensureDecisionTableSchema();
            const column = this.newDecisionInputColumn('');
            const index = this.decisionInputColumns.findIndex((item) => item.id === columnId);
            if (index < 0) {
                this.decisionInputColumns.push(column);
            } else {
                this.decisionInputColumns.splice(index + 1, 0, column);
            }
            this.rules.forEach((rule) => {
                this.ensureRuleRowDefaults(rule);
                rule.decisionInputs[column.id] = { op: 'eq', value: '' };
            });
        },

        removeDecisionInputColumn(columnId) {
            if (!columnId || this.decisionInputColumns.length <= 1) {
                return;
            }
            const index = this.decisionInputColumns.findIndex((column) => column.id === columnId);
            if (index >= 0) {
                this.decisionInputColumns.splice(index, 1);
            }
            this.rules.forEach((rule) => {
                if (rule && rule.decisionInputs && Object.prototype.hasOwnProperty.call(rule.decisionInputs, columnId)) {
                    delete rule.decisionInputs[columnId];
                }
            });
            this.syncCurrentDecisionTable();
        },

        addDecisionActionColumn() {
            this.ensureDecisionTableSchema();
            const column = this.newDecisionActionColumn('', 'visible');
            this.decisionActionColumns.push(column);
            this.rules.forEach((rule) => {
                this.ensureRuleRowDefaults(rule);
                rule.decisionActions[column.id] = '';
            });
        },

        insertDecisionActionColumnAfter(columnId) {
            this.ensureDecisionTableSchema();
            const column = this.newDecisionActionColumn('', 'visible');
            const index = this.decisionActionColumns.findIndex((item) => item.id === columnId);
            if (index < 0) {
                this.decisionActionColumns.push(column);
            } else {
                this.decisionActionColumns.splice(index + 1, 0, column);
            }
            this.rules.forEach((rule) => {
                this.ensureRuleRowDefaults(rule);
                rule.decisionActions[column.id] = '';
            });
        },

        removeDecisionActionColumn(columnId) {
            if (!columnId || this.decisionActionColumns.length <= 1) {
                return;
            }
            const index = this.decisionActionColumns.findIndex((column) => column.id === columnId);
            if (index >= 0) {
                this.decisionActionColumns.splice(index, 1);
            }
            this.rules.forEach((rule) => {
                if (rule && rule.decisionActions && Object.prototype.hasOwnProperty.call(rule.decisionActions, columnId)) {
                    delete rule.decisionActions[columnId];
                }
            });
            this.syncCurrentDecisionTable();
        },

        decisionInputCell(rule, columnId) {
            this.ensureRuleRowDefaults(rule);
            return String(rule.decisionInputs[columnId]?.value || '');
        },

        setDecisionInputCell(rule, columnId, value) {
            this.ensureRuleRowDefaults(rule);
            const cell = rule.decisionInputs[columnId] || { op: 'eq', value: '' };
            cell.value = String(value || '');
            rule.decisionInputs[columnId] = cell;
        },

        decisionInputOperator(rule, columnId) {
            this.ensureRuleRowDefaults(rule);
            return String(rule.decisionInputs[columnId]?.op || 'eq');
        },

        setDecisionInputOperator(rule, columnId, op) {
            this.ensureRuleRowDefaults(rule);
            const cell = rule.decisionInputs[columnId] || { op: 'eq', value: '' };
            cell.op = String(op || 'eq').trim() || 'eq';
            if (cell.op === 'exists') {
                // Treat "exists" as an explicit enabled predicate for compile logic.
                cell.value = 'true';
            }
            rule.decisionInputs[columnId] = cell;
        },

        operatorOptionsForInputColumn(column) {
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

        ruleInputColumnMeta(column) {
            const key = String(column?.stateKey || '').trim();
            if (!key) {
                return null;
            }
            return this.availableStateKeyOptions().find((item) => item.key === key) || null;
        },

        ruleInputColumnType(column) {
            const meta = this.ruleInputColumnMeta(column);
            if (!meta) {
                return 'string';
            }
            if (meta.type) {
                return String(meta.type).toLowerCase();
            }
            return 'string';
        },

        inputCellValueInputType(rule, columnId, column) {
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

        decisionMatrixGridStyle() {
            const inputCount = Math.max(1, Array.isArray(this.decisionInputColumns) ? this.decisionInputColumns.length : 0);
            const actionCount = Math.max(1, Array.isArray(this.decisionActionColumns) ? this.decisionActionColumns.length : 0);
            return `grid-template-columns: 64px repeat(${inputCount}, minmax(220px, 1fr)) repeat(${actionCount}, minmax(180px, 1fr)) 120px;`;
        },

        decisionActionCell(rule, columnId) {
            this.ensureRuleRowDefaults(rule);
            return String(rule.decisionActions[columnId] || '');
        },

        setDecisionActionCell(rule, columnId, value) {
            this.ensureRuleRowDefaults(rule);
            const raw = String(value || '').trim().toLowerCase();
            if (raw === 'true' || raw === 'false') {
                rule.decisionActions[columnId] = raw;
                return;
            }
            rule.decisionActions[columnId] = '';
        }
    };
}(window));
