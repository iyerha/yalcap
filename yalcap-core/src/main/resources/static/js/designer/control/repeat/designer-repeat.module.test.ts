import { describe, it, expect, beforeEach } from 'vitest';
import { repeatHooks, register } from './designer-repeat.module';

describe('designer-repeat.module', () => {
    describe('repeatHooks.canInsertIntoSource', () => {
        it('returns false when container is missing', () => {
            const context = {
                container: undefined,
                control: { widget: 'text', label: 'Test' } as any
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('returns false when control is missing', () => {
            const context = {
                container: { children: [] },
                control: undefined
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('returns false when control is null', () => {
            const context = {
                container: { children: [] },
                control: null
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('creates children array on container if missing', () => {
            const container = {} as any;
            const context = {
                container,
                control: { widget: 'text', label: 'Test' },
                controlId: 'ctrl1'
            } as any;

            repeatHooks.canInsertIntoSource(context);

            expect(Array.isArray(container.children)).toBe(true);
        });

        it('allows group widget as repeat child', () => {
            const context = {
                container: { children: [] },
                control: { widget: 'group', label: 'Group' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(true);
        });

        it('allows text widget as repeat child', () => {
            const context = {
                container: { children: [] },
                control: { widget: 'text', label: 'Text' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(true);
        });

        it('allows number widget as repeat child', () => {
            const context = {
                container: { children: [] },
                control: { widget: 'number', label: 'Number' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(true);
        });

        it('allows select widget as repeat child', () => {
            const context = {
                container: { children: [] },
                control: { widget: 'select', label: 'Select' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(true);
        });

        it('disallows repeat widget as repeat child', () => {
            const context = {
                container: { children: [] },
                control: { widget: 'repeat', label: 'Repeat' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('disallows section widget as repeat child', () => {
            const context = {
                container: { children: [] },
                control: { widget: 'section', label: 'Section' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('allows adding to empty repeat container', () => {
            const context = {
                container: { children: [] },
                control: { widget: 'group', label: 'Group' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(true);
        });

        it('disallows adding different child when repeat has existing child', () => {
            const child1 = { widget: 'text', label: 'Child 1', localId: 'child1' };
            const context = {
                container: { children: [child1] },
                control: { widget: 'group', label: 'New Group' },
                controlId: 'new1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('allows replacing existing child with same ID', () => {
            const existingChild = { widget: 'text', label: 'Existing', localId: 'ctrl1' };
            const context = {
                container: { children: [existingChild] },
                control: { widget: 'group', label: 'Modified' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(true);
        });

        it('filters out children with null values', () => {
            const child1 = { widget: 'text', label: 'Child 1', localId: 'child1' };
            const context = {
                container: { children: [child1, null] },
                control: { widget: 'group', label: 'New Group' },
                controlId: 'new1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('handles widget name with mixed case', () => {
            const context = {
                container: { children: [] },
                control: { widget: 'REPEAT', label: 'Repeat' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('handles widget name with spaces', () => {
            const context = {
                container: { children: [] },
                control: { widget: '  text  ', label: 'Text' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(true);
        });

        it('rejects control with empty widget name', () => {
            const context = {
                container: { children: [] },
                control: { widget: '', label: 'No Widget' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('rejects control with null widget', () => {
            const context = {
                container: { children: [] },
                control: { widget: null, label: 'Null Widget' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('handles undefined controlId', () => {
            const child1 = { widget: 'text', label: 'Child 1', localId: 'child1' };
            const context = {
                container: { children: [child1] },
                control: { widget: 'group', label: 'Group' },
                controlId: undefined
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('allows first child when container has multiple children after filtering', () => {
            const child1 = { widget: 'text', label: 'Child 1', localId: 'child1' };
            const child2 = null;
            const context = {
                container: { children: [child1, child2] },
                control: { widget: 'group', label: 'Group' },
                controlId: 'new1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });

        it('disallows when both widget and control section are in context', () => {
            const context = {
                container: { children: [] },
                control: { widget: 'section', label: 'Section' },
                controlId: 'ctrl1'
            } as any;

            const result = repeatHooks.canInsertIntoSource(context);

            expect(result).toBe(false);
        });
    });

    describe('register', () => {
        it('registers hooks to provided object', () => {
            const hooks = {} as any;

            register(hooks);

            expect(hooks.repeat).toBe(repeatHooks);
        });

        it('registers hooks to window.designerControlHooks if no object provided', () => {
            const originalHooks = (window as any).designerControlHooks;
            delete (window as any).designerControlHooks;

            register();

            expect((window as any).designerControlHooks?.repeat).toBe(repeatHooks);

            // Restore
            (window as any).designerControlHooks = originalHooks;
        });

        it('does not overwrite existing repeat hooks', () => {
            const existingHooks = { canInsertIntoSource: () => false };
            const hooks = { repeat: existingHooks } as any;

            register(hooks);

            expect(hooks.repeat).toBe(existingHooks);
        });

        it('creates designerControlHooks on window if it does not exist', () => {
            const originalHooks = (window as any).designerControlHooks;
            delete (window as any).designerControlHooks;

            register();

            expect((window as any).designerControlHooks).toBeDefined();

            // Restore
            (window as any).designerControlHooks = originalHooks;
        });

        it('preserves other hooks when registering', () => {
            const existingHooks = {
                autocomplete: { validate: () => { } },
                table: { normalize: () => ({}) }
            } as any;

            register(existingHooks);

            expect(existingHooks.autocomplete).toBeDefined();
            expect(existingHooks.table).toBeDefined();
            expect(existingHooks.repeat).toBe(repeatHooks);
        });
    });
});