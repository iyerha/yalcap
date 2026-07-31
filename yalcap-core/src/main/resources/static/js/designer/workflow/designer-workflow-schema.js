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
            const routing = step && step.routing && typeof step.routing === 'object' && !Array.isArray(step.routing)
                ? step.routing
                : {};
            const transitions = routing.transitions && typeof routing.transitions === 'object' && !Array.isArray(routing.transitions)
                ? routing.transitions
                : (step && step.transitions && typeof step.transitions === 'object' && !Array.isArray(step.transitions) ? step.transitions : {});
            const ui = step && step.ui && typeof step.ui === 'object' && !Array.isArray(step.ui) ? step.ui : {};
            const uiDesigner = ui.designer && typeof ui.designer === 'object' && !Array.isArray(ui.designer) ? ui.designer : {};
            const rawPosition = uiDesigner.position || (step && step.position) || {};
            const assignment = step && step.assignment && typeof step.assignment === 'object' && !Array.isArray(step.assignment)
                ? step.assignment
                : {};
            const access = step && step.access && typeof step.access === 'object' && !Array.isArray(step.access)
                ? step.access
                : {};

            return {
                id: (step.id || ('step-' + idx)).trim(),
                title: (step.title || '').trim(),
                type: normalizedType,
                config: this.createInitialConfig(step, normalizedType),
                assignment: {
                    kind: String(assignment.kind || 'INTERNAL_USER').trim(),
                    value: String(assignment.value || '').trim(),
                    mode: String(assignment.mode || 'first-wins').trim(),
                    multiInstance: Boolean(assignment.multiInstance)
                },
                access: {
                    groups: Array.isArray(access.groups) ? access.groups.map((v) => String(v || '').trim()).filter(Boolean) : [],
                    users: Array.isArray(access.users) ? access.users.map((v) => String(v || '').trim()).filter(Boolean) : []
                },
                ui: {
                    pointer: String((ui.pointer || step.uiPointer || '')).trim(),
                    designer: {
                        position: {
                            x: Number(rawPosition.x) || (80 + (idx * 160)),
                            y: Number(rawPosition.y) || 120
                        }
                    }
                },
                routing: {
                    transitions: Object.assign({}, transitions)
                },
                transitionLabels: step && step.transitionLabels && typeof step.transitionLabels === 'object' && !Array.isArray(step.transitionLabels)
                    ? Object.assign({}, step.transitionLabels)
                    : {},
                condition: step && step.condition && typeof step.condition === 'object' && !Array.isArray(step.condition)
                    ? JSON.parse(JSON.stringify(step.condition))
                    : null,
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