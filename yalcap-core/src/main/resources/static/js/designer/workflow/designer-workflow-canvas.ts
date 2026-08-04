// @ts-check

interface WorkflowStep {
    id?: string;
    title?: string;
    type?: string;
    next?: string;
    nodeId: string;
    routing?: Routing;
    ui?: UiConfig;
    designer?: DesignerInfo;
    indexConfig?: IndexConfig;
}

interface PointerDragState {
    type: string;
    startX: number;
    startY: number;
    clientX: number;
    clientY: number;
    dragging: boolean;
    ghost: HTMLElement | null;
    pointerId?: number;
    cleanup?: () => void;
}

interface DropPosition {
    x: number;
    y: number;
}

interface PendingPaletteInsert {
    type: string;
    position: DropPosition | null;
}

interface StepTypeDescriptor {
    displayName?: string;
}

interface GraphNode {
    pos_x: number | string;
    pos_y: number | string;
    class: string;
    data?: {
        stepId?: string;
        stepTitle?: string;
        stepType?: string;
    };
    outputs?: Record<string, { connections: Array<{ node: string | number; output: string }> }>;
    [key: string]: unknown;
}

interface GraphConnection {
    output_id: string | number;
    input_id: string | number;
    output_class: string;
    input_class: string;
}

interface WorkflowDesignerCanvasApi {
    canvasInteractionsBound: boolean;
    canvasElement: HTMLElement | null;
    canvasCardElement: HTMLElement | null;
    editor: any;
    useFallbackCanvas: boolean;
    isHydratingGraph: boolean;
    selectedNodeId: string | null;
    pointerDragState: PointerDragState | null;
    armedPaletteType: string | null;
    pendingPaletteInsert: PendingPaletteInsert | null;
    steps: WorkflowStep[];
    definitionKey: string;
    workflowTitle: string;
    definitionJson: string;
    getStepTypeDescriptor: (type: string) => StepTypeDescriptor | null;
    getStepTypeOutputCount: (type: string) => number;
    normalizeStep: (step: WorkflowStep, idx?: number) => WorkflowStep;
    normalizeNodeId: (id: any) => string;
    generate: () => void;
    refreshSelectedStepView: () => void;

    ensureCanvasInteractions: () => void;
    initEditorWhenReady: (attempt: number) => void;
    initializeDrawflow: () => void;
    activateFallbackCanvas: () => void;
    renderFallbackCanvas: () => void;
    isInsideCanvas: (clientX: number, clientY: number) => boolean;
    updateCanvasPointerDropHint: (clientX: number, clientY: number) => void;
    startPointerPaletteDrag: (type: string, event: PointerEvent) => void;
    finishPointerPaletteDrag: (cancelled: boolean) => void;
    createPointerDragGhost: (type: string) => HTMLElement;
    updatePointerDragGhost: (clientX: number, clientY: number) => void;
    renderGraphFromSteps: () => void;
    addNodeFromPalette: (type: string, dropPosition?: DropPosition) => void;
    getGraphNode: (nodeId: string | number) => GraphNode | null;
    getGraphNodeByStepId: (stepId: string) => GraphNode | null;
    getWorkflowNodeClass: (step: WorkflowStep) => string;
    getWorkflowOutputCount: (step: WorkflowStep) => number;
    getWorkflowTransitionTargets: (step: WorkflowStep) => Record<string, string>;
    enforceSingleConnectionPerOutput: (connection: GraphConnection) => void;
    syncTransitionsFromGraph: () => void;
    renderNodeTemplate: (step: WorkflowStep) => string;
    escapeHtml: (value: unknown) => string;
    selectWorkflowNode?: (nodeId: string) => void;
}

(window as any).workflowDesignerCanvasMixin = function workflowDesignerCanvasMixin(target: any): void {
    Object.assign(target, {
        canvasInteractionsBound: false,
        canvasElement: null,
        canvasCardElement: null,
        editor: null,
        useFallbackCanvas: false,
        isHydratingGraph: false,
        selectedNodeId: null,
        pointerDragState: null,
        armedPaletteType: null,
        pendingPaletteInsert: null,

        ensureCanvasInteractions(this: any): void {
            if (this.canvasInteractionsBound) {
                return;
            }
            const canvas = document.getElementById('drawflowCanvas');
            if (!canvas) {
                return;
            }

            this.canvasElement = canvas;
            this.canvasCardElement = canvas.closest('.canvas-card');
            canvas.addEventListener('click', (event: MouseEvent) => {
                const nodeElement = (event.target as HTMLElement)?.closest?.('.drawflow-node') as HTMLElement | null;
                if (!nodeElement) {
                    return;
                }
                this.selectWorkflowNode(nodeElement.id);
            });

            document.addEventListener(
                'pointerdown',
                (event: PointerEvent) => {
                    const nodeElement = (event.target as HTMLElement)?.closest?.('.drawflow-node') as HTMLElement | null;
                    if (!nodeElement) {
                        return;
                    }
                    this.selectWorkflowNode(nodeElement.id);
                },
                true
            );

            this.canvasInteractionsBound = true;
        },

        initEditorWhenReady(this: any, attempt: number): void {
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

            if (typeof (window as any).Drawflow === 'undefined') {
                if (attempt < 20) {
                    window.setTimeout(() => this.initEditorWhenReady(attempt + 1), 100);
                    return;
                }

                this.activateFallbackCanvas();
                if (this.pendingPaletteInsert) {
                    const pending = this.pendingPaletteInsert;
                    this.pendingPaletteInsert = null;
                    this.addNodeFromPalette(pending.type, pending.position ?? undefined);
                }
                return;
            }

            this.initializeDrawflow();
            this.renderGraphFromSteps();

            if (this.pendingPaletteInsert) {
                const pending = this.pendingPaletteInsert;
                this.pendingPaletteInsert = null;
                this.addNodeFromPalette(pending.type, pending.position ?? undefined);
            }
        },

        initializeDrawflow(this: any): void {
            const canvas = document.getElementById('drawflowCanvas');
            if (!canvas || typeof (window as any).Drawflow === 'undefined') {
                return;
            }

            this.canvasElement = canvas;
            this.canvasCardElement = canvas.closest('.canvas-card');

            this.editor = new (window as any).Drawflow(canvas);
            this.editor.reroute = true;
            this.editor.start();

            this.editor.on('nodeSelected', (nodeId: string | number) => {
                this.selectWorkflowNode(nodeId);
            });

            this.editor.on('nodeRemoved', (nodeId: string | number) => {
                const normalizedNodeId = this.normalizeNodeId(nodeId);
                this.steps = this.steps.filter((step: WorkflowStep) => String(step.nodeId) !== normalizedNodeId);
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

            this.editor.on('connectionCreated', (connection: GraphConnection) => {
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

            this.editor.on('nodeMoved', (nodeId: string | number) => {
                const normalizedNodeId = this.normalizeNodeId(nodeId);
                const graphNode = this.getGraphNode(normalizedNodeId);
                const step = this.steps.find((item: WorkflowStep) => String(item.nodeId) === normalizedNodeId);
                if (graphNode && step) {
                    if (!step.designer) {
                        step.designer = { position: { x: 0, y: 0 } };
                    }
                    step.designer.position = {
                        x: Number(graphNode.pos_x) || 0,
                        y: Number(graphNode.pos_y) || 0
                    };
                    this.generate();
                }
            });

            if (this.editor.precanvas && !(this.editor.precanvas as any).dataset.workflowDropBound) {
                (this.editor.precanvas as any).dataset.workflowDropBound = 'true';
                this.editor.precanvas.addEventListener('dragenter', (event: DragEvent) => event.preventDefault());
                this.editor.precanvas.addEventListener('dragover', (event: DragEvent) => event.preventDefault());
            }
        },

        activateFallbackCanvas(this: any): void {
            if (this.useFallbackCanvas) {
                return;
            }
            this.useFallbackCanvas = true;
            this.renderFallbackCanvas();
        },

        renderFallbackCanvas(this: any): void {
            const canvas = this.canvasElement || document.getElementById('drawflowCanvas');
            if (!canvas) {
                return;
            }

            let layer = canvas.querySelector('.fallback-canvas-layer') as HTMLElement | null;
            if (!layer) {
                layer = document.createElement('div');
                layer.className = 'fallback-canvas-layer';
                canvas.appendChild(layer);
            }

            layer.innerHTML = '';

            const edges = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            edges.setAttribute('class', 'fallback-edges');
            edges.setAttribute('width', '100%');
            layer.appendChild(edges);

            const byStepId = new Map<string, WorkflowStep>();
            this.steps.forEach((step: WorkflowStep) => {
                byStepId.set(String(step.id || '').trim(), step);
            });

            this.steps.forEach((step: WorkflowStep) => {
                const target = byStepId.get(String(step.next || '').trim());
                if (!target) {
                    return;
                }

                const fromX = (Number((step.designer?.position?.x as any) || 0) || 80) + 180;
                const fromY = (Number((step.designer?.position?.y as any) || 0) || 120) + 34;
                const toX = (Number((target.designer?.position?.x as any) || 0) || 80);
                const toY = (Number((target.designer?.position?.y as any) || 0) || 120) + 34;
                const midX = Math.round((fromX + toX) / 2);

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'fallback-edge-path');
                path.setAttribute(
                    'd',
                    'M ' + fromX + ' ' + fromY + ' C ' + midX + ' ' + fromY + ', ' + midX + ' ' + toY + ', ' + toX + ' ' + toY
                );
                edges.appendChild(path);
            });

            this.steps.forEach((step: WorkflowStep, idx: number) => {
                if (!step.nodeId) {
                    step.nodeId = 'fallback-' + (idx + 1);
                }
                const node = document.createElement('div');
                node.className = 'fallback-node' + (String(this.selectedNodeId) === String(step.nodeId) ? ' selected' : '');
                node.style.left = (Number((step.designer?.position?.x as any) || 0) || 80) + 'px';
                node.style.top = (Number((step.designer?.position?.y as any) || 0) || 120) + 'px';
                node.innerHTML = this.renderNodeTemplate(step);
                node.addEventListener('click', (event: MouseEvent) => {
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

        isInsideCanvas(this: any, clientX: number, clientY: number): boolean {
            const canvas = this.canvasElement || document.getElementById('drawflowCanvas');
            if (!canvas) {
                return false;
            }
            const rect = canvas.getBoundingClientRect();
            return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
        },

        updateCanvasPointerDropHint(this: any, clientX: number, clientY: number): void {
            const canvasCard =
                this.canvasCardElement ||
                (this.canvasElement ? this.canvasElement.closest('.canvas-card') : null);
            if (!canvasCard) {
                return;
            }

            if (this.isInsideCanvas(clientX, clientY)) {
                canvasCard.classList.add('pointer-drop-active');
            } else {
                canvasCard.classList.remove('pointer-drop-active');
            }
        },

        startPointerPaletteDrag(this: any, type: string, event: PointerEvent): void {
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

            const onPointerMove = (moveEvent: PointerEvent) => {
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
                    if (Math.abs(dx) + Math.abs(dy) < 6) {
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

            const onPointerUp = (upEvent: PointerEvent) => {
                if (typeof this.pointerDragState?.pointerId === 'number' && upEvent.pointerId !== this.pointerDragState.pointerId) {
                    return;
                }
                this.finishPointerPaletteDrag(false);
            };

            const onKeyDown = (keyEvent: KeyboardEvent) => {
                if (keyEvent.key === 'Escape') {
                    this.finishPointerPaletteDrag(true);
                }
            };

            this.pointerDragState.cleanup = () => {
                document.removeEventListener('pointermove', onPointerMove as EventListener);
                document.removeEventListener('pointerup', onPointerUp as EventListener);
                document.removeEventListener('pointercancel', onPointerUp as EventListener);
                document.removeEventListener('keydown', onKeyDown);
            };

            document.addEventListener('pointermove', onPointerMove as EventListener);
            document.addEventListener('pointerup', onPointerUp as EventListener);
            document.addEventListener('pointercancel', onPointerUp as EventListener);
            document.addEventListener('keydown', onKeyDown);
        },

        finishPointerPaletteDrag(this: any, cancelled: boolean): void {
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

        createPointerDragGhost(this: any, type: string): HTMLElement {
            const ghost = document.createElement('div');
            ghost.className = 'palette-drag-ghost';
            const descriptor = this.getStepTypeDescriptor(type);
            const label =
                descriptor && descriptor.displayName
                    ? descriptor.displayName
                    : type.charAt(0).toUpperCase() + type.slice(1) + ' step';
            ghost.textContent = label;
            document.body.appendChild(ghost);
            return ghost;
        },

        updatePointerDragGhost(this: any, clientX: number, clientY: number): void {
            if (!this.pointerDragState || !this.pointerDragState.ghost) {
                return;
            }
            this.pointerDragState.ghost.style.left = Math.round(clientX + 14) + 'px';
            this.pointerDragState.ghost.style.top = Math.round(clientY + 14) + 'px';
        },

        renderGraphFromSteps(this: any): void {
            if (this.useFallbackCanvas) {
                this.renderFallbackCanvas();
                return;
            }

            if (!this.editor) {
                return;
            }

            const previousSelectedStep =
                this.steps.find((step: WorkflowStep) => String(step.nodeId) === String(this.selectedNodeId)) || null;
            const previousSelectedStepId = previousSelectedStep ? previousSelectedStep.id : null;

            this.isHydratingGraph = true;
            const idsByStepId: Record<string, string> = {};
            this.steps.forEach((step: WorkflowStep, idx: number) => {
                const normalized = this.normalizeStep(step, idx + 1);
                const nodeId = this.editor.addNode(
                    'workflow',
                    1,
                    this.getWorkflowOutputCount(normalized),
                    normalized.ui?.designer?.position?.x || 0,
                    normalized.ui?.designer?.position?.y || 0,
                    this.getWorkflowNodeClass(normalized),
                    {
                        stepId: normalized.id,
                        stepTitle: normalized.title,
                        stepType: normalized.type
                    },
                    this.renderNodeTemplate(normalized)
                );
                step.nodeId = this.normalizeNodeId(nodeId);
                step.designer = normalized.ui?.designer;
                idsByStepId[step.id || ''] = String(step.nodeId);
            });

            this.steps.forEach((step: WorkflowStep) => {
                const fromNode = idsByStepId[step.id || ''];
                if (!fromNode) {
                    return;
                }

                const targets = this.getWorkflowTransitionTargets(step);
                Object.keys(targets).forEach((outputKey: string) => {
                    const targetStepId = targets[outputKey];
                    const toNode = idsByStepId[targetStepId];
                    if (targetStepId && toNode) {
                        this.editor.addConnection(fromNode, toNode, outputKey, 'input_1');
                    }
                });
            });
            this.isHydratingGraph = false;

            if (previousSelectedStepId) {
                const restoredSelection = this.steps.find((step: WorkflowStep) => String(step.id) === String(previousSelectedStepId));
                this.selectedNodeId = restoredSelection
                    ? String(restoredSelection.nodeId)
                    : this.steps[0]
                    ? String(this.steps[0].nodeId)
                    : null;
            } else if (this.steps[0]) {
                this.selectedNodeId = String(this.steps[0].nodeId);
            } else {
                this.selectedNodeId = null;
            }
            this.refreshSelectedStepView();
        },

        addNodeFromPalette(this: any, type: string, dropPosition?: DropPosition): void {
            if (this.useFallbackCanvas) {
                const idx = this.steps.length + 1;
                const step = this.normalizeStep({ type: type }, idx);
                const descriptor = this.getStepTypeDescriptor(type);
                step.title =
                    descriptor && descriptor.displayName
                        ? descriptor.displayName
                        : type.charAt(0).toUpperCase() + type.slice(1) + ' step';
                step.nodeId = 'fallback-' + idx;
                if (dropPosition && step.ui?.designer?.position) {
                    step.ui.designer.position = dropPosition;
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
            step.title =
                descriptor && descriptor.displayName
                    ? descriptor.displayName
                    : type.charAt(0).toUpperCase() + type.slice(1) + ' step';
            if (dropPosition && step.ui?.designer?.position) {
                step.ui.designer.position = dropPosition;
            }

            const nodeId = this.editor.addNode(
                'workflow',
                1,
                this.getWorkflowOutputCount(step),
                step.ui?.designer?.position?.x || 0,
                step.ui?.designer?.position?.y || 0,
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

        getGraphNode(this: any, nodeId: string | number): GraphNode | null {
            if (!this.editor?.drawflow?.drawflow?.Home) {
                return null;
            }
            return this.editor.drawflow.drawflow.Home.data[this.normalizeNodeId(nodeId)] || null;
        },

        getGraphNodeByStepId(this: any, stepId: string): GraphNode | null {
            if (!this.editor?.drawflow?.drawflow?.Home) {
                return null;
            }

            const normalizedStepId = String(stepId || '').trim();
            if (!normalizedStepId) {
                return null;
            }

            const nodes = Object.values(this.editor.drawflow.drawflow.Home.data) as any[];
            return (
                nodes.find((graphNode: any) => {
                    return graphNode && graphNode.data && String(graphNode.data.stepId || '').trim() === normalizedStepId;
                }) || null
            );
        },

        getWorkflowNodeClass(this: any, step: WorkflowStep): string {
            const type = String((step && step.type) || 'form').trim() || 'form';
            return 'workflow-node workflow-node--' + type;
        },

        getWorkflowOutputCount(this: any, step: WorkflowStep): number {
            const type = String((step && step.type) || 'form').trim();
            return this.getStepTypeOutputCount(type);
        },

        getWorkflowTransitionTargets(this: any, step: WorkflowStep): Record<string, string> {
            const stepType = String((step && step.type) || 'form');
            const outputCount = this.getStepTypeOutputCount(stepType);
            const routing: any =
                step && step.routing && typeof step.routing === 'object' && !Array.isArray(step.routing)
                    ? step.routing
                    : {};
            const transitions: Record<string, any> =
                routing.transitions && typeof routing.transitions === 'object' && !Array.isArray(routing.transitions)
                    ? routing.transitions
                    : {};

            const values = Object.keys(transitions)
                .sort()
                .map((key: string) => String(transitions[key] || '').trim())
                .filter(Boolean);

            if (outputCount > 1) {
                const outputTransitions: Record<string, string> = {};
                for (let outputIndex = 1; outputIndex <= outputCount; outputIndex += 1) {
                    outputTransitions['output_' + outputIndex] = values[outputIndex - 1] || '';
                }
                return outputTransitions;
            }

            return {
                output_1: values[0] || ''
            };
        },

        enforceSingleConnectionPerOutput(this: any, connection: GraphConnection): void {
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

            connections.forEach((existingConnection: any) => {
                const existingInputNodeId = this.normalizeNodeId(existingConnection && existingConnection.node);
                const existingInputClass = String((existingConnection && existingConnection.output) || '').trim();
                const isNewConnection = existingInputNodeId === inputNodeId && existingInputClass === inputClass;
                if (isNewConnection) {
                    return;
                }

                this.editor.removeSingleConnection(outputNodeId, existingInputNodeId, outputClass, existingInputClass);
            });
        },

        syncTransitionsFromGraph(this: any): void {
            this.steps.forEach((step: WorkflowStep) => {
                if (!step.routing || typeof step.routing !== 'object') {
                    step.routing = { transitions: {} };
                } else {
                    step.routing.transitions = {};
                }
            });

            this.steps.forEach((step: WorkflowStep) => {
                const graphNode = this.getGraphNode(step.nodeId) || this.getGraphNodeByStepId(step.id || '');
                if (!graphNode || !graphNode.outputs) {
                    return;
                }

                const outputCount = this.getWorkflowOutputCount(step);
                const outputKeys = outputCount > 1 ? Object.keys(graphNode.outputs) : ['output_1'];

                outputKeys.forEach((outputKey: string, idx: number) => {
                    const firstConnection = graphNode.outputs?.[outputKey]
                        ? (graphNode.outputs[outputKey].connections || [])[0]
                        : null;
                    if (!firstConnection) {
                        return;
                    }

                    const nextGraphNode = this.getGraphNode(firstConnection.node);
                    const nextStepId = nextGraphNode && nextGraphNode.data ? String(nextGraphNode.data.stepId || '').trim() : '';
                    if (!nextStepId) {
                        return;
                    }

                    const transitionKey =
                        outputCount > 1 ? outputKey : String(step.type || '').trim() === 'form' ? 'onSubmit' : 'default';

                    if (step.routing) {
                        step.routing.transitions[transitionKey] = nextStepId;
                    }
                });
            });
        },

        renderNodeTemplate(this: any, step: WorkflowStep): string {
            const safeId = this.escapeHtml(step.id || 'step');
            const safeTitle = this.escapeHtml(step.title || 'Untitled step');
            const safeType = this.escapeHtml(step.type || 'form');
            return (
                '<div class="node-shell">' +
                '<div class="node-type">' +
                safeType +
                '</div>' +
                '<div class="node-title">' +
                safeTitle +
                '</div>' +
                '<div class="node-id">' +
                safeId +
                '</div>' +
                '</div>'
            );
        },

        escapeHtml(this: any, value: unknown): string {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        generate(this: any): void {
            const normalizedSteps = this.steps.map((step: WorkflowStep, idx: number) => this.normalizeStep(step, idx + 1));

            const payload: WorkflowPayload = {
                kind: 'workflow',
                id: this.definitionKey,
                title: this.workflowTitle || '',

                steps: this.steps.map((step: WorkflowStep) => {
                    const cleanedStep: any = {
                        id: String(step.id || '').trim(),
                        title: String(step.title || '').trim(),
                        type: String(step.type || '').trim(),
                        routing: step.routing || { transitions: {} }
                    };

                    // Copy all other properties generically
                    Object.keys(step).forEach((key: string) => {
                        if (['id', 'title', 'type', 'routing', 'nodeId', 'designer'].includes(key)) {
                            return;
                        }
                        cleanedStep[key] =
                            typeof step[key as keyof WorkflowStep] === 'object' && step[key as keyof WorkflowStep] !== null
                                ? JSON.parse(JSON.stringify(step[key as keyof WorkflowStep]))
                                : step[key as keyof WorkflowStep];
                    });

                    if (step.ui && typeof step.ui === 'object') {
                        cleanedStep.ui = JSON.parse(JSON.stringify(step.ui));
                    }

                    return cleanedStep;
                })
            };

            this.definitionJson = JSON.stringify(payload, null, 2);
        }
    } as WorkflowDesignerCanvasApi);
};
