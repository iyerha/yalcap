window.workflowDesignerSchemaMixin = function workflowDesignerSchemaMixin(target) {
    Object.assign(target, {
        normalizeStep(step, idx) {
            const resolvedNext = this.resolveNextStepId(step);
            const transitions = step && step.transitions;
            const transitionLabels = step && step.transitionLabels;
            const designer = step && step.designer && typeof step.designer === 'object' && !Array.isArray(step.designer)
                ? step.designer
                : {};
            const rawPosition = designer.position || (step && step.position) || {};
            return {
                id: (step.id || ('step-' + idx)).trim(),
                title: (step.title || '').trim(),
                type: (step.type || 'form').trim(),
                assignee: {
                    kind: ((step.assignee && step.assignee.kind) || 'INTERNAL_USER').trim(),
                    value: ((step.assignee && step.assignee.value) || '').trim()
                },
                next: resolvedNext,
                transitions: transitions && typeof transitions === 'object' && !Array.isArray(transitions)
                    ? Object.assign({}, transitions)
                    : {},
                transitionLabels: transitionLabels && typeof transitionLabels === 'object' && !Array.isArray(transitionLabels)
                    ? Object.assign({}, transitionLabels)
                    : {},
                condition: step && step.condition && typeof step.condition === 'object' && !Array.isArray(step.condition)
                    ? JSON.parse(JSON.stringify(step.condition))
                    : null,
                designer: {
                    position: {
                        x: Number(rawPosition.x) || (80 + (idx * 160)),
                        y: Number(rawPosition.y) || 120
                    }
                },
                nodeId: step.nodeId || null
            };
        },

        resolveNextStepId(step) {
            const explicitNext = String((step && step.next) || '').trim();
            if (explicitNext) {
                return explicitNext;
            }

            const transitions = step && step.transitions;
            if (transitions && typeof transitions === 'object' && !Array.isArray(transitions)) {
                const preferredKeys = ['onApprove', 'onSubmit', 'onAccept', 'onSuccess', 'default'];
                const preferredTarget = preferredKeys
                    .map((key) => String(transitions[key] || '').trim())
                    .find((value) => Boolean(value));
                if (preferredTarget) {
                    return preferredTarget;
                }

                const firstTarget = Object.values(transitions)
                    .map((value) => String(value || '').trim())
                    .find((value) => Boolean(value));
                return firstTarget || '';
            }

            return '';
        }
    });
};