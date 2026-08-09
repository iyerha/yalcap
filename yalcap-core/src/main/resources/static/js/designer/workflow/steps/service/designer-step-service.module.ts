interface ServiceConfig {
    serviceRef?: string;
    [key: string]: unknown;
}

interface ServiceStepContext {
    draft?: {
        config?: ServiceConfig;
        [key: string]: unknown;
    };
    step?: {
        config?: ServiceConfig;
        [key: string]: unknown;
    };
    setHint?: (hint: string) => void;
}

export interface ServiceStepHook {
    onSelect: (context: ServiceStepContext) => void;
    afterSync: (context: ServiceStepContext) => void;
}

export function evaluateServiceRef(rawValue: unknown): string {
    const value = String(rawValue || '').trim();
    if (!value) {
        return 'Service step: set serviceRef to a stable handler id or bean reference.';
    }

    if (value.indexOf(' ') >= 0) {
        return 'Service reference should not contain spaces.';
    }

    if (value.indexOf(':') > 0 || value.indexOf('.') > 0) {
        return 'Service reference looks structured and ready.';
    }

    return 'Consider using a namespaced ref like domain.service or bean:serviceHandler.';
}

export function createServiceStepHook(): ServiceStepHook {
    return {
        onSelect(context: ServiceStepContext): void {
            if (!context || !context.draft) {
                return;
            }

            const draft = context.draft;
            if (!draft.config || typeof draft.config !== 'object') {
                draft.config = {};
            }

            if (typeof context.setHint === 'function') {
                context.setHint(evaluateServiceRef(draft.config!.serviceRef));
            }
        },

        afterSync(context: ServiceStepContext): void {
            if (!context || !context.step || !context.step.config) {
                return;
            }

            if (typeof context.setHint === 'function') {
                context.setHint(evaluateServiceRef(context.step.config.serviceRef));
            }
        }
    };
}

export function register(registerFn?: (name: string, hook: ServiceStepHook) => void): void {
    const target = registerFn || (window as any).registerWorkflowStepHook;
    
    if (typeof target !== 'function') {
        return;
    }

    target('service', createServiceStepHook());
}