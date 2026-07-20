window.workflowDesignerPropertiesMixin = function workflowDesignerPropertiesMixin(target) {
    Object.assign(target, {
        selectedStepDraft: null,
        decisionConditionError: '',

        refreshSelectedStepView() {
            const selectedId = String(this.selectedNodeId || '').trim();
            if (!selectedId) {
                this.selectedStepDraft = null;
                this.decisionConditionError = '';
                return;
            }
            const sourceStep = this.findSelectedStep(selectedId);
            this.decisionConditionError = '';
            this.selectedStepDraft = sourceStep ? {
                id: sourceStep.id,
                title: sourceStep.title,
                type: sourceStep.type,
                assignee: {
                    kind: sourceStep.assignee.kind,
                    value: sourceStep.assignee.value
                },
                next: sourceStep.next,
                transitions: Object.assign({}, sourceStep.transitions || {}),
                transitionLabels: {
                    output_1: String((sourceStep.transitionLabels && sourceStep.transitionLabels.output_1) || '').trim(),
                    output_2: String((sourceStep.transitionLabels && sourceStep.transitionLabels.output_2) || '').trim()
                },
                conditionJson: sourceStep.condition ? JSON.stringify(sourceStep.condition, null, 2) : '',
                designer: {
                    position: {
                        x: Number(sourceStep.designer && sourceStep.designer.position && sourceStep.designer.position.x) || 0,
                        y: Number(sourceStep.designer && sourceStep.designer.position && sourceStep.designer.position.y) || 0
                    }
                },
                nodeId: sourceStep.nodeId
            } : null;
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

        normalizeDecisionCondition(raw) {
            const text = String(raw || '').trim();
            if (!text) {
                return null;
            }

            const parsed = JSON.parse(text);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('Condition must be a JSON object');
            }

            return parsed;
        },

        cleanTransitionLabels(labels) {
            const cleaned = {};
            ['output_1', 'output_2'].forEach((key, index) => {
                const value = String(labels && labels[key] || '').trim();
                if (value) {
                    cleaned[key] = value;
                    return;
                }
                cleaned[key] = 'Action ' + (index + 1);
            });
            return cleaned;
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
            const isDecision = String(draft.type || '').trim() === 'decision';
            let normalizedCondition = null;

            if (isDecision) {
                try {
                    normalizedCondition = this.normalizeDecisionCondition(draft.conditionJson);
                    this.decisionConditionError = '';
                } catch (err) {
                    this.decisionConditionError = err instanceof Error ? err.message : String(err);
                    return;
                }
            } else {
                this.decisionConditionError = '';
            }

            sourceStep.id = draft.id;
            sourceStep.title = draft.title;
            sourceStep.type = draft.type;
            if (String(draft.type || '').trim() === 'form') {
                sourceStep.assignee.kind = draft.assignee.kind;
                sourceStep.assignee.value = draft.assignee.value;
            } else {
                sourceStep.assignee.kind = 'INTERNAL_USER';
                sourceStep.assignee.value = '';
            }
            sourceStep.next = draft.next;
            sourceStep.transitions = Object.assign({}, draft.transitions || sourceStep.transitions || {});
            sourceStep.transitionLabels = isDecision ? this.cleanTransitionLabels(draft.transitionLabels) : {};
            sourceStep.condition = isDecision ? normalizedCondition : null;
            sourceStep.designer.position = {
                x: Number(draft.designer && draft.designer.position && draft.designer.position.x) || 0,
                y: Number(draft.designer && draft.designer.position && draft.designer.position.y) || 0
            };

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