import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDecisionStepHook, register } from './designer-step-decision.module';

describe('designer-step-decision.module', () => {
    describe('createDecisionStepHook', () => {
        it('returns hook with onSelect method', () => {
            const hook = createDecisionStepHook();

            expect(hook).toHaveProperty('onSelect');
            expect(typeof hook.onSelect).toBe('function');
        });

        it('onSelect creates config object if missing', () => {
            const hook = createDecisionStepHook();
            const context = { draft: {} } as any;

            hook.onSelect!(context);

            expect(context.draft.config).toBeDefined();
            expect(typeof context.draft.config).toBe('object');
        });

        it('onSelect sets default action1Label if missing', () => {
            const hook = createDecisionStepHook();
            const context = { draft: { config: {} } } as any;

            hook.onSelect!(context);

            expect(context.draft.config.action1Label).toBe('Approve');
        });

        it('onSelect sets default action2Label if missing', () => {
            const hook = createDecisionStepHook();
            const context = { draft: { config: {} } } as any;

            hook.onSelect!(context);

            expect(context.draft.config.action2Label).toBe('Reject');
        });

        it('onSelect sets both default labels if missing', () => {
            const hook = createDecisionStepHook();
            const context = { draft: { config: {} } } as any;

            hook.onSelect!(context);

            expect(context.draft.config.action1Label).toBe('Approve');
            expect(context.draft.config.action2Label).toBe('Reject');
        });

        it('onSelect does not overwrite existing action1Label', () => {
            const hook = createDecisionStepHook();
            const context = { draft: { config: { action1Label: 'Accept' } } } as any;

            hook.onSelect!(context);

            expect(context.draft.config.action1Label).toBe('Accept');
        });

        it('onSelect does not overwrite existing action2Label', () => {
            const hook = createDecisionStepHook();
            const context = { draft: { config: { action2Label: 'Deny' } } } as any;

            hook.onSelect!(context);

            expect(context.draft.config.action2Label).toBe('Deny');
        });

        it('onSelect does not overwrite both existing labels', () => {
            const hook = createDecisionStepHook();
            const context = { draft: { config: { action1Label: 'Accept', action2Label: 'Deny' } } } as any;

            hook.onSelect!(context);

            expect(context.draft.config.action1Label).toBe('Accept');
            expect(context.draft.config.action2Label).toBe('Deny');
        });

        it('onSelect treats empty string label as missing', () => {
            const hook = createDecisionStepHook();
            const context = { draft: { config: { action1Label: '' } } } as any;

            hook.onSelect!(context);

            expect(context.draft.config.action1Label).toBe('Approve');
        });

        it('onSelect treats whitespace-only label as missing', () => {
            const hook = createDecisionStepHook();
            const context = { draft: { config: { action2Label: '   ' } } } as any;

            hook.onSelect!(context);

            expect(context.draft.config.action2Label).toBe('Reject');
        });

        it('onSelect calls setHint if available', () => {
            const hook = createDecisionStepHook();
            const setHint = vi.fn();
            const context = { draft: {}, setHint } as any;

            hook.onSelect!(context);

            expect(setHint).toHaveBeenCalled();
            expect(setHint).toHaveBeenCalledWith(
                'Decision steps route along output connectors. Provide a JSON object condition and optional action labels.'
            );
        });

        it('onSelect calls sync when changes are made', () => {
            const hook = createDecisionStepHook();
            const sync = vi.fn();
            const context = { draft: { config: {} }, sync } as any;

            hook.onSelect!(context);

            expect(sync).toHaveBeenCalled();
        });

        it('onSelect does not call sync when no changes are made', () => {
            const hook = createDecisionStepHook();
            const sync = vi.fn();
            const context = {
                draft: { config: { action1Label: 'Accept', action2Label: 'Deny' } },
                sync
            } as any;

            hook.onSelect!(context);

            expect(sync).not.toHaveBeenCalled();
        });

        it('onSelect calls sync only once even if both labels are set', () => {
            const hook = createDecisionStepHook();
            const sync = vi.fn();
            const context = { draft: { config: {} }, sync } as any;

            hook.onSelect!(context);

            expect(sync).toHaveBeenCalledTimes(1);
        });

        it('onSelect handles null context gracefully', () => {
            const hook = createDecisionStepHook();

            expect(() => hook.onSelect!(null as any)).not.toThrow();
        });

        it('onSelect handles missing draft gracefully', () => {
            const hook = createDecisionStepHook();
            const context = {} as any;

            expect(() => hook.onSelect!(context)).not.toThrow();
        });

        it('onSelect handles non-object config gracefully', () => {
            const hook = createDecisionStepHook();
            const context = { draft: { config: 'not an object' } } as any;

            hook.onSelect!(context);

            expect(typeof context.draft.config).toBe('object');
            expect(context.draft.config.action1Label).toBe('Approve');
        });

        it('onSelect preserves other config properties', () => {
            const hook = createDecisionStepHook();
            const context = { draft: { config: { someProperty: 'value' } } } as any;

            hook.onSelect!(context);

            expect(context.draft.config.someProperty).toBe('value');
            expect(context.draft.config.action1Label).toBe('Approve');
        });

        it('onSelect calls setHint before modifying config', () => {
            const hook = createDecisionStepHook();
            const setHint = vi.fn();
            const context = { draft: {}, setHint } as any;

            hook.onSelect!(context);

            expect(setHint).toHaveBeenCalled();
        });

        it('onSelect calls sync after config is modified', () => {
            const hook = createDecisionStepHook();
            const sync = vi.fn();
            const context = { draft: { config: {} }, sync } as any;

            hook.onSelect!(context);

            expect(context.draft.config.action1Label).toBe('Approve');
            expect(sync).toHaveBeenCalled();
        });

        it('onSelect only sets labels if config is object', () => {
            const hook = createDecisionStepHook();
            const context = { draft: {} } as any;

            hook.onSelect!(context);

            expect(context.draft.config).toHaveProperty('action1Label');
            expect(context.draft.config).toHaveProperty('action2Label');
        });

        it('onSelect with both labels missing calls sync once', () => {
            const hook = createDecisionStepHook();
            const sync = vi.fn();
            const context = { draft: { config: {} }, sync } as any;

            hook.onSelect!(context);

            expect(sync).toHaveBeenCalledTimes(1);
        });

        it('onSelect with first label missing calls sync', () => {
            const hook = createDecisionStepHook();
            const sync = vi.fn();
            const context = { draft: { config: { action2Label: 'Reject' } }, sync } as any;

            hook.onSelect!(context);

            expect(sync).toHaveBeenCalled();
        });

        it('onSelect with second label missing calls sync', () => {
            const hook = createDecisionStepHook();
            const sync = vi.fn();
            const context = { draft: { config: { action1Label: 'Approve' } }, sync } as any;

            hook.onSelect!(context);

            expect(sync).toHaveBeenCalled();
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

        it('calls provided registerFn with decision name and hook', () => {
            const registerFn = vi.fn();

            register(registerFn);

            expect(registerFn).toHaveBeenCalledWith('decision', expect.any(Object));
        });

        it('registers to window.registerWorkflowStepHook if no function provided', () => {
            const mockRegister = vi.fn();
            (window as any).registerWorkflowStepHook = mockRegister;

            register();

            expect(mockRegister).toHaveBeenCalledWith('decision', expect.any(Object));
        });

        it('passes hook object with onSelect method', () => {
            const registerFn = vi.fn();

            register(registerFn);

            const hookArg = registerFn.mock.calls[0][1];
            expect(hookArg).toHaveProperty('onSelect');
            expect(typeof hookArg.onSelect).toBe('function');
        });

        it('handles missing window function gracefully', () => {
            delete (window as any).registerWorkflowStepHook;

            expect(() => register()).not.toThrow();
        });

        it('does not call if registerWorkflowStepHook is not a function', () => {
            (window as any).registerWorkflowStepHook = 'not a function';

            expect(() => register()).not.toThrow();
        });

        it('hook passed to register works correctly', () => {
            const registerFn = vi.fn();

            register(registerFn);

            const hook = registerFn.mock.calls[0][1];
            const context = { draft: { config: {} } } as any;

            hook.onSelect(context);

            expect(context.draft.config.action1Label).toBe('Approve');
        });
    });
});