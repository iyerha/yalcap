export {};

declare global {
  type AnyRecord = Record<string, any>;

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
    colSpan?: number;
    options?: Array<{ label: string; value: string }>;
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
