import { describe, it, expect, beforeEach } from 'vitest';
import { formDesignerRulesCompile } from './designer-form-rules-compile.module.js';

describe('designer-form-rules-compile.module', () => {
    beforeEach(() => {
        formDesignerRulesCompile.decisionTables = [];
    });

    describe('normalizedRulesPayload', () => {
        it('returns empty array when no decision tables', () => {
            const result = formDesignerRulesCompile.normalizedRulesPayload();
            expect(result).toEqual([]);
        });

        it('compiles simple rule with conditions and actions', () => {
            formDesignerRulesCompile.decisionTables = [{
                id: 'dt1',
                scope: 'form',
                rules: [{
                    id: 'rule1',
                    runOnInit: false,
                    conditions: [{ field: 'data.status', operator: 'eq', value: 'active' }],
                    actions: [{ kind: 'ui', target: 'field1', intent: 'visible:true' }]
                }]
            }];

            const result = formDesignerRulesCompile.normalizedRulesPayload();
            expect(result).toHaveLength(1);
            expect(result[0].scope).toBe('form');
        });

        it('validates and reports condition errors', () => {
            formDesignerRulesCompile.decisionTables = [{
                id: 'dt1',
                rules: [{
                    conditions: [{ field: '', operator: 'eq', value: '' }],
                    actions: []
                }]
            }];

            expect(() => formDesignerRulesCompile.normalizedRulesPayload()).toThrow();
        });
    });
});