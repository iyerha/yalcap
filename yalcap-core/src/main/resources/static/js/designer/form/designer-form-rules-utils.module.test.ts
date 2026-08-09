import { describe, it, expect, beforeEach } from 'vitest';
import { formDesignerRulesUtils } from './designer-form-rules-utils.module.js';

describe('designer-form-rules-utils.module', () => {
    beforeEach(() => {
        formDesignerRulesUtils.controls = [];
        formDesignerRulesUtils.decisionInputColumns = [];
        formDesignerRulesUtils.decisionActionColumns = [];
    });

    describe('availableStateKeyOptions', () => {
        it('returns empty array when no controls', () => {
            expect(formDesignerRulesUtils.availableStateKeyOptions()).toEqual([]);
        });

        it('extracts state keys from flat controls', () => {
            formDesignerRulesUtils.controls = [
                { name: 'field1', label: 'Field 1', type: 'string', widget: 'text' },
                { stateKey: 'field2', label: 'Field 2' }
            ];

            const result = formDesignerRulesUtils.availableStateKeyOptions();
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({ key: 'field1', label: 'Field 1' });
            expect(result[1]).toMatchObject({ key: 'field2', label: 'Field 2' });
        });

        it('processes nested children recursively', () => {
            formDesignerRulesUtils.controls = [
                {
                    name: 'section',
                    children: [
                        { name: 'nested', label: 'Nested Field' }
                    ]
                }
            ];

            const result = formDesignerRulesUtils.availableStateKeyOptions();
            expect(result.find(r => r.key === 'nested')).toBeDefined();
        });

        it('deduplicates state keys', () => {
            formDesignerRulesUtils.controls = [
                { name: 'field1' },
                { name: 'field1' }
            ];

            expect(formDesignerRulesUtils.availableStateKeyOptions()).toHaveLength(1);
        });
    });

    describe('availableConditionFieldOptions', () => {
        it('includes built-in fields', () => {
            const result = formDesignerRulesUtils.availableConditionFieldOptions();
            expect(result.find(f => f.key === 'workflow.stepId')).toBeDefined();
            expect(result.find(f => f.key === 'user.id')).toBeDefined();
        });

        it('prefixes data fields with "data."', () => {
            formDesignerRulesUtils.controls = [{ name: 'email' }];
            const result = formDesignerRulesUtils.availableConditionFieldOptions();
            expect(result.find(f => f.key === 'data.email')).toBeDefined();
        });
    });

    describe('validateConditionField', () => {
        it('returns error for missing field', () => {
            const error = formDesignerRulesUtils.validateConditionField({ field: '', op: 'eq', value: '', valuesText: '' });
            expect(error).toContain('required');
        });

        it('returns error for unknown field', () => {
            const error = formDesignerRulesUtils.validateConditionField({ field: 'unknown', op: 'eq', value: '', valuesText: '' });
            expect(error).toContain('Unknown field');
        });

        it('accepts known built-in field', () => {
            const error = formDesignerRulesUtils.validateConditionField({ field: 'workflow.stepId', op: 'eq', value: '1', valuesText: '' });
            expect(error).toBe('');
        });
    });

    describe('validateConditionValue', () => {
        it('returns empty for exists operator', () => {
            const error = formDesignerRulesUtils.validateConditionValue({ field: 'data.email', op: 'exists', value: '', valuesText: '' });
            expect(error).toBe('');
        });

        it('requires valuesText for in/notIn operators', () => {
            const error = formDesignerRulesUtils.validateConditionValue({ field: 'data.status', op: 'in', value: '', valuesText: '' });
            expect(error).toContain('required');
        });

        it('requires value for other operators', () => {
            const error = formDesignerRulesUtils.validateConditionValue({ field: 'data.age', op: 'gt', value: '', valuesText: '' });
            expect(error).toContain('required');
        });
    });

    describe('parseRuleLiteral', () => {
        it('parses boolean true', () => {
            expect(formDesignerRulesUtils.parseRuleLiteral('true')).toBe(true);
        });

        it('parses boolean false', () => {
            expect(formDesignerRulesUtils.parseRuleLiteral('false')).toBe(false);
        });

        it('parses numbers', () => {
            expect(formDesignerRulesUtils.parseRuleLiteral('42')).toBe(42);
        });

        it('returns string for text', () => {
            expect(formDesignerRulesUtils.parseRuleLiteral('hello')).toBe('hello');
        });
    });

    describe('buildJsonLogicFromSimpleCondition', () => {
        it('builds equality check', () => {
            const logic = formDesignerRulesUtils.buildJsonLogicFromSimpleCondition({
                field: 'data.status',
                op: 'eq',
                value: 'active',
                valuesText: ''
            });
            expect(logic).toEqual({ '==': [{ var: 'data.status' }, 'active'] });
        });

        it('builds exists check', () => {
            const logic = formDesignerRulesUtils.buildJsonLogicFromSimpleCondition({
                field: 'data.email',
                op: 'exists',
                value: '',
                valuesText: ''
            });
            expect(logic).toEqual({ '!': [{ '==': [{ var: 'data.email' }, null] }] });
        });

        it('builds in check for multiple values', () => {
            const logic = formDesignerRulesUtils.buildJsonLogicFromSimpleCondition({
                field: 'data.status',
                op: 'in',
                value: '',
                valuesText: 'active,pending'
            });
            expect(logic).toEqual({ in: [{ var: 'data.status' }, ['active', 'pending']] });
        });
    });

    describe('buildConditionsFromDecisionTable', () => {
        it('builds conditions from input columns', () => {
            formDesignerRulesUtils.decisionInputColumns = [
                { id: 'col1', stateKey: 'status' }
            ];
            const rule = {
                decisionInputs: {
                    col1: { op: 'eq', value: 'active' }
                }
            };

            const conditions = formDesignerRulesUtils.buildConditionsFromDecisionTable(rule);
            expect(conditions).toHaveLength(1);
            expect(conditions[0]).toMatchObject({
                field: 'data.status',
                op: 'eq',
                value: 'active'
            });
        });
    });

    describe('buildActionsFromDecisionTable', () => {
        it('builds UI action', () => {
            formDesignerRulesUtils.decisionActionColumns = [
                { id: 'col1', kind: 'ui', target: 'field1', property: 'visible' }
            ];
            const rule = {
                decisionActions: { col1: 'true' }
            };

            const actions = formDesignerRulesUtils.buildActionsFromDecisionTable(rule);
            expect(actions).toHaveLength(1);
            expect(actions[0]).toMatchObject({
                kind: 'ui',
                target: 'field1',
                intent: 'visible:true'
            });
        });
    });
});