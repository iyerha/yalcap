import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formDesignerInteractionsResize } from './designer-form-interactions-resize.module.js';

describe('designer-form-interactions-resize.module', () => {
    beforeEach(() => {
        formDesignerInteractionsResize.resizingControlId = null;
        formDesignerInteractionsResize.findControlByLocalId = vi.fn(() => ({
            control: { colSpan: 6 }
        }));
        formDesignerInteractionsResize.updateCanvasControl = vi.fn();
    });

    it('startResize captures initial state', () => {
        const mockEvent = { clientX: 100, button: 0, target: null } as MouseEvent;
        
        formDesignerInteractionsResize.startResize('ctrl-1', mockEvent);
        
        expect(formDesignerInteractionsResize.resizingControlId).toBe('ctrl-1');
        expect(formDesignerInteractionsResize.resizeStartX).toBe(100);
        expect(formDesignerInteractionsResize.resizeStartSpan).toBe(6);
    });

    it('stopResize clears resize state', () => {
        formDesignerInteractionsResize.resizingControlId = 'ctrl-1';
        formDesignerInteractionsResize.stopResize();
        
        expect(formDesignerInteractionsResize.resizingControlId).toBeNull();
    });

    it('onResizeMove updates colSpan based on mouse delta', () => {
        // Mock grid element with clientWidth
        const mockGrid = { clientWidth: 1200 } as HTMLElement;
        formDesignerInteractionsResize.resizeGridElement = mockGrid;
        formDesignerInteractionsResize.resizingControlId = 'ctrl-1';
        formDesignerInteractionsResize.resizeStartX = 100;
        formDesignerInteractionsResize.resizeStartSpan = 6;
        
        const mockEvent = { clientX: 250, buttons: 1 } as MouseEvent;
        formDesignerInteractionsResize.onResizeMove(mockEvent);
        
        expect(formDesignerInteractionsResize.updateCanvasControl).toHaveBeenCalled();
    });
});