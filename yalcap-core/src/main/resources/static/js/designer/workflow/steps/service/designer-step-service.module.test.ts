import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { evaluateServiceRef, createServiceStepHook, register } from './designer-step-service.module';

describe('designer-step-service.module', () => {
    describe('evaluateServiceRef', () => {
        it('returns hint when serviceRef is missing', () => {
            const hint = evaluateServiceRef(undefined);

            expect(hint).toBe('Service step: set serviceRef to a stable handler id or bean reference.');
        });

        it('returns hint when serviceRef is empty string', () => {
            const hint = evaluateServiceRef('');

            expect(hint).toBe('Service step: set serviceRef to a stable handler id or bean reference.');
        });

        it('returns hint when serviceRef is whitespace only', () => {
            const hint = evaluateServiceRef('   ');

            expect(hint).toBe('Service step: set serviceRef to a stable handler id or bean reference.');
        });

        it('returns hint when serviceRef contains spaces', () => {
            const hint = evaluateServiceRef('my service handler');

            expect(hint).toBe('Service reference should not contain spaces.');
        });

        it('returns hint for null serviceRef', () => {
            const hint = evaluateServiceRef(null);

            expect(hint).toBe('Service step: set serviceRef to a stable handler id or bean reference.');
        });

        it('returns ready hint for serviceRef with colon', () => {
            const hint = evaluateServiceRef('bean:myService');

            expect(hint).toBe('Service reference looks structured and ready.');
        });

        it('returns ready hint for serviceRef with dot', () => {
            const hint = evaluateServiceRef('domain.service');

            expect(hint).toBe('Service reference looks structured and ready.');
        });

        it('returns ready hint for serviceRef with both colon and dot', () => {
            const hint = evaluateServiceRef('bean:com.example.Service');

            expect(hint).toBe('Service reference looks structured and ready.');
        });

        it('returns namespace suggestion for simple serviceRef', () => {
            const hint = evaluateServiceRef('myService');

            expect(hint).toBe('Consider using a namespaced ref like domain.service or bean:serviceHandler.');
        });

        it('returns namespace suggestion for single word', () => {
            const hint = evaluateServiceRef('handler');

            expect(hint).toBe('Consider using a namespaced ref like domain.service or bean:serviceHandler.');
        });

        it('trims whitespace before evaluation', () => {
            const hint = evaluateServiceRef('  bean:myService  ');

            expect(hint).toBe('Service reference looks structured and ready.');
        });

        it('handles numeric serviceRef', () => {
            const hint = evaluateServiceRef(12345);

            expect(hint).toBe('Consider using a namespaced ref like domain.service or bean:serviceHandler.');
        });

        it('handles colon at position 0', () => {
            const hint = evaluateServiceRef(':service');

            expect(hint).toBe('Consider using a namespaced ref like domain.service or bean:serviceHandler.');
        });

        it('detects colon after position 0', () => {
            const hint = evaluateServiceRef('bean:handler');

            expect(hint).toBe('Service reference looks structured and ready.');
        });

        it('detects dot in serviceRef', () => {
            const hint = evaluateServiceRef('my.handler');

            expect(hint).toBe('Service reference looks structured and ready.');
        });
    });

    describe('createServiceStepHook', () => {
        it('returns hook with onSelect method', () => {
            const hook = createServiceStepHook();

            expect(hook).toHaveProperty('onSelect');
            expect(typeof hook.onSelect).toBe('function');
        });

        it('returns hook with afterSync method', () => {
            const hook = createServiceStepHook();

            expect(hook).toHaveProperty('afterSync');
            expect(typeof hook.afterSync).toBe('function');
        });

        it('onSelect creates config object if missing', () => {
            const hook = createServiceStepHook();
            const context = { draft: {} } as any;

            hook.onSelect(context);

            expect(context.draft.config).toBeDefined();
            expect(typeof context.draft.config).toBe('object');
        });

        it('onSelect calls setHint with evaluation of serviceRef', () => {
            const hook = createServiceStepHook();
            const setHint = vi.fn();
            const context = { draft: { config: { serviceRef: 'bean:myService' } }, setHint } as any;

            hook.onSelect(context);

            expect(setHint).toHaveBeenCalledWith('Service reference looks structured and ready.');
        });

        it('onSelect calls setHint for missing serviceRef', () => {
            const hook = createServiceStepHook();
            const setHint = vi.fn();
            const context = { draft: { config: {} }, setHint } as any;

            hook.onSelect(context);

            expect(setHint).toHaveBeenCalledWith('Service step: set serviceRef to a stable handler id or bean reference.');
        });

        it('onSelect handles null context gracefully', () => {
            const hook = createServiceStepHook();

            expect(() => hook.onSelect(null as any)).not.toThrow();
        });

        it('onSelect handles missing draft gracefully', () => {
            const hook = createServiceStepHook();
            const context = {} as any;

            expect(() => hook.onSelect(context)).not.toThrow();
        });

        it('onSelect handles non-object config gracefully', () => {
            const hook = createServiceStepHook();
            const context = { draft: { config: 'not an object' } } as any;

            hook.onSelect(context);

            expect(typeof context.draft.config).toBe('object');
        });

        it('onSelect preserves existing config properties', () => {
            const hook = createServiceStepHook();
            const context = { draft: { config: { serviceRef: 'bean:service', otherProp: 'value' } } } as any;

            hook.onSelect(context);

            expect(context.draft.config.otherProp).toBe('value');
        });

        it('afterSync calls setHint with evaluation of serviceRef', () => {
            const hook = createServiceStepHook();
            const setHint = vi.fn();
            const context = { step: { config: { serviceRef: 'domain.service' } }, setHint } as any;

            hook.afterSync(context);

            expect(setHint).toHaveBeenCalledWith('Service reference looks structured and ready.');
        });

        it('afterSync handles null context gracefully', () => {
            const hook = createServiceStepHook();

            expect(() => hook.afterSync(null as any)).not.toThrow();
        });

        it('afterSync handles missing step gracefully', () => {
            const hook = createServiceStepHook();
            const context = {} as any;

            expect(() => hook.afterSync(context)).not.toThrow();
        });

        it('afterSync handles missing config gracefully', () => {
            const hook = createServiceStepHook();
            const context = { step: {} } as any;

            expect(() => hook.afterSync(context)).not.toThrow();
        });

        it('afterSync does not call setHint if not available', () => {
            const hook = createServiceStepHook();
            const context = { step: { config: { serviceRef: 'bean:service' } } } as any;

            expect(() => hook.afterSync(context)).not.toThrow();
        });

        it('onSelect does not call setHint if not available', () => {
            const hook = createServiceStepHook();
            const context = { draft: { config: { serviceRef: 'bean:service' } } } as any;

            expect(() => hook.onSelect(context)).not.toThrow();
        });

        it('onSelect evaluates empty serviceRef correctly', () => {
            const hook = createServiceStepHook();
            const setHint = vi.fn();
            const context = { draft: { config: { serviceRef: '' } }, setHint } as any;

            hook.onSelect(context);

            expect(setHint).toHaveBeenCalledWith('Service step: set serviceRef to a stable handler id or bean reference.');
        });

        it('afterSync evaluates serviceRef with spaces', () => {
            const hook = createServiceStepHook();
            const setHint = vi.fn();
            const context = { step: { config: { serviceRef: 'my service' } }, setHint } as any;

            hook.afterSync(context);

            expect(setHint).toHaveBeenCalledWith('Service reference should not contain spaces.');
        });

        it('onSelect and afterSync can be called independently', () => {
            const hook = createServiceStepHook();
            const setHint1 = vi.fn();
            const setHint2 = vi.fn();
            const context1 = { draft: { config: { serviceRef: 'simple' } }, setHint: setHint1 } as any;
            const context2 = { step: { config: { serviceRef: 'bean:complex' } }, setHint: setHint2 } as any;

            hook.onSelect(context1);
            hook.afterSync(context2);

            expect(setHint1).toHaveBeenCalled();
            expect(setHint2).toHaveBeenCalled();
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

        it('calls provided registerFn with service name and hook', () => {
            const registerFn = vi.fn();

            register(registerFn);

            expect(registerFn).toHaveBeenCalledWith('service', expect.any(Object));
        });

        it('registers to window.registerWorkflowStepHook if no function provided', () => {
            const mockRegister = vi.fn();
            (window as any).registerWorkflowStepHook = mockRegister;

            register();

            expect(mockRegister).toHaveBeenCalledWith('service', expect.any(Object));
        });

        it('passes hook object with onSelect method', () => {
            const registerFn = vi.fn();

            register(registerFn);

            const hookArg = registerFn.mock.calls[0][1];
            expect(hookArg).toHaveProperty('onSelect');
            expect(typeof hookArg.onSelect).toBe('function');
        });

        it('passes hook object with afterSync method', () => {
            const registerFn = vi.fn();

            register(registerFn);

            const hookArg = registerFn.mock.calls[0][1];
            expect(hookArg).toHaveProperty('afterSync');
            expect(typeof hookArg.afterSync).toBe('function');
        });

        it('handles missing window function gracefully', () => {
            delete (window as any).registerWorkflowStepHook;

            expect(() => register()).not.toThrow();
        });

        it('does not call if registerWorkflowStepHook is not a function', () => {
            (window as any).registerWorkflowStepHook = 'not a function';

            expect(() => register()).not.toThrow();
        });

        it('hook passed to register has working onSelect', () => {
            const registerFn = vi.fn();

            register(registerFn);

            const hook = registerFn.mock.calls[0][1];
            const setHint = vi.fn();
            const context = { draft: { config: { serviceRef: 'bean:service' } }, setHint } as any;

            hook.onSelect(context);

            expect(setHint).toHaveBeenCalled();
        });

        it('hook passed to register has working afterSync', () => {
            const registerFn = vi.fn();

            register(registerFn);

            const hook = registerFn.mock.calls[0][1];
            const setHint = vi.fn();
            const context = { step: { config: { serviceRef: 'domain.service' } }, setHint } as any;

            hook.afterSync(context);

            expect(setHint).toHaveBeenCalled();
        });
    });
});