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

export interface StepHook {
    onSelect?: (context: StepHookContext) => void;
}

export function createDecisionStepHook(): StepHook {
    return {
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
    };
}

export function register(registerFn?: (name: string, hook: StepHook) => void): void {
    const target = registerFn || ((window as any).registerWorkflowStepHook as ((name: string, hook: StepHook) => void) | undefined);
    
    if (typeof target !== 'function') {
        return;
    }

    target('decision', createDecisionStepHook());
}