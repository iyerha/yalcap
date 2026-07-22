window.workflowDesignerCanvasMixin = function workflowDesignerCanvasMixin(target) {
    Object.assign(target, {
        ensureCanvasInteractions() {
            if (this.canvasInteractionsBound) {
                return;
            }
            const canvas = document.getElementById('drawflowCanvas');
            if (!canvas) {
                return;
            }

            this.canvasElement = canvas;
            this.canvasCardElement = canvas.closest('.canvas-card');
            canvas.addEventListener('click', (event) => {
                const nodeElement = event.target && event.target.closest ? event.target.closest('.drawflow-node') : null;
                if (!nodeElement) {
                    return;
                }
                this.selectWorkflowNode(nodeElement.id);
            });

            document.addEventListener('pointerdown', (event) => {
                const nodeElement = event.target && event.target.closest ? event.target.closest('.drawflow-node') : null;
                if (!nodeElement) {
                    return;
                }
                this.selectWorkflowNode(nodeElement.id);
            }, true);

            this.canvasInteractionsBound = true;
        },

        initEditorWhenReady(attempt) {
            if (this.editor) {
                return;
            }

            const canvas = document.getElementById('drawflowCanvas');
            if (!canvas) {
                if (attempt < 50) {
                    window.setTimeout(() => this.initEditorWhenReady(attempt + 1), 100);
                }
                return;
            }

            if (typeof Drawflow === 'undefined') {
                if (attempt < 20) {
                    window.setTimeout(() => this.initEditorWhenReady(attempt + 1), 100);
                    return;
                }

                this.activateFallbackCanvas();
                if (this.pendingPaletteInsert) {
                    const pending = this.pendingPaletteInsert;
                    this.pendingPaletteInsert = null;
                    this.addNodeFromPalette(pending.type, pending.position);
                }
                return;
            }

            this.initializeDrawflow();
            this.renderGraphFromSteps();

            if (this.pendingPaletteInsert) {
                const pending = this.pendingPaletteInsert;
                this.pendingPaletteInsert = null;
                this.addNodeFromPalette(pending.type, pending.position);
            }
        },

        initializeDrawflow() {
            const canvas = document.getElementById('drawflowCanvas');
            if (!canvas || typeof Drawflow === 'undefined') {
                return;
            }

            this.canvasElement = canvas;
            this.canvasCardElement = canvas.closest('.canvas-card');

            this.editor = new Drawflow(canvas);
            this.editor.reroute = true;
            this.editor.start();

            this.editor.on('nodeSelected', (nodeId) => {
                this.selectWorkflowNode(nodeId);
            });

            this.editor.on('nodeRemoved', (nodeId) => {
                const normalizedNodeId = this.normalizeNodeId(nodeId);
                this.steps = this.steps.filter((step) => String(step.nodeId) !== normalizedNodeId);
                if (String(this.selectedNodeId) === normalizedNodeId) {
                    this.selectedNodeId = null;
                    this.refreshSelectedStepView();
                }
                if (this.isHydratingGraph) {
                    return;
                }
                this.syncTransitionsFromGraph();
                this.generate();
            });

            this.editor.on('connectionCreated', (connection) => {
                if (this.isHydratingGraph) {
                    return;
                }
                this.enforceSingleConnectionPerOutput(connection);
                this.syncTransitionsFromGraph();
                this.generate();
            });

            this.editor.on('connectionRemoved', () => {
                if (this.isHydratingGraph) {
                    return;
                }
                this.syncTransitionsFromGraph();
                this.generate();
            });

            this.editor.on('nodeMoved', (nodeId) => {
                const normalizedNodeId = this.normalizeNodeId(nodeId);
                const graphNode = this.getGraphNode(normalizedNodeId);
                const step = this.steps.find((item) => String(item.nodeId) === normalizedNodeId);
                if (graphNode && step) {
                    step.designer.position = {
                        x: Number(graphNode.pos_x) || 0,
                        y: Number(graphNode.pos_y) || 0
                    };
                    this.generate();
                }
            });

            if (this.editor.precanvas && !this.editor.precanvas.dataset.workflowDropBound) {
                this.editor.precanvas.dataset.workflowDropBound = 'true';
                this.editor.precanvas.addEventListener('dragenter', (event) => event.preventDefault());
                this.editor.precanvas.addEventListener('dragover', (event) => event.preventDefault());
            }
        },

        activateFallbackCanvas() {
            if (this.useFallbackCanvas) {
                return;
            }
            this.useFallbackCanvas = true;
            this.renderFallbackCanvas();
        },

        renderFallbackCanvas() {
            const canvas = this.canvasElement || document.getElementById('drawflowCanvas');
            if (!canvas) {
                return;
            }

            let layer = canvas.querySelector('.fallback-canvas-layer');
            if (!layer) {
                layer = document.createElement('div');
                layer.className = 'fallback-canvas-layer';
                canvas.appendChild(layer);
            }

            layer.innerHTML = '';

            const edges = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            edges.setAttribute('class', 'fallback-edges');
            edges.setAttribute('width', '100%');
                    this.getWorkflowNodeClass(normalized),
            layer.appendChild(edges);

            const byStepId = new Map();
            this.steps.forEach((step) => {
                byStepId.set(String(step.id || '').trim(), step);
            });

            this.steps.forEach((step) => {
                const target = byStepId.get(String(step.next || '').trim());
                if (!target) {
                    return;
                }

                const fromX = (Number(step.designer && step.designer.position && step.designer.position.x) || 80) + 180;
                const fromY = (Number(step.designer && step.designer.position && step.designer.position.y) || 120) + 34;
                const toX = (Number(target.designer && target.designer.position && target.designer.position.x) || 80);
                const toY = (Number(target.designer && target.designer.position && target.designer.position.y) || 120) + 34;
                const midX = Math.round((fromX + toX) / 2);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'fallback-edge-path');
                path.setAttribute('d', 'M ' + fromX + ' ' + fromY + ' C ' + midX + ' ' + fromY + ', ' + midX + ' ' + toY + ', ' + toX + ' ' + toY);
                edges.appendChild(path);
            });

            this.steps.forEach((step, idx) => {
                if (!step.nodeId) {
                    step.nodeId = 'fallback-' + (idx + 1);
                }
                const node = document.createElement('div');
                node.className = 'fallback-node' + (String(this.selectedNodeId) === String(step.nodeId) ? ' selected' : '');
                node.style.left = (Number(step.designer && step.designer.position && step.designer.position.x) || 80) + 'px';
                node.style.top = (Number(step.designer && step.designer.position && step.designer.position.y) || 120) + 'px';
                node.innerHTML = this.renderNodeTemplate(step);
                node.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.selectedNodeId = String(step.nodeId);
                    this.refreshSelectedStepView();
                    this.renderFallbackCanvas();
                });
                layer.appendChild(node);
            });

            if (!this.selectedNodeId && this.steps[0]) {
                this.selectedNodeId = String(this.steps[0].nodeId);
                this.refreshSelectedStepView();
            }
        },

        isInsideCanvas(clientX, clientY) {
            const canvas = this.canvasElement || document.getElementById('drawflowCanvas');
            if (!canvas) {
                return false;
            }
            const rect = canvas.getBoundingClientRect();
            return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
        },

        updateCanvasPointerDropHint(clientX, clientY) {
            const canvasCard = this.canvasCardElement || (this.canvasElement ? this.canvasElement.closest('.canvas-card') : null);
            if (!canvasCard) {
                return;
            }

            if (this.isInsideCanvas(clientX, clientY)) {
                canvasCard.classList.add('pointer-drop-active');
            } else {
                canvasCard.classList.remove('pointer-drop-active');
            }
        },

        startPointerPaletteDrag(type, event) {
            const startX = Number(event.clientX) || 0;
            const startY = Number(event.clientY) || 0;
            this.pointerDragState = {
                type: type,
                startX: startX,
                startY: startY,
                clientX: startX,
                clientY: startY,
                dragging: false,
                ghost: null,
                pointerId: event.pointerId
            };

            const onPointerMove = (moveEvent) => {
                if (!this.pointerDragState) {
                    return;
                }
                if (typeof this.pointerDragState.pointerId === 'number' && moveEvent.pointerId !== this.pointerDragState.pointerId) {
                    return;
                }

                this.pointerDragState.clientX = Number(moveEvent.clientX) || 0;
                this.pointerDragState.clientY = Number(moveEvent.clientY) || 0;

                if (!this.pointerDragState.dragging) {
                    const dx = this.pointerDragState.clientX - this.pointerDragState.startX;
                    const dy = this.pointerDragState.clientY - this.pointerDragState.startY;
                    if ((Math.abs(dx) + Math.abs(dy)) < 6) {
                        return;
                    }
                    this.pointerDragState.dragging = true;
                    this.pointerDragState.ghost = this.createPointerDragGhost(this.pointerDragState.type);
                    document.body.classList.add('palette-pointer-dragging');
                }

                this.updatePointerDragGhost(this.pointerDragState.clientX, this.pointerDragState.clientY);
                this.updateCanvasPointerDropHint(this.pointerDragState.clientX, this.pointerDragState.clientY);
                moveEvent.preventDefault();
            };

            const onPointerUp = (upEvent) => {
                if (typeof this.pointerDragState.pointerId === 'number' && upEvent.pointerId !== this.pointerDragState.pointerId) {
                    return;
                }
                this.finishPointerPaletteDrag(false);
            };

            const onKeyDown = (keyEvent) => {
                if (keyEvent.key === 'Escape') {
                    this.finishPointerPaletteDrag(true);
                }
            };

            this.pointerDragState.cleanup = () => {
                document.removeEventListener('pointermove', onPointerMove);
                document.removeEventListener('pointerup', onPointerUp);
                document.removeEventListener('pointercancel', onPointerUp);
                document.removeEventListener('keydown', onKeyDown);
            };

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);
            document.addEventListener('pointercancel', onPointerUp);
            document.addEventListener('keydown', onKeyDown);
        },

        finishPointerPaletteDrag(cancelled) {
            const state = this.pointerDragState;
            if (!state) {
                return;
            }

            if (!cancelled && state.dragging && this.isInsideCanvas(state.clientX, state.clientY)) {
                const canvas = this.canvasElement || document.getElementById('drawflowCanvas');
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    this.addNodeFromPalette(state.type, {
                        x: Math.round(state.clientX - rect.left),
                        y: Math.round(state.clientY - rect.top)
                    });
                }
            }

            if (state.cleanup) {
                state.cleanup();
            }
            if (state.ghost && state.ghost.parentNode) {
                state.ghost.parentNode.removeChild(state.ghost);
            }

            this.pointerDragState = null;
            document.body.classList.remove('palette-pointer-dragging');
            this.updateCanvasPointerDropHint(-1, -1);
            this.armedPaletteType = null;
        },

        createPointerDragGhost(type) {
            const ghost = document.createElement('div');
            ghost.className = 'palette-drag-ghost';
            const descriptor = this.getStepTypeDescriptor(type);
            const label = descriptor && descriptor.displayName ? descriptor.displayName : (type.charAt(0).toUpperCase() + type.slice(1) + ' step');
            ghost.textContent = label;
            document.body.appendChild(ghost);
            return ghost;
        },

        updatePointerDragGhost(clientX, clientY) {
            if (!this.pointerDragState || !this.pointerDragState.ghost) {
                return;
            }
            this.pointerDragState.ghost.style.left = Math.round(clientX + 14) + 'px';
            this.pointerDragState.ghost.style.top = Math.round(clientY + 14) + 'px';
        },

        renderGraphFromSteps() {
            if (this.useFallbackCanvas) {
                this.renderFallbackCanvas();
                return;
            }

            if (!this.editor) {
                return;
            }

            const previousSelectedStep = this.steps.find((step) => String(step.nodeId) === String(this.selectedNodeId)) || null;
            const previousSelectedStepId = previousSelectedStep ? previousSelectedStep.id : null;

            this.isHydratingGraph = true;
            const idsByStepId = {};
            this.steps.forEach((step, idx) => {
                const normalized = this.normalizeStep(step, idx + 1);
                const nodeId = this.editor.addNode(
                    'workflow',
                    1,
                    this.getWorkflowOutputCount(normalized),
                    normalized.designer.position.x,
                    normalized.designer.position.y,
                    this.getWorkflowNodeClass(normalized),
                    {
                        stepId: normalized.id,
                        stepTitle: normalized.title,
                        stepType: normalized.type
                    },
                    this.renderNodeTemplate(normalized)
                );
                step.nodeId = this.normalizeNodeId(nodeId);
                step.designer = normalized.designer;
                idsByStepId[step.id] = String(step.nodeId);
            });

            this.steps.forEach((step) => {
                const fromNode = idsByStepId[step.id];
                if (!fromNode) {
                    return;
                }

                const targets = this.getWorkflowTransitionTargets(step);
                Object.keys(targets).forEach((outputKey) => {
                    const targetStepId = targets[outputKey];
                    const toNode = idsByStepId[targetStepId];
                    if (targetStepId && toNode) {
                        this.editor.addConnection(fromNode, toNode, outputKey, 'input_1');
                    }
                });
            });
            this.isHydratingGraph = false;

            if (previousSelectedStepId) {
                const restoredSelection = this.steps.find((step) => String(step.id) === String(previousSelectedStepId));
                this.selectedNodeId = restoredSelection ? String(restoredSelection.nodeId) : (this.steps[0] ? String(this.steps[0].nodeId) : null);
            } else if (this.steps[0]) {
                this.selectedNodeId = String(this.steps[0].nodeId);
            } else {
                this.selectedNodeId = null;
            }
            this.refreshSelectedStepView();
        },

        addNodeFromPalette(type, dropPosition) {
            if (this.useFallbackCanvas) {
                const idx = this.steps.length + 1;
                const step = this.normalizeStep({ type: type }, idx);
                const descriptor = this.getStepTypeDescriptor(type);
                step.title = descriptor && descriptor.displayName ? descriptor.displayName : (type.charAt(0).toUpperCase() + type.slice(1) + ' step');
                step.nodeId = 'fallback-' + idx;
                if (dropPosition) {
                    step.designer.position = dropPosition;
                }
                this.steps.push(step);
                this.selectedNodeId = String(step.nodeId);
                this.refreshSelectedStepView();
                this.armedPaletteType = null;
                this.generate();
                this.renderFallbackCanvas();
                return;
            }

            if (!this.editor) {
                this.pendingPaletteInsert = {
                    type: type,
                    position: dropPosition || null
                };
                this.initEditorWhenReady(0);
                return;
            }

            this.armedPaletteType = null;

            const idx = this.steps.length + 1;
            const step = this.normalizeStep({ type: type }, idx);
            const descriptor = this.getStepTypeDescriptor(type);
            step.title = descriptor && descriptor.displayName ? descriptor.displayName : (type.charAt(0).toUpperCase() + type.slice(1) + ' step');
            if (dropPosition) {
                step.designer.position = dropPosition;
            }

            const nodeId = this.editor.addNode(
                'workflow',
                1,
                this.getWorkflowOutputCount(step),
                step.designer.position.x,
                step.designer.position.y,
                this.getWorkflowNodeClass(step),
                {
                    stepId: step.id,
                    stepTitle: step.title,
                    stepType: step.type
                },
                this.renderNodeTemplate(step)
            );

            step.nodeId = this.normalizeNodeId(nodeId);
            this.steps.push(step);
            this.selectedNodeId = String(step.nodeId);
            this.refreshSelectedStepView();
            this.syncTransitionsFromGraph();
            this.generate();
        },

        getGraphNode(nodeId) {
            if (!this.editor || !this.editor.drawflow || !this.editor.drawflow.drawflow || !this.editor.drawflow.drawflow.Home) {
                return null;
            }
            return this.editor.drawflow.drawflow.Home.data[this.normalizeNodeId(nodeId)] || null;
        },

        getGraphNodeByStepId(stepId) {
            if (!this.editor || !this.editor.drawflow || !this.editor.drawflow.drawflow || !this.editor.drawflow.drawflow.Home) {
                return null;
            }

            const normalizedStepId = String(stepId || '').trim();
            if (!normalizedStepId) {
                return null;
            }

            return Object.values(this.editor.drawflow.drawflow.Home.data).find((graphNode) => {
                return graphNode && graphNode.data && String(graphNode.data.stepId || '').trim() === normalizedStepId;
            }) || null;
        },

        getWorkflowNodeClass(step) {
            const type = String(step && step.type ? step.type : 'form').trim() || 'form';
            return 'workflow-node workflow-node--' + type;
        },

        getWorkflowOutputCount(step) {
            const type = String(step && step.type ? step.type : 'form').trim();
            return this.getStepTypeOutputCount(type);
        },

        getWorkflowTransitionTargets(step) {
            const stepType = String(step && step.type ? step.type : 'form');
            const outputCount = this.getStepTypeOutputCount(stepType);
            const transitions = step && step.transitions && typeof step.transitions === 'object' && !Array.isArray(step.transitions)
                ? step.transitions
                : {};

            if (outputCount > 1) {
                const transitionValues = Object.keys(transitions)
                    .sort()
                    .map((key) => String(transitions[key] || '').trim())
                    .filter(Boolean);

                const outputTransitions = {};
                for (let outputIndex = 1; outputIndex <= outputCount; outputIndex += 1) {
                    outputTransitions['output_' + outputIndex] = transitionValues[outputIndex - 1] || (outputIndex === 1 ? String(step && step.next || '').trim() : '');
                }

                return outputTransitions;
            }

            return {
                output_1: String(step && step.next || '').trim()
            };
        },

        enforceSingleConnectionPerOutput(connection) {
            if (!connection || !this.editor) {
                return;
            }

            const outputNodeId = this.normalizeNodeId(connection.output_id);
            const outputClass = String(connection.output_class || '').trim();
            const inputNodeId = this.normalizeNodeId(connection.input_id);
            const inputClass = String(connection.input_class || '').trim();
            if (!outputNodeId || !outputClass || !inputNodeId || !inputClass) {
                return;
            }

            const graphNode = this.getGraphNode(outputNodeId);
            const output = graphNode && graphNode.outputs ? graphNode.outputs[outputClass] : null;
            const connections = output && Array.isArray(output.connections) ? output.connections.slice() : [];
            if (connections.length <= 1) {
                return;
            }

            connections.forEach((existingConnection) => {
                const existingInputNodeId = this.normalizeNodeId(existingConnection && existingConnection.node);
                const existingInputClass = String(existingConnection && existingConnection.output || '').trim();
                const isNewConnection = existingInputNodeId === inputNodeId && existingInputClass === inputClass;
                if (isNewConnection) {
                    return;
                }

                this.editor.removeSingleConnection(outputNodeId, existingInputNodeId, outputClass, existingInputClass);
            });
        },

        syncTransitionsFromGraph() {
            this.steps.forEach((step) => {
                step.next = '';
                step.transitions = {};
            });

            this.steps.forEach((step) => {
                const graphNode = this.getGraphNode(step.nodeId) || this.getGraphNodeByStepId(step.id);
                if (!graphNode || !graphNode.outputs) {
                    return;
                }

                const outputKeys = this.getWorkflowOutputCount(step) > 1
                    ? Object.keys(graphNode.outputs)
                    : ['output_1'];

                outputKeys.forEach((outputKey) => {
                    const firstConnection = graphNode.outputs[outputKey] ? (graphNode.outputs[outputKey].connections || [])[0] : null;
                    if (!firstConnection) {
                        return;
                    }

                    const nextGraphNode = this.getGraphNode(firstConnection.node);
                    const nextStepId = nextGraphNode && nextGraphNode.data ? String(nextGraphNode.data.stepId || '').trim() : '';
                    if (!nextStepId) {
                        return;
                    }

                    if (this.getWorkflowOutputCount(step) > 1) {
                        step.transitions[outputKey] = nextStepId;
                    }
                    if (!step.next) {
                        step.next = nextStepId;
                    }
                });
            });
        },

        renderNodeTemplate(step) {
            const safeId = this.escapeHtml(step.id || 'step');
            const safeTitle = this.escapeHtml(step.title || 'Untitled step');
            const safeType = this.escapeHtml(step.type || 'form');
            return '' +
                '<div class="node-shell">' +
                '<div class="node-type">' + safeType + '</div>' +
                '<div class="node-title">' + safeTitle + '</div>' +
                '<div class="node-id">' + safeId + '</div>' +
                '</div>';
        },

        escapeHtml(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        generate() {
            const payload = {
                kind: 'workflow',
                id: this.definitionKey,
                steps: this.steps.map((step) => {
                    const entry = {
                        id: step.id,
                        title: step.title,
                        type: step.type,
                        config: step.config && typeof step.config === 'object'
                            ? JSON.parse(JSON.stringify(step.config))
                            : {},
                        next: step.next || null,
                        designer: {
                            position: {
                                x: Number(step.designer && step.designer.position && step.designer.position.x) || 0,
                                y: Number(step.designer && step.designer.position && step.designer.position.y) || 0
                            }
                        }
                    };

                    if (String(step.type || '').trim() === 'form') {
                        entry.assignee = {
                            kind: String(entry.config.assigneeKind || step.assignee.kind || 'INTERNAL_USER').trim(),
                            value: String(entry.config.assigneeValue || step.assignee.value || '').trim()
                        };
                    }

                    if (step.transitions && Object.keys(step.transitions).length > 0) {
                        entry.transitions = Object.assign({}, step.transitions);
                    }

                    if (this.getWorkflowOutputCount(step) > 1) {
                        const labels = {};
                        const outputCount = this.getWorkflowOutputCount(step);
                        for (let outputIndex = 1; outputIndex <= outputCount; outputIndex += 1) {
                            const configLabel = String(entry.config['action' + outputIndex + 'Label'] || '').trim();
                            labels['output_' + outputIndex] = configLabel || ('Action ' + outputIndex);
                        }
                        entry.transitionLabels = labels;

                        const conditionText = String(entry.config.conditionJson || '').trim();
                        if (conditionText) {
                            try {
                                entry.condition = JSON.parse(conditionText);
                            } catch (_) {
                                // Keep generation resilient while the user is still typing invalid JSON.
                            }
                        }
                    }

                    return entry;
                })
            };
            this.definitionJson = JSON.stringify(payload, null, 2);
        }
    });
};