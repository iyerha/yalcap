import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formDesignerInteractionsSortable } from './designer-form-interactions-sortable.module.js';

describe('designer-form-interactions-sortable.module', () => {
    beforeEach(() => {
        formDesignerInteractionsSortable.paletteSortable = null;
        formDesignerInteractionsSortable.canvasSortable = null;
        formDesignerInteractionsSortable.nestedSortables = null;
        formDesignerInteractionsSortable.sortableObserver = null;
        formDesignerInteractionsSortable.flatpickrInstances = null;
        formDesignerInteractionsSortable.tomSelectInstances = null;
    });

    it('destroySortable clears all instances', () => {
        formDesignerInteractionsSortable.paletteSortable = { destroy: vi.fn() } as any;
        formDesignerInteractionsSortable.canvasSortable = { destroy: vi.fn() } as any;

        formDesignerInteractionsSortable.destroySortable();

        expect(formDesignerInteractionsSortable.paletteSortable).toBeNull();
        expect(formDesignerInteractionsSortable.canvasSortable).toBeNull();
    });

    it('getControlListBySource returns root controls', () => {
        formDesignerInteractionsSortable.controls = [
            { localId: 'ctrl-1', widget: 'text' }
        ];

        const list = formDesignerInteractionsSortable.getControlListBySource('__root__');

        expect(list).toEqual(formDesignerInteractionsSortable.controls);
    });

    it('stripAlpineAttrs removes alpine directives', () => {
        const div = document.createElement('div');
        div.setAttribute('x-data', '{}');
        div.setAttribute('x-show', 'true');
        div.setAttribute('x-disabled', 'isDisabled');

        formDesignerInteractionsSortable.stripAlpineAttrs(div);

        expect(div.hasAttribute('x-data')).toBe(false);
        expect(div.hasAttribute('x-show')).toBe(false);
        expect(div.hasAttribute('x-disabled')).toBe(false);
    });

    it('flashInvalidDrop adds and removes animation class', async () => {
        const element = document.createElement('div');

        formDesignerInteractionsSortable.flashInvalidDrop(element);

        expect(element.classList.contains('invalid-drop-flash')).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 300));

        expect(element.classList.contains('invalid-drop-flash')).toBe(false);
    });
});