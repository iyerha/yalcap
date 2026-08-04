export {};

declare global {
  const windowAny: any;
  type AnyRecord = Record<string, any>;

  // Form rules types
  interface RuleCondition {
    field: string;
    op: string;
    value: string;
    valuesText?: string;
  }

  interface DecisionInputColumn {
    id: string;
    stateKey?: string;
  }

  interface DecisionActionColumn {
    id: string;
    kind?: 'ui' | 'api' | 'derive';
    target?: string;
    property?: string;
    apiEndpoint?: string;
    apiMethod?: string;
    apiTrigger?: string;
    apiTarget?: string;
    apiSwap?: string;
    apiValsTemplate?: string;
    deriveTarget?: string;
    deriveExpression?: string;
  }

  interface ApiAction {
    kind: 'api';
    endpoint: string;
    method: string;
    trigger: string;
    target: string;
    swap: string;
    valsTemplate: string;
    htmx: Record<string, string>;
  }

  interface DeriveAction {
    kind: 'derive';
    effect: 'set';
    target: string;
    expression: any;
  }

  interface UiAction {
    kind: 'ui';
    target: string;
    effect?: string;
    [key: string]: any;
  }

  interface StateKeyOption {
    key: string;
    label: string;
    type?: string;
    widget?: string;
    ruleTargetOnly?: boolean;
  }

  // Workflow types
  interface Position {
    x: number;
    y: number;
  }

  interface DesignerInfo {
    position: Position;
  }

  interface UiConfig {
    designer: DesignerInfo;
    pointer: string;
  }

  interface Transition {
    [key: string]: string;
  }

  interface Routing {
    transitions: Transition;
  }

  interface StepType {
    type: string;
    displayName: string;
    outputCount?: number;
    configSchema?: Record<string, any>;
    defaultConfig?: Record<string, any>;
  }

  interface RuntimeAssetModule {
    bindAll?: () => void;
  }

  interface WorkflowDesigner {
    definitionKey: string;
    workflowTitle: string;
    stepTypes: StepType[];
    steps: WorkflowStep[];
    selectedNodeId: string | null;
    definitionJson: string;
    runtimePreviewHtml: string;
    runtimePreviewError: string;
    runtimePreviewLoading: boolean;
    publishMessage: string;
    publishError: boolean;
    editor: any;
    paletteCollapsed: boolean;
    propertiesCollapsed: boolean;
    draggedPaletteType: string | null;
    armedPaletteType: string | null;
    pendingPaletteInsert: any;
    canvasElement: HTMLElement | null;
    canvasCardElement: HTMLElement | null;
    pointerDragState: any;
    useFallbackCanvas: boolean;
    canvasInteractionsBound: boolean;
    isHydratingGraph: boolean;
    getStepHook(type: string): WorkflowStepHook | null;
    invokeStepHook(type: string, eventName: string, payload?: any): void;
    init(): void;
    refreshRuntimePreview(): Promise<void>;
    parseRuntimeAssetList(raw: string): string[];
    normalizeAssetUrl(assetPath: string): string;
    ensureRuntimeCssAsset(assetPath: string): void;
    ensureRuntimeJsAsset(assetPath: string): Promise<void>;
    loadRuntimeAssetsFromPreviewHtml(html: string): Promise<void>;
    bindPublishForm(): void;
    generate(): void;
    normalizeStep(step: any, index: number): WorkflowStep;
    refreshSelectedStepView(): void;
    bindPaletteDragSources(): void;
    ensureCanvasInteractions(): void;
    initEditorWhenReady(attempt: number): void;

    [key: string]: any;
  }


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

  interface WorkflowPayload {
    kind: string;
    id: string;
    title: string;
    steps: WorkflowStep[];
  }

  interface WorkflowStepHook {
    customFields?: any[];
    [key: string]: unknown;
  }

  interface IndexField {
    id: string;
    name: string;
    path: string;
    type: 'text' | 'nested' | 'group';
    searchable: boolean;
    displayable: boolean;
    childFields?: IndexField[];
  }

  interface IndexConfig {
    rootFields: IndexField[];
  }

  interface DesignerBaseControl {
    localId?: string;
    id?: string;
    name: string;
    label: string;
    type?: string;
    widget: string;
    required?: boolean;
    visible?: boolean;
    enabled?: boolean;
    validationMessage?: string;
    placeholder?: string;
    defaultValue?: any;
    colSpan?: number;
    options?: Array<{ label: string; value: string }>;
    tableColumns?: Array<{ key: string; title: string; type?: string; required?: boolean; visible?: boolean }>;
    tableMinItems?: number;
    tableMaxItems?: number;
    tableAllowAdd?: boolean;
    tableAllowDelete?: boolean;
    tableAllowReorder?: boolean;
    repeatRenderer?: string;
    repeatMinItems?: number;
    repeatMaxItems?: number;
    repeatAllowAdd?: boolean;
    repeatAllowDelete?: boolean;
    repeatAllowReorder?: boolean;
    autocompleteSourceType?: string;
    autocompleteSourceUrl?: string;
    autocompleteLabelField?: string;
    autocompleteValueField?: string;
    autocompleteSearchParam?: string;
    children?: DesignerControl[];
  }

  interface DesignerRepeatControl extends DesignerBaseControl {
    widget: "repeat";
    repeatRenderer?: "table" | "cards" | string;
    repeatMinItems?: number;
    repeatMaxItems?: number;
    repeatAllowAdd?: boolean;
    repeatAllowDelete?: boolean;
    repeatAllowReorder?: boolean;
  }

  interface DesignerTableControl extends DesignerBaseControl {
    widget: "table";
    tableColumns?: Array<{ key: string; title: string; type?: string; required?: boolean }>;
    tableMinItems?: number;
    tableMaxItems?: number;
    tableAllowAdd?: boolean;
    tableAllowDelete?: boolean;
    tableAllowReorder?: boolean;
  }

  interface DesignerImageControl extends DesignerBaseControl {
    widget: "image";
    assetKey?: string;
    assetVersion?: number;
    assetHash?: string;
    altText?: string;
    objectFit?: string;
    imageWidth?: number;
    imageHeight?: number;
  }

  interface DesignerUploadControl extends DesignerBaseControl {
    widget: "upload";
    uploadAccept?: string;
    uploadAllowMultiple?: boolean;
    uploadMaxBytes?: number;
  }

  type DesignerControl =
    | DesignerRepeatControl
    | DesignerTableControl
    | DesignerImageControl
    | DesignerUploadControl
    | DesignerBaseControl;

  interface SchemaEmitterContext {
    control: DesignerControl;
    processControls: (
      controls: DesignerControl[],
      schemaProperties: Record<string, any>,
      schemaRequired: string[],
      layoutTarget: Array<Record<string, any>>,
      pointerBase: string
    ) => void;
    schemaProperties: Record<string, any>;
    schemaRequired: string[];
    layoutTarget: Array<Record<string, any>>;
    pointerBase: string;
    newControlId?: () => string;
  }

  type SchemaEmitter = (ctx: SchemaEmitterContext) => boolean;

  interface DesignerSchemaControlsApi {
    emitters: Record<string, SchemaEmitter>;
  }

  interface DesignerControlHookContext {
    sourceId?: string;
    control?: DesignerControl;
    controlId?: string;
    container?: DesignerControl;
  }

  interface DesignerCoreApi {
    createDefaultOptions?: () => Array<{ label: string; value: string; autoValue?: boolean }>;
    toIdentifier?: (value: string) => string;
    isJsSafeIdentifier?: (value: string) => boolean;
  }

  interface DesignerControlHooksApi {
    normalize?: (control: DesignerControl, api: DesignerCoreApi) => DesignerControl;
    validate?: (normalized: DesignerControl, errors: string[], api: DesignerCoreApi) => void;
    canInsertIntoSource?: (context: DesignerControlHookContext) => boolean;
  }

  type DesignerControlHookRegistry = Record<string, DesignerControlHooksApi>;

  interface RuntimeClientModule {
    initialized: boolean;
    bindAll: () => void;
  }

  interface RuntimeAutocompleteModule extends RuntimeClientModule {}
  interface RuntimeSectionsModule extends RuntimeClientModule {}
  interface RuntimeRepeatsModule extends RuntimeClientModule {}

  interface Window {
    formDesignerSchemaControls?: DesignerSchemaControlsApi;
    designerControlHooks?: DesignerControlHookRegistry;
    runtimeAutocomplete?: RuntimeAutocompleteModule;
    autocompleteRuntime?: RuntimeAutocompleteModule;
    runtimeSections?: RuntimeSectionsModule;
    runtimeRepeats?: RuntimeRepeatsModule;
    tenantId?: string;
  }
}
