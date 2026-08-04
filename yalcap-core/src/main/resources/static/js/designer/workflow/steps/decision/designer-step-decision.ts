// @ts-check

interface StepConfig {
    action1Label?: string;
    action2Label?: string;
    [key: string]: unknown;
}

interface WorkflowDraft {
    config?: StepConfig;
    [key: string]: unknown;
}

interface StepHookContext {
    draft: WorkflowDraft;
    setHint?: (message: string) => void;
    sync?: () => void;
}

interface StepHook {
    onSelect?: (context: StepHookContext) => void;
}

(function registerDecisionStepHook(): void {
    const register = (window as any).registerWorkflowStepHook as
        | ((stepType: string, hook: StepHook) => void)
        | undefined;

    if (typeof register !== 'function') {
        return;
    }

    register('decision', {
        onSelect(context: StepHookContext): void {
            if (!context || !context.draft) {
                return;
            }

            if (typeof context.setHint === 'function') {
                context.setHint(
                    'Decision steps route along output connectors. Provide a JSON object condition and optional action labels.'
                );
            }

            const draft = context.draft;
            if (!draft.config || typeof draft.config !== 'object') {
                draft.config = {};
            }

            let changed = false;
            if (!String(draft.config.action1Label || '').trim()) {
                draft.config.action1Label = 'Approve';
                changed = true;
            }
            if (!String(draft.config.action2Label || '').trim()) {
                draft.config.action2Label = 'Reject';
                changed = true;
            }

            if (changed && typeof context.sync === 'function') {
                context.sync();
            }
        }
    });
})();
