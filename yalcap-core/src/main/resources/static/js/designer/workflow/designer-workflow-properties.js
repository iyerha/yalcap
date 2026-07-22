window.workflowDesignerPropertiesMixin = function workflowDesignerPropertiesMixin(target) {
    Object.assign(target, {
        selectedStepDraft: null,
        selectedStepHint: '',
        configFieldErrors: {},

        refreshSelectedStepView() {
            const selectedId = String(this.selectedNodeId || '').trim();
            if (!selectedId) {
                this.selectedStepDraft = null;
                this.selectedStepHint = '';
                this.configFieldErrors = {};
                return;
            }
            const sourceStep = this.findSelectedStep(selectedId);
            this.selectedStepHint = '';
            this.configFieldErrors = {};
            this.selectedStepDraft = sourceStep ? {
                id: sourceStep.id,
                title: sourceStep.title,
                type: sourceStep.type,
                config: JSON.parse(JSON.stringify(sourceStep.config || {})),
                next: sourceStep.next,
                transitions: Object.assign({}, sourceStep.transitions || {}),
                designer: {
                    position: {
                        x: Number(sourceStep.designer && sourceStep.designer.position && sourceStep.designer.position.x) || 0,
                        y: Number(sourceStep.designer && sourceStep.designer.position && sourceStep.designer.position.y) || 0
                    }
                },
                nodeId: sourceStep.nodeId
            } : null;

            if (this.selectedStepDraft) {
                this.invokeStepHook(this.selectedStepDraft.type, 'onSelect', {
                    step: sourceStep,
                    draft: this.selectedStepDraft,
                    setHint: (hint) => {
                        this.selectedStepHint = String(hint || '').trim();
                    },
                    sync: () => this.syncSelectedStep()
                });
            }
        },

        normalizeNodeId(nodeId) {
            return String(nodeId || '').replace(/^node-/, '').trim();
        },

        selectWorkflowNode(nodeId) {
            const normalizedNodeId = this.normalizeNodeId(nodeId);
            if (!normalizedNodeId) {
                return;
            }
            this.selectedNodeId = normalizedNodeId;
            this.refreshSelectedStepView();
        },

        findSelectedStep(selectedId) {
            const normalizedSelectedId = this.normalizeNodeId(selectedId);
            const graphNode = this.getGraphNode(normalizedSelectedId);
            const graphStepId = graphNode && graphNode.data ? String(graphNode.data.stepId || '').trim() : '';

            return this.steps.find((step) => {
                if (graphStepId && String(step.id) === graphStepId) {
                    return true;
                }
                return this.normalizeNodeId(step.nodeId) === normalizedSelectedId || String(step.id) === String(selectedId);
            }) || null;
        },

        togglePropertiesCollapsed() {
            this.propertiesCollapsed = !this.propertiesCollapsed;
        },

        getSelectedStepConfigFields() {
            const selectedType = this.selectedStepDraft ? this.selectedStepDraft.type : null;
            const descriptor = this.getStepTypeDescriptor(selectedType);
            const schema = descriptor && descriptor.configSchema && typeof descriptor.configSchema === 'object'
                ? descriptor.configSchema
                : {};
            const properties = schema && schema.properties && typeof schema.properties === 'object'
                ? schema.properties
                : {};

            return Object.keys(properties).map((key) => {
                const raw = properties[key] || {};
                return {
                    key: key,
                    title: String(raw.title || key),
                    type: String(raw.type || 'string'),
                    format: String(raw.format || '').trim(),
                    placeholder: String(raw.placeholder || '').trim(),
                    enumValues: Array.isArray(raw.enum) ? raw.enum.map((value) => String(value)) : []
                };
            });
        },

        getSelectedStepOutputCount() {
            const selectedType = this.selectedStepDraft ? this.selectedStepDraft.type : null;
            return this.getStepTypeOutputCount(selectedType);
        },

        getSelectedStepOutputIndices() {
            const outputCount = this.getSelectedStepOutputCount();
            return Array.from({ length: outputCount }, function (_, index) {
                return index + 1;
            });
        },

        getSelectedStepConfigValue(key) {
            if (!this.selectedStepDraft || !this.selectedStepDraft.config) {
                return '';
            }
            const value = this.selectedStepDraft.config[key];
            return value == null ? '' : String(value);
        },

        normalizeJsonConfig(text) {
            const trimmed = String(text || '').trim();
            if (!trimmed) {
                return null;
            }

            const parsed = JSON.parse(trimmed);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('Value must be a JSON object');
            }
            return parsed;
        },

        updateSelectedStepConfig(field, value) {
            if (!this.selectedStepDraft) {
                return;
            }

            const key = String(field && field.key || '').trim();
            if (!key) {
                return;
            }

            if (!this.selectedStepDraft.config || typeof this.selectedStepDraft.config !== 'object') {
                this.selectedStepDraft.config = {};
            }

            const rawValue = value == null ? '' : String(value);
            this.selectedStepDraft.config[key] = rawValue;

            if (String(field && field.format || '').trim() === 'json') {
                try {
                    this.normalizeJsonConfig(rawValue);
                    delete this.configFieldErrors[key];
                } catch (err) {
                    this.configFieldErrors[key] = err instanceof Error ? err.message : String(err);
                }
            } else {
                delete this.configFieldErrors[key];
            }

            this.syncSelectedStep();
        },

        syncSelectedStep() {
            const draft = this.selectedStepDraft;
            if (!draft) {
                return;
            }

            const sourceStep = this.findSelectedStep(this.selectedNodeId);
            if (!sourceStep) {
                return;
            }

            const previousType = sourceStep.type;
            const typeChanged = String(previousType || '').trim() !== String(draft.type || '').trim();

            if (typeChanged) {
                draft.config = this.getStepTypeConfigDefaults(draft.type);
                this.configFieldErrors = {};
            }

            if (Object.keys(this.configFieldErrors).length > 0) {
                return;
            }

            sourceStep.id = draft.id;
            sourceStep.title = draft.title;
            sourceStep.type = draft.type;

            sourceStep.config = JSON.parse(JSON.stringify(draft.config || {}));

            if (String(draft.type || '').trim() === 'form') {
                sourceStep.assignee.kind = String(sourceStep.config.assigneeKind || 'INTERNAL_USER').trim();
                sourceStep.assignee.value = String(sourceStep.config.assigneeValue || '').trim();
            } else {
                sourceStep.assignee.kind = 'INTERNAL_USER';
                sourceStep.assignee.value = '';
            }

            sourceStep.next = draft.next;
            sourceStep.transitions = Object.assign({}, draft.transitions || sourceStep.transitions || {});

            const outputCount = this.getStepTypeOutputCount(draft.type);
            if (outputCount > 1) {
                const labels = {};
                for (let outputIndex = 1; outputIndex <= outputCount; outputIndex += 1) {
                    const configKey = 'action' + outputIndex + 'Label';
                    const label = String(sourceStep.config[configKey] || '').trim();
                    labels['output_' + outputIndex] = label || ('Action ' + outputIndex);
                }
                sourceStep.transitionLabels = labels;

                try {
                    sourceStep.condition = this.normalizeJsonConfig(sourceStep.config.conditionJson);
                } catch (_) {
                    sourceStep.condition = null;
                }
            } else {
                sourceStep.transitionLabels = {};
                sourceStep.condition = null;
            }

            sourceStep.designer.position = {
                x: Number(draft.designer && draft.designer.position && draft.designer.position.x) || 0,
                y: Number(draft.designer && draft.designer.position && draft.designer.position.y) || 0
            };

            this.invokeStepHook(sourceStep.type, 'afterSync', {
                step: sourceStep,
                draft: draft,
                setHint: (hint) => {
                    this.selectedStepHint = String(hint || '').trim();
                }
            });

            if (this.useFallbackCanvas) {
                this.generate();
                this.renderFallbackCanvas();
                return;
            }

            if (!this.editor) {
                return;
            }

            const selectedGraphNodeId = this.normalizeNodeId(this.selectedNodeId);
            const graphNode = this.getGraphNode(selectedGraphNodeId) || this.getGraphNodeByStepId(sourceStep.id);
            if (!graphNode) {
                return;
            }

            graphNode.data = {
                stepId: sourceStep.id,
                stepTitle: sourceStep.title,
                stepType: sourceStep.type
            };

            graphNode.class = this.getWorkflowNodeClass(sourceStep);

            const nodeElement = document.querySelector('#node-' + selectedGraphNodeId);
            if (nodeElement) {
                nodeElement.className = 'drawflow-node ' + this.getWorkflowNodeClass(sourceStep);
            }

            const nodeContent = nodeElement ? nodeElement.querySelector('.drawflow_content_node') : null;
            if (nodeContent) {
                nodeContent.innerHTML = this.renderNodeTemplate(sourceStep);
            }

            if (typeChanged) {
                this.syncTransitionsFromGraph();
                this.generate();
                this.renderGraphFromSteps();
                return;
            }

            this.syncTransitionsFromGraph();
            this.generate();
            if (this.useFallbackCanvas) {
                this.renderFallbackCanvas();
            }
            this.refreshSelectedStepView();
        },

        removeSelectedNode() {
            if (this.useFallbackCanvas) {
                if (!this.selectedNodeId) {
                    return;
                }
                const normalizedSelectedId = this.normalizeNodeId(this.selectedNodeId);
                this.steps = this.steps.filter((step) => this.normalizeNodeId(step.nodeId) !== normalizedSelectedId);
                this.selectedNodeId = this.steps[0] ? String(this.steps[0].nodeId) : null;
                this.refreshSelectedStepView();
                this.generate();
                this.renderFallbackCanvas();
                return;
            }

            if (!this.editor || !this.selectedNodeId) {
                return;
            }
            this.editor.removeNodeId('node-' + this.selectedNodeId);
        }
    });
};