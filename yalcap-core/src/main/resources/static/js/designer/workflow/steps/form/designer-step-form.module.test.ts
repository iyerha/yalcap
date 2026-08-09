import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    resolveHint,
    ensureAssignmentObject,
    ensureAccessObject,
    ensureUiObject,
    createFormStepHook,
    register
} from './designer-step-form.module';
import { AnyNode } from 'postcss';

describe('designer-step-form.module', () => {
    describe('resolveHint', () => {
        it('returns hint when kind is missing', () => {
            const assignment = { value: 'user123' };
            const hint = resolveHint(assignment);

            expect(hint).toBe('Form step: choose an assignment kind.');
        });

        it('returns hint when kind is empty string', () => {
            const assignment = { kind: '   ', value: 'user123' };
            const hint = resolveHint(assignment);

            expect(hint).toBe('Form step: choose an assignment kind.');
        });

        it('returns hint when value is missing', () => {
            const assignment = { kind: 'INTERNAL_USER' };
            const hint = resolveHint(assignment);

            expect(hint).toContain('Form step: provide an assignment value for INTERNAL_USER.');
        });

        it('returns hint when value is empty string', () => {
            const assignment = { kind: 'INTERNAL_GROUP', value: '   ' };
            const hint = resolveHint(assignment);

            expect(hint).toContain('Form step: provide an assignment value for INTERNAL_GROUP.');
        });

        it('returns hint for EXTERNAL_EMAIL without @ symbol', () => {
            const assignment = { kind: 'EXTERNAL_EMAIL', value: 'notanemail' };
            const hint = resolveHint(assignment);

            expect(hint).toContain('EXTERNAL_EMAIL usually contains an email or expression');
        });

        it('returns completion hint for valid INTERNAL_USER', () => {
            const assignment = { kind: 'INTERNAL_USER', value: 'user123' };
            const hint = resolveHint(assignment);

            expect(hint).toBe('Form step assignment looks complete.');
        });

        it('returns completion hint for valid EXTERNAL_EMAIL with @', () => {
            const assignment = { kind: 'EXTERNAL_EMAIL', value: 'user@example.com' };
            const hint = resolveHint(assignment);

            expect(hint).toBe('Form step assignment looks complete.');
        });

        it('returns completion hint for valid INTERNAL_GROUP', () => {
            const assignment = { kind: 'INTERNAL_GROUP', value: 'admin-group' };
            const hint = resolveHint(assignment);

            expect(hint).toBe('Form step assignment looks complete.');
        });

        it('handles null assignment', () => {
            const hint = resolveHint(null);

            expect(hint).toBe('Form step: choose an assignment kind.');
        });

        it('handles undefined assignment', () => {
            const hint = resolveHint(undefined);

            expect(hint).toBe('Form step: choose an assignment kind.');
        });

        it('handles non-object assignment', () => {
            const hint = resolveHint('not an object');

            expect(hint).toBe('Form step: choose an assignment kind.');
        });

        it('trims whitespace from kind and value', () => {
            const assignment = { kind: '  INTERNAL_USER  ', value: '  user123  ' };
            const hint = resolveHint(assignment);

            expect(hint).toBe('Form step assignment looks complete.');
        });
    });

    describe('ensureAssignmentObject', () => {
        it('creates assignment object if missing', () => {
            const obj = {};

            ensureAssignmentObject(obj as any);

            expect(obj).toHaveProperty('assignment');
            expect((obj as any).assignment.kind).toBe('INTERNAL_USER');
            expect((obj as any).assignment.value).toBe('');
            expect((obj as any).assignment.mode).toBe('first-wins');
            expect((obj as any).assignment.multiInstance).toBe(false);
        });

        it('does not overwrite existing assignment object', () => {
            const existing = { kind: 'INTERNAL_GROUP', value: 'group1', mode: 'all', multiInstance: true };
            const obj = { assignment: existing };

            ensureAssignmentObject(obj as any);

            expect((obj as any).assignment).toBe(existing);
        });

        it('adds missing kind field', () => {
            const obj = { assignment: { value: 'test', mode: 'first-wins', multiInstance: false } };

            ensureAssignmentObject(obj as any);

            expect((obj as any).assignment.kind).toBe('INTERNAL_USER');
        });

        it('adds missing value field', () => {
            const obj = { assignment: { kind: 'INTERNAL_USER', mode: 'first-wins', multiInstance: false } };

            ensureAssignmentObject(obj as any);

            expect((obj as any).assignment.value).toBe('');
        });

        it('adds missing mode field', () => {
            const obj = { assignment: { kind: 'INTERNAL_USER', value: 'test', multiInstance: false } };

            ensureAssignmentObject(obj as any);

            expect((obj as any).assignment.mode).toBe('first-wins');
        });

        it('adds missing multiInstance field', () => {
            const obj = { assignment: { kind: 'INTERNAL_USER', value: 'test', mode: 'first-wins' } };

            ensureAssignmentObject(obj as any);

            expect((obj as any).assignment.multiInstance).toBe(false);
        });

        it('handles null object', () => {
            expect(() => ensureAssignmentObject(null)).not.toThrow();
        });

        it('handles non-object', () => {
            expect(() => ensureAssignmentObject('not an object')).not.toThrow();
        });

        it('replaces non-object assignment with object', () => {
            const obj = { assignment: 'not an object' };

            ensureAssignmentObject(obj as any);

            expect(typeof (obj as any).assignment).toBe('object');
            expect((obj as any).assignment.kind).toBe('INTERNAL_USER');
        });
    });

    describe('ensureAccessObject', () => {
        it('creates access object if missing', () => {
            const obj = {};

            ensureAccessObject(obj as any);

            expect(obj).toHaveProperty('access');
            expect(Array.isArray((obj as any).access.groups)).toBe(true);
            expect(Array.isArray((obj as any).access.users)).toBe(true);
            expect((obj as any).access.groups).toEqual([]);
            expect((obj as any).access.users).toEqual([]);
        });

        it('does not overwrite existing access object', () => {
            const existing = { groups: ['admin'], users: ['user1'] };
            const obj = { access: existing };

            ensureAccessObject(obj as any);

            expect((obj as any).access).toBe(existing);
        });

        it('adds missing groups array', () => {
            const obj = { access: { users: ['user1'] } };

            ensureAccessObject(obj as any);

            expect(Array.isArray((obj as any).access.groups)).toBe(true);
            expect((obj as any).access.groups).toEqual([]);
        });

        it('adds missing users array', () => {
            const obj = { access: { groups: ['admin'] } };

            ensureAccessObject(obj as any);

            expect(Array.isArray((obj as any).access.users)).toBe(true);
            expect((obj as any).access.users).toEqual([]);
        });

        it('replaces non-array groups with array', () => {
            const obj = { access: { groups: 'not an array', users: [] } };

            ensureAccessObject(obj as any);

            expect(Array.isArray((obj as any).access.groups)).toBe(true);
            expect((obj as any).access.groups).toEqual([]);
        });

        it('replaces non-array users with array', () => {
            const obj = { access: { groups: [], users: 'not an array' } };

            ensureAccessObject(obj as any);

            expect(Array.isArray((obj as any).access.users)).toBe(true);
            expect((obj as any).access.users).toEqual([]);
        });

        it('handles null object', () => {
            expect(() => ensureAccessObject(null)).not.toThrow();
        });

        it('handles non-object', () => {
            expect(() => ensureAccessObject('not an object')).not.toThrow();
        });
    });

    describe('ensureUiObject', () => {
        it('creates ui object if missing', () => {
            const obj = {};

            ensureUiObject(obj as any);

            expect(obj).toHaveProperty('ui');
            expect((obj as any).ui.pointer).toBe('');
        });

        it('does not overwrite existing ui object', () => {
            const existing = { pointer: 'form-1', designer: { position: { x: 100, y: 200 } } };
            const obj = { ui: existing };

            ensureUiObject(obj as any);

            expect((obj as any).ui).toBe(existing);
        });

        it('adds pointer field if missing', () => {
            const obj = { ui: { designer: { position: { x: 0, y: 0 } } } };

            ensureUiObject(obj as any);

            expect((obj as any).ui.pointer).toBe('');
        });

        it('does not overwrite existing pointer', () => {
            const obj = { ui: { pointer: 'form-1' } };

            ensureUiObject(obj as any);

            expect((obj as any).ui.pointer).toBe('form-1');
        });

        it('handles null object', () => {
            expect(() => ensureUiObject(null)).not.toThrow();
        });

        it('handles non-object', () => {
            expect(() => ensureUiObject('not an object')).not.toThrow();
        });

        it('replaces non-object ui with object', () => {
            const obj = { ui: 'not an object' };

            ensureUiObject(obj as any);

            expect(typeof (obj as any).ui).toBe('object');
            expect((obj as any).ui.pointer).toBe('');
        });
    });

    describe('createFormStepHook', () => {
        it('returns hook with customFields', () => {
            const hook = createFormStepHook();

            expect(Array.isArray(hook.customFields)).toBe(true);
            expect(hook.customFields.length).toBeGreaterThan(0);
        });

        it('has assignment kind field', () => {
            const hook = createFormStepHook();
            const kindField = hook.customFields.find(f => f.key === 'kind' && f.section === 'assignment');

            expect(kindField).toBeDefined();
            expect(kindField?.type).toBe('select');
            expect(Array.isArray(kindField?.enumValues)).toBe(true);
        });

        it('has assignment value field', () => {
            const hook = createFormStepHook();
            const valueField = hook.customFields.find(f => f.key === 'value' && f.section === 'assignment');

            expect(valueField).toBeDefined();
            expect(valueField?.type).toBe('text');
        });

        it('has access groups field', () => {
            const hook = createFormStepHook();
            const groupsField = hook.customFields.find(f => f.key === 'groups' && f.section === 'access');

            expect(groupsField).toBeDefined();
            expect(groupsField?.type).toBe('text');
        });

        it('has ui pointer field for form reference', () => {
            const hook = createFormStepHook();
            const pointerField = hook.customFields.find(f => f.key === 'pointer' && f.section === 'ui');

            expect(pointerField).toBeDefined();
            expect(pointerField?.type).toBe('autocomplete');
        });

        it('initializes formSearchQuery as empty string', () => {
            const hook = createFormStepHook();

            expect(hook.formSearchQuery).toBe('');
        });

        it('initializes formSearchResults as empty array', () => {
            const hook = createFormStepHook();

            expect(Array.isArray(hook.formSearchResults)).toBe(true);
            expect(hook.formSearchResults).toEqual([]);
        });

        it('initializes formSearchOpen as false', () => {
            const hook = createFormStepHook();

            expect(hook.formSearchOpen).toBe(false);
        });

        it('has searchForms async method', () => {
            const hook = createFormStepHook();

            expect(typeof hook.searchForms).toBe('function');
        });

        it('has selectFormReference method', () => {
            const hook = createFormStepHook();

            expect(typeof hook.selectFormReference).toBe('function');
        });

        it('has onSelect method', () => {
            const hook = createFormStepHook();

            expect(typeof hook.onSelect).toBe('function');
        });

        it('has afterSync method', () => {
            const hook = createFormStepHook();

            expect(typeof hook.afterSync).toBe('function');
        });

        it('onSelect ensures assignment object exists', () => {
            const hook = createFormStepHook();
            const context = { draft: {} };

            hook.onSelect.call(hook, context as any);

            expect((context.draft as any).assignment).toBeDefined();
        });

        it('onSelect ensures access object exists', () => {
            const hook = createFormStepHook();
            const context = { draft: {} };

            hook.onSelect.call(hook, context as any);

            expect((context.draft as any).access).toBeDefined();
        });

        it('onSelect ensures ui object exists', () => {
            const hook = createFormStepHook();
            const context = { draft: {} };

            hook.onSelect.call(hook, context as any);

            expect((context.draft as any).ui).toBeDefined();
        });

        it('onSelect copies assignment from sourceStep', () => {
            const hook = createFormStepHook();
            const sourceAssignment = { kind: 'INTERNAL_GROUP', value: 'admin', mode: 'all', multiInstance: true };
            const context = {
                draft: {},
                step: { assignment: sourceAssignment }
            };

            hook.onSelect.call(hook, context as any);

            expect((context.draft as any).assignment).toEqual(sourceAssignment);
            expect((context.draft as any).assignment).not.toBe(sourceAssignment);
        });

        it('onSelect handles null context', () => {
            const hook = createFormStepHook();

            expect(() => hook.onSelect.call(hook, null as any)).not.toThrow();
        });

        it('afterSync ensures assignment object exists', () => {
            const hook = createFormStepHook();
            const context = { step: {} };

            hook.afterSync.call(hook, context as any);

            expect((context.step as any).assignment).toBeDefined();
        });

        it('afterSync ensures access object exists', () => {
            const hook = createFormStepHook();
            const context = { step: {} };

            hook.afterSync.call(hook, context as any);

            expect((context.step as any).access).toBeDefined();
        });

        it('afterSync ensures ui object exists', () => {
            const hook = createFormStepHook();
            const context = { step: {} };

            hook.afterSync.call(hook, context as any);

            expect((context.step as any).ui).toBeDefined();
        });

        it('afterSync calls setHint if available', () => {
            const hook = createFormStepHook();
            const setHint = vi.fn();
            const context = { step: { assignment: { kind: 'INTERNAL_USER', value: 'test' } }, setHint };

            hook.afterSync.call(hook, context as any);

            expect(setHint).toHaveBeenCalled();
        });

        it('onSelect calls setHint if available', () => {
            const hook = createFormStepHook();
            const setHint = vi.fn();
            const context = { draft: { assignment: { kind: 'INTERNAL_USER', value: 'test' } }, setHint };

            hook.onSelect.call(hook, context as any);

            expect(setHint).toHaveBeenCalled();
        });
    });

    describe('register', () => {
        let originalRegisterFn: any;

        beforeEach(() => {
            originalRegisterFn = (window as any).registerWorkflowStepHook;
        });

        afterEach(() => {
            (window as any).registerWorkflowStepHook = originalRegisterFn;
        });

        it('calls provided registerFn with form name and hook', () => {
            const registerFn = vi.fn();

            register(registerFn);

            expect(registerFn).toHaveBeenCalledWith('form', expect.any(Object));
        });

        it('registers to window.registerWorkflowStepHook if no function provided', () => {
            const mockRegister = vi.fn();
            (window as any).registerWorkflowStepHook = mockRegister;

            register();

            expect(mockRegister).toHaveBeenCalledWith('form', expect.any(Object));
        });

        it('passes hook object as second argument', () => {
            const registerFn = vi.fn();

            register(registerFn);

            const hookArg = registerFn.mock.calls[0][1];
            expect(hookArg).toHaveProperty('customFields');
            expect(hookArg).toHaveProperty('onSelect');
            expect(hookArg).toHaveProperty('afterSync');
        });

        it('handles missing window function gracefully', () => {
            delete (window as any).registerWorkflowStepHook;

            expect(() => register()).not.toThrow();
        });

        it('does not call if registerWorkflowStepHook is not a function', () => {
            (window as any).registerWorkflowStepHook = 'not a function';

            expect(() => register()).not.toThrow();
        });
    });
});