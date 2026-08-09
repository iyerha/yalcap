import { describe, it, expect, beforeEach } from 'vitest';
import { formDesignerRulesTable } from './designer-form-rules-table.module.js';

describe('designer-form-rules-table.module', () => {
    beforeEach(() => {
        formDesignerRulesTable.activeDecisionTableId = null;
        formDesignerRulesTable.nextDecisionTableSeq = 0;
        formDesignerRulesTable.nextDecisionColumnSeq = 0;
        formDesignerRulesTable.decisionTableScope = 'form';
        formDesignerRulesTable.decisionTableDescription = '';
        formDesignerRulesTable.rules.length = 0;
        formDesignerRulesTable.decisionInputColumns.length = 0;
        formDesignerRulesTable.decisionActionColumns.length = 0;
    });

    describe('newDecisionTable', () => {
        it('creates table with generated id and name', () => {
            const table = formDesignerRulesTable.newDecisionTable();
            expect(table.id).toContain('table-');
            expect(table.name).toMatch(/Table \d+/);
        });

        it('uses provided name', () => {
            const table = formDesignerRulesTable.newDecisionTable('Custom');
            expect(table.name).toBe('Custom');
        });
    });

    describe('addRule', () => {
        it('adds new rule to rules array', () => {
            formDesignerRulesTable.addRule();
            expect(formDesignerRulesTable.rules).toHaveLength(1);
        });

        it('initializes rule with defaults', () => {
            formDesignerRulesTable.addRule();
            const rule = formDesignerRulesTable.rules[0];
            expect(rule.conditions).toHaveLength(1);
            expect(rule.conditions[0]).toMatchObject({ field: '', op: 'eq' });
            expect(rule.actions).toBeDefined();
            expect(rule.decisionInputs).toBeDefined();
            expect(rule.decisionActions).toBeDefined();
        });
    });

    describe('removeRule', () => {
        it('removes rule at index', () => {
            formDesignerRulesTable.addRule();
            formDesignerRulesTable.addRule();
            formDesignerRulesTable.removeRule(0);
            expect(formDesignerRulesTable.rules).toHaveLength(1);
        });
    });

    describe('moveRuleUp', () => {
        it('swaps rule with previous', () => {
            formDesignerRulesTable.rules = [
                { id: '1' } as any,
                { id: '2' } as any
            ];
            formDesignerRulesTable.moveRuleUp(1);
            expect(formDesignerRulesTable.rules[0].id).toBe('2');
            expect(formDesignerRulesTable.rules[1].id).toBe('1');
        });

        it('does nothing at index 0', () => {
            formDesignerRulesTable.rules = [{ id: '1' } as any];
            formDesignerRulesTable.moveRuleUp(0);
            expect(formDesignerRulesTable.rules[0].id).toBe('1');
        });
    });

    describe('addDecisionInputColumn', () => {
        it('adds column to decisionInputColumns', () => {
            // Pre-populate to skip ensure's auto-init
            formDesignerRulesTable.decisionInputColumns = [
                { id: 'existing', stateKey: 'test' } as any
            ];
            
            formDesignerRulesTable.addDecisionInputColumn();
            expect(formDesignerRulesTable.decisionInputColumns).toHaveLength(2);
        });

        it('assigns unique column id', () => {
            formDesignerRulesTable.addDecisionInputColumn();
            formDesignerRulesTable.addDecisionInputColumn();
            const ids = formDesignerRulesTable.decisionInputColumns.map(c => c.id);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    describe('removeDecisionInputColumn', () => {
        it('removes column and clears rule cells', () => {
            // Add 2 columns so removal doesn't trigger auto-init
            formDesignerRulesTable.decisionInputColumns = [
                { id: 'col1', stateKey: 'status' } as any,
                { id: 'col2', stateKey: 'name' } as any
            ];
            formDesignerRulesTable.rules = [{
                decisionInputs: { 'col1': { op: 'eq', value: 'active' } }
            } as any];

            formDesignerRulesTable.removeDecisionInputColumn('col1');
            expect(formDesignerRulesTable.decisionInputColumns).toHaveLength(1);
            expect(formDesignerRulesTable.rules[0].decisionInputs['col1']).toBeUndefined();
        });
    });

    describe('decisionInputCell', () => {
        it('returns cell value for column', () => {
            const rule = {
                decisionInputs: { 'col1': { op: 'eq', value: 'test' } }
            } as any;
            expect(formDesignerRulesTable.decisionInputCell(rule, 'col1')).toBe('test');
        });

        it('returns empty for missing column', () => {
            const rule = { decisionInputs: {} } as any;
            expect(formDesignerRulesTable.decisionInputCell(rule, 'col1')).toBe('');
        });
    });

    describe('isSetMembershipOperator', () => {
        it('returns true for in/notIn', () => {
            expect(formDesignerRulesTable.isSetMembershipOperator('in')).toBe(true);
            expect(formDesignerRulesTable.isSetMembershipOperator('notIn')).toBe(true);
        });

        it('returns false for other operators', () => {
            expect(formDesignerRulesTable.isSetMembershipOperator('eq')).toBe(false);
        });
    });
});