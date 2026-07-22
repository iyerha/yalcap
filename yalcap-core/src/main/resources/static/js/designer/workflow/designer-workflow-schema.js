window.workflowDesignerSchemaMixin = function workflowDesignerSchemaMixin(target) {
    Object.assign(target, {
        getStepTypeDescriptor(type) {
            const normalizedType = String(type || '').trim();
            return this.stepTypes.find((descriptor) => String(descriptor.type || '').trim() === normalizedType) || null;
        },

        getStepTypeOutputCount(type) {
            const descriptor = this.getStepTypeDescriptor(type);
            const outputCount = Number(descriptor && descriptor.outputCount);
            return outputCount > 1 ? outputCount : 1;
        },

        getStepTypeConfigDefaults(type) {
            const descriptor = this.getStepTypeDescriptor(type);
            const defaults = descriptor && descriptor.defaultConfig && typeof descriptor.defaultConfig === 'object'
                ? descriptor.defaultConfig
                : {};
            return JSON.parse(JSON.stringify(defaults));
        },

        createInitialConfig(step, type) {
            const defaults = this.getStepTypeConfigDefaults(type);
            const incomingConfig = step && step.config && typeof step.config === 'object' && !Array.isArray(step.config)
                ? step.config
                : {};
            const config = Object.assign({}, defaults, incomingConfig);

            if (String(type || '').trim() === 'form') {
                const assignee = step && step.assignee && typeof step.assignee === 'object' ? step.assignee : {};
                config.assigneeKind = String(assignee.kind || config.assigneeKind || 'INTERNAL_USER').trim();
                config.assigneeValue = String(assignee.value || config.assigneeValue || '').trim();
            }

            if (String(type || '').trim() === 'decision') {
                const transitionLabels = step && step.transitionLabels && typeof step.transitionLabels === 'object'
                    ? step.transitionLabels
                    : {};
                config.action1Label = String(transitionLabels.output_1 || config.action1Label || 'Action 1').trim();
                config.action2Label = String(transitionLabels.output_2 || config.action2Label || 'Action 2').trim();
                config.conditionJson = step && step.condition
                    ? JSON.stringify(step.condition, null, 2)
                    : String(config.conditionJson || '').trim();
            }

            return config;
        },

        normalizeStep(step, idx) {
            const normalizedType = (step.type || (this.stepTypes[0] && this.stepTypes[0].type) || 'form').trim();
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
                type: normalizedType,
                config: this.createInitialConfig(step, normalizedType),
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