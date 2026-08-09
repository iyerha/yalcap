import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formDesignerProperties } from './designer-form-properties.module.js';

describe('designer-form-properties.module', () => {
    beforeEach(() => {
        formDesignerProperties.selectedControl = null;
        formDesignerProperties.selectedControlLocalId = null;
        formDesignerProperties.validationErrors = [];
        formDesignerProperties.toIdentifier = vi.fn((s) => s?.toLowerCase().replace(/\s+/g, '_'));
        formDesignerProperties.slugify = vi.fn((s) => s?.toLowerCase().replace(/\s+/g, '-'));
        formDesignerProperties.normalizeControl = vi.fn((c) => c);
        formDesignerProperties.validateControl = vi.fn(() => []);
        formDesignerProperties.isOptionWidget = vi.fn(() => true);
        formDesignerProperties.ensureOptionsArray = vi.fn();
        formDesignerProperties.findControlByLocalId = vi.fn();
        formDesignerProperties.recomputeDerivedStateKeys = vi.fn();
    });

    it('onLabelChanged auto-generates name when not manual', () => {
        formDesignerProperties.selectedControl = { label: 'First Name', nameManual: false };
        formDesignerProperties.syncSelected = vi.fn();

        formDesignerProperties.onLabelChanged();

        expect(formDesignerProperties.toIdentifier).toHaveBeenCalledWith('First Name');
        expect(formDesignerProperties.syncSelected).toHaveBeenCalled();
    });

    it('onNameChanged marks name as manual', () => {
        formDesignerProperties.selectedControl = { name: 'Custom Name' };
        formDesignerProperties.syncSelected = vi.fn();

        formDesignerProperties.onNameChanged();

        expect(formDesignerProperties.selectedControl.nameManual).toBe(true);
        expect(formDesignerProperties.toIdentifier).toHaveBeenCalledWith('Custom Name');
    });

    it('onTypeChanged converts to booleanCheckbox for boolean type', () => {
        formDesignerProperties.selectedControl = { type: 'boolean', widget: 'text' };
        formDesignerProperties.syncSelected = vi.fn();

        formDesignerProperties.onTypeChanged();

        expect(formDesignerProperties.selectedControl.widget).toBe('booleanCheckbox');
        expect(formDesignerProperties.selectedControl.options).toEqual([]);
    });

    it('addOptionRow adds new option', () => {
        formDesignerProperties.selectedControl = { widget: 'select', options: [] };
        formDesignerProperties.syncSelected = vi.fn();

        formDesignerProperties.addOptionRow();

        expect(formDesignerProperties.selectedControl.options).toHaveLength(1);
        expect(formDesignerProperties.selectedControl.options[0]).toMatchObject({
            label: 'Option 1',
            value: 'option_1',
            autoValue: true
        });
    });

    it('addTableColumn adds new column', () => {
        formDesignerProperties.selectedControl = { widget: 'table', tableColumns: [] };
        formDesignerProperties.syncSelected = vi.fn();

        formDesignerProperties.addTableColumn();

        expect(formDesignerProperties.selectedControl.tableColumns).toHaveLength(1);
        expect(formDesignerProperties.selectedControl.tableColumns[0].key).toBe('column1');
    });

    it('validateSelected clears errors when no control selected', () => {
        formDesignerProperties.selectedControl = null;

        formDesignerProperties.validateSelected();

        expect(formDesignerProperties.validationErrors).toEqual([]);
    });
});