// @ts-check

interface ConfigField {
    key: string;
    title: string;
    type: string;
    format: string;
    placeholder: string;
    enumValues: string[];
}

interface ConfigSchema {
    properties?: Record<string, any>;
}

interface StepTypeDescriptor {
    configSchema?: ConfigSchema;
    displayName?: string;
    [key: string]: unknown;
}

interface WorkflowStepHookRegistry {
    [key: string]: WorkflowStepHook;
}

interface WorkflowDesignerPropertiesApi {
    selectedStepDraft: any;
    selectedStepHint: string;
    configFieldErrors: Record<string, string>;
    activeStepHookKeys: string[];
    selectedNodeId: string | null;
    propertiesCollapsed: boolean;
    useFallbackCanvas: boolean;
    editor: any;
    steps: any[];
    definitionJson: string;

    refreshSelectedStepView: () => void;
    normalizeNodeId: (nodeId: any) => string;
    selectWorkflowNode: (nodeId: string) => void;
    findSelectedStep: (selectedId: string) => any;
    togglePropertiesCollapsed: () => void;
    getSelectedStepConfigFields: () => ConfigField[];
    getSelectedStepOutputCount: () => number;
    getSelectedStepOutputIndices: () => number[];
    getSelectedStepConfigValue: (key: string) => string;
    normalizeJsonConfig: (text: string) => any;
    updateSelectedStepConfig: (field: ConfigField, value: unknown) => void;
    getStepHook: (type: string) => WorkflowStepHook | null;
    applyStepHookBindings: (stepType: string) => void;
    getStepTypeFieldValue: (fieldName: string) => string;
    updateStepTypeField: (fieldName: string, value: unknown) => void;
    getAllCustomFields: () => any[];
    getFieldValue: (section: string, fieldKey: string) => string;
    updateFieldValue: (section: string, fieldKey: string, value: unknown) => void;
    syncSelectedStep: () => void;
    removeSelectedNode: () => void;
    getStepTypeDescriptor: (type: string) => StepTypeDescriptor | null;
    getStepTypeOutputCount: (type: string) => number;
    getStepTypeConfigDefaults: (type: string) => Record<string, unknown>;
    invokeStepHook: (type: string, hookName: string, context: any) => void;
    getGraphNode: (nodeId: any) => any;
    getGraphNodeByStepId: (stepId: string) => any;
    getWorkflowNodeClass: (step: any) => string;
    renderNodeTemplate: (step: any) => string;
    generate: () => void;
    renderGraphFromSteps: () => void;
    renderFallbackCanvas: () => void;
    syncTransitionsFromGraph: () => void;
    refreshIndexConfig?: () => void;
}

(window as any).workflowDesignerPropertiesMixin = function workflowDesignerPropertiesMixin(target: any): void {
    Object.assign(target, {
        selectedStepDraft: null,
        selectedStepHint: '',
        configFieldErrors: {},
        activeStepHookKeys: [] as string[],

        applyStepHookBindings(this: any, stepType: string): void {
            const previousKeys = Array.isArray(this.activeStepHookKeys) ? this.activeStepHookKeys : [];
            for (let i = 0; i < previousKeys.length; i += 1) {
                const key = previousKeys[i];
                if (key && Object.prototype.hasOwnProperty.call(this, key)) {
                    delete this[key];
                }
            }

            this.activeStepHookKeys = [];
            const hook = this.getStepHook(stepType);
            if (!hook || typeof hook !== 'object') {
                return;
            }

            const reservedKeys = new Set(['customFields', 'onSelect', 'afterSync']);
            const nextKeys: string[] = [];

            Object.keys(hook).forEach((key: string) => {
                if (reservedKeys.has(key)) {
                    return;
                }

                const value = (hook as any)[key];
                if (typeof value === 'function') {
                    this[key] = value.bind(this);
                } else if (Array.isArray(value)) {
                    this[key] = value.map((item: any) =>
                        item && typeof item === 'object' ? JSON.parse(JSON.stringify(item)) : item
                    );
                } else if (value && typeof value === 'object') {
                    this[key] = JSON.parse(JSON.stringify(value));
                } else {
                    this[key] = value;
                }

                nextKeys.push(key);
            });

            this.activeStepHookKeys = nextKeys;
        },

        refreshSelectedStepView(this: any): void {
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
            this.selectedStepDraft = sourceStep
                ? {
                    id: sourceStep.id,
                    title: sourceStep.title,
                    type: sourceStep.type,
                    config: JSON.parse(JSON.stringify(sourceStep.config || {})),
                    ui: JSON.parse(
                        JSON.stringify({
                            designer: { position: { x: 0, y: 0 } }
                        })
                    ),
                    routing: JSON.parse(JSON.stringify(sourceStep.routing || { transitions: {} })),
                    nodeId: sourceStep.nodeId
                }
                : null;

            if (this.selectedStepDraft) {
                this.applyStepHookBindings(this.selectedStepDraft.type);
                this.invokeStepHook(this.selectedStepDraft.type, 'onSelect', {
                    step: sourceStep,
                    draft: this.selectedStepDraft,
                    setHint: (hint: string) => {
                        this.selectedStepHint = String(hint || '').trim();
                    },
                    sync: () => this.syncSelectedStep()
                });
            }
            // Refresh index config if this is a form step
            if (typeof this.refreshIndexConfig === 'function') {
                this.refreshIndexConfig();
            }
        },

        normalizeNodeId(this: any, nodeId: any): string {
            return String(nodeId || '').replace(/^node-/, '').trim();
        },

        selectWorkflowNode(this: any, nodeId: string): void {
            const normalizedNodeId = this.normalizeNodeId(nodeId);
            if (!normalizedNodeId) {
                return;
            }
            this.selectedNodeId = normalizedNodeId;
            this.refreshSelectedStepView();
        },

        findSelectedStep(this: any, selectedId: string): any {
            const normalizedSelectedId = this.normalizeNodeId(selectedId);
            const graphNode = this.getGraphNode(normalizedSelectedId);
            const graphStepId = graphNode && graphNode.data ? String(graphNode.data.stepId || '').trim() : '';

            return (
                this.steps.find((step: any) => {
                    if (graphStepId && String(step.id) === graphStepId) {
                        return true;
                    }
                    return (
                        this.normalizeNodeId(step.nodeId) === normalizedSelectedId || String(step.id) === String(selectedId)
                    );
                }) || null
            );
        },

        togglePropertiesCollapsed(this: any): void {
            this.propertiesCollapsed = !this.propertiesCollapsed;
        },

        getSelectedStepConfigFields(this: any): ConfigField[] {
            const selectedType = this.selectedStepDraft ? this.selectedStepDraft.type : null;
            const descriptor = this.getStepTypeDescriptor(selectedType);
            const schema =
                descriptor && descriptor.configSchema && typeof descriptor.configSchema === 'object'
                    ? descriptor.configSchema
                    : {};
            const properties =
                schema && schema.properties && typeof schema.properties === 'object' ? schema.properties : {};

            return Object.keys(properties).map((key: string) => {
                const raw = properties[key] || {};
                return {
                    key: key,
                    title: String(raw.title || key),
                    type: String(raw.type || 'string'),
                    format: String(raw.format || '').trim(),
                    placeholder: String(raw.placeholder || '').trim(),
                    enumValues: Array.isArray(raw.enum) ? raw.enum.map((value: any) => String(value)) : []
                };
            });
        },

        getSelectedStepOutputCount(this: any): number {
            const selectedType = this.selectedStepDraft ? this.selectedStepDraft.type : null;
            return this.getStepTypeOutputCount(selectedType);
        },

        getSelectedStepOutputIndices(this: any): number[] {
            const outputCount = this.getSelectedStepOutputCount();
            return Array.from({ length: outputCount }, function (_, index: number) {
                return index + 1;
            });
        },

        getSelectedStepConfigValue(this: any, key: string): string {
            if (!this.selectedStepDraft || !this.selectedStepDraft.config) {
                return '';
            }
            const value = this.selectedStepDraft.config[key];
            return value == null ? '' : String(value);
        },

        normalizeJsonConfig(this: any, text: string): any {
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

        updateSelectedStepConfig(this: any, field: ConfigField, value: unknown): void {
            if (!this.selectedStepDraft) {
                return;
            }

            const key = String((field && field.key) || '').trim();
            if (!key) {
                return;
            }

            if (!this.selectedStepDraft.config || typeof this.selectedStepDraft.config !== 'object') {
                this.selectedStepDraft.config = {};
            }

            const rawValue = value == null ? '' : String(value);
            this.selectedStepDraft.config[key] = rawValue;

            if (String((field && field.format) || '').trim() === 'json') {
                try {
                    this.normalizeJsonConfig(rawValue);
                    delete this.configFieldErrors[key];
                } catch (err: unknown) {
                    this.configFieldErrors[key] = err instanceof Error ? err.message : String(err);
                }
            } else {
                delete this.configFieldErrors[key];
            }

            this.syncSelectedStep();
        },

        getStepHook(this: any, type: string): WorkflowStepHook | null {
            if (!type) return null;
            const key = String(type || '').trim().toLowerCase();
            const hooks: WorkflowStepHookRegistry = (window as any).workflowStepHooks || {};
            return hooks[key] || null;
        },

        getStepTypeFieldValue(this: any, fieldName: string): string {
            if (!this.selectedStepDraft) {
                return '';
            }
            const value = this.selectedStepDraft[fieldName];
            return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
        },

        updateStepTypeField(this: any, fieldName: string, value: unknown): void {
            if (!this.selectedStepDraft) {
                return;
            }
            this.selectedStepDraft[fieldName] = String(value || '').trim();
            this.syncSelectedStep();
        },

        getAllCustomFields(this: any): any[] {
            if (!this.selectedStepDraft) return [];
            const hook = this.getStepHook(this.selectedStepDraft.type);
            return hook && Array.isArray(hook.customFields) ? hook.customFields : [];
        },

        getFieldValue(this: any, section: string, fieldKey: string): string {
            if (!this.selectedStepDraft || !this.selectedStepDraft[section]) return '';
            const value = this.selectedStepDraft[section][fieldKey];
            return value == null ? '' : String(value);
        },

        updateFieldValue(this: any, section: string, fieldKey: string, value: unknown): void {
            if (!this.selectedStepDraft) return;
            if (!this.selectedStepDraft[section]) {
                this.selectedStepDraft[section] = {};
            }
            this.selectedStepDraft[section][fieldKey] = String(value || '').trim();
            this.syncSelectedStep();

            if (section === 'ui' && fieldKey === 'pointer') {
                // Form reference changed, reload index config
                if (typeof this.refreshIndexConfig === 'function') {
                    this.refreshIndexConfig();
                }
            }
        },

        syncSelectedStep(this: any): void {
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

            // Copy all properties from draft to sourceStep (hook-safe)
            const internalProps = new Set(['nodeId']);
            Object.keys(draft).forEach((key: string) => {
                if (!internalProps.has(key)) {
                    sourceStep[key] =
                        typeof draft[key] === 'object' && draft[key] !== null
                            ? JSON.parse(JSON.stringify(draft[key]))
                            : draft[key];
                }
            });

            // Ensure designer position is preserved
            const posX = Number((sourceStep.ui?.designer?.position?.x as any) || 0) || 0;
            const posY = Number((sourceStep.ui?.designer?.position?.y as any) || 0) || 0;
            if (!sourceStep.ui) {
                sourceStep.ui = {};
            }
            if (!sourceStep.ui.designer) {
                sourceStep.ui.designer = {};
            }
            sourceStep.ui.designer.position = { x: posX, y: posY };

            this.invokeStepHook(sourceStep.type, 'afterSync', {
                step: sourceStep,
                draft: draft,
                setHint: (hint: string) => {
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

            const nodeElement = document.querySelector('#node-' + selectedGraphNodeId) as HTMLElement | null;
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

        removeSelectedNode(this: any): void {
            if (this.useFallbackCanvas) {
                if (!this.selectedNodeId) {
                    return;
                }
                const normalizedSelectedId = this.normalizeNodeId(this.selectedNodeId);
                this.steps = this.steps.filter((step: any) => this.normalizeNodeId(step.nodeId) !== normalizedSelectedId);
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
    } as WorkflowDesignerPropertiesApi);
};
