import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formDesignerInteractionsCore } from './designer-form-interactions-core.module.js';

describe('designer-form-interactions-core.module', () => {
    beforeEach(() => {
        formDesignerInteractionsCore.controls = [];
        formDesignerInteractionsCore.selectedControlLocalId = null;
        formDesignerInteractionsCore.validateSelected = vi.fn();
        formDesignerInteractionsCore.normalizeControl = vi.fn((c) => c);
    });

    it('selectControl sets selectedControlLocalId', () => {
        formDesignerInteractionsCore.selectControl('ctrl-123');
        
        expect(formDesignerInteractionsCore.selectedControlLocalId).toBe('ctrl-123');
    });

    it('clearSelection clears all selection state', () => {
        formDesignerInteractionsCore.selectedControlLocalId = 'ctrl-123';
        formDesignerInteractionsCore.clearSelection();
        
        expect(formDesignerInteractionsCore.selectedControlLocalId).toBeNull();
        expect(formDesignerInteractionsCore.selectedControl).toBeNull();
    });

    it('findControlByLocalId locates control', () => {
        formDesignerInteractionsCore.controls = [
            { localId: 'ctrl-1', widget: 'text' },
            { localId: 'ctrl-2', widget: 'number' }
        ];
        
        const found = formDesignerInteractionsCore.findControlByLocalId('ctrl-2');
        
        expect(found?.control.widget).toBe('number');
        expect(found?.index).toBe(1);
    });

    it('updateCanvasControl modifies control in place', () => {
        formDesignerInteractionsCore.controls = [
            { localId: 'ctrl-1', widget: 'text', label: 'Old' }
        ];
        
        formDesignerInteractionsCore.updateCanvasControl('ctrl-1', (c: any) => {
            c.label = 'New';
        });
        
        expect(formDesignerInteractionsCore.controls[0].label).toBe('New');
    });
});