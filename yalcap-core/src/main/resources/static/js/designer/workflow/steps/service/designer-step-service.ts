// @ts-check

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

interface ServiceStepHook {
    onSelect: (context: ServiceStepContext) => void;
    afterSync: (context: ServiceStepContext) => void;
}

(function registerServiceStepHook(): void {
    const register = (window as any).registerWorkflowStepHook;
    if (typeof register !== 'function') {
        return;
    }

    function evaluateServiceRef(rawValue: unknown): string {
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

    register('service', {
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
    } as ServiceStepHook);
})();
