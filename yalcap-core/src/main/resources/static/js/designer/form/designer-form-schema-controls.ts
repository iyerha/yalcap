interface ColumnDef {
    key: string;
    title: string;
    type?: string;
    required?: boolean;
    visible?: boolean;
}

interface RowLayout {
    id: string | null;
    pointer: string;
    widget: string;
    label: string;
    required?: boolean;
    visible: boolean;
    enabled: boolean;
    colSpan: number;
    options: unknown[];
    [key: string]: unknown;
}

interface ArraySchema {
    type: 'array';
    title: string;
    items: Record<string, unknown>;
    minItems?: number;
    maxItems?: number;
    required?: string[];
}

interface ObjectSchema {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    title?: string;
    description?: string;
    default?: unknown;
    [key: string]: unknown;
}

interface UploadSchema {
    title: string;
    type: string;
    items?: Record<string, unknown>;
    default?: unknown;
}

interface TemplateMetadata {
    stateKey: string;
    keys: string[];
}

interface SchemaContext {
    control: Record<string, unknown>;
    schemaProperties: Record<string, unknown>;
    schemaRequired: string[];
    layoutTarget: unknown[];
    pointerBase: string;
    newControlId?: () => string;
    processControls: (
        controls: unknown[],
        schemaProps: Record<string, unknown>,
        schemaReq: string[],
        layoutItems: unknown[],
        pointer: string
    ) => void;
}

type SchemaEmitterMap = {
    [key: string]: (ctx: SchemaContext) => boolean;
};

function emitRepeatControl(
    ctx: SchemaContext,
    repeatControl: Record<string, unknown>,
    fallbackColumns: ColumnDef[]
): void {
    const rowSchema: ObjectSchema = {
        type: 'object',
        properties: {}
    };
    const rowRequired: string[] = [];
    const rowLayout: unknown[] = [];

    if (Array.isArray(repeatControl.children) && repeatControl.children.length > 0) {
        const rowDefaults: Record<string, unknown> = {};
        (repeatControl.children as Record<string, unknown>[]).forEach((child) => {
            const childDefault = child.defaultValue;
            if (childDefault !== null && childDefault !== undefined && childDefault !== '') {
                rowDefaults[String(child.name)] = childDefault;
            }
        });

        ctx.processControls(
            repeatControl.children as unknown[],
            rowSchema.properties,
            rowRequired,
            rowLayout,
            `${ctx.pointerBase}/properties/${repeatControl.name}/items`
        );

        if (Object.keys(rowDefaults).length > 0) {
            rowSchema.default = rowDefaults;
        }
    } else if (Array.isArray(fallbackColumns) && fallbackColumns.length > 0) {
        fallbackColumns.forEach((col) => {
            rowSchema.properties[col.key] = {
                type: col.type || 'string',
                title: col.title || col.key
            };
            if (col.required === true) {
                rowRequired.push(col.key);
            }
            rowLayout.push({
                id: typeof ctx.newControlId === 'function' ? ctx.newControlId() : null,
                pointer: `${ctx.pointerBase}/properties/${repeatControl.name}/items/properties/${col.key}`,
                widget: (col.type || 'string') === 'number' ? 'number' : 'text',
                label: col.title || col.key,
                required: col.required === true,
                visible: true,
                enabled: true,
                colSpan: 12,
                options: []
            } as RowLayout);
        });
    }

    const arraySchema: ArraySchema = {
        type: 'array',
        title: String(repeatControl.label),
        items: rowSchema
    };
    if (rowRequired.length > 0) {
        arraySchema.items.required = rowRequired;
    }

    const minItems = Number(repeatControl.repeatMinItems) || 0;
    const maxItems = Number(repeatControl.repeatMaxItems) || 0;
    if (minItems > 0) {
        arraySchema.minItems = minItems;
    }
    if (maxItems > 0) {
        arraySchema.maxItems = maxItems;
    }

    ctx.schemaProperties[String(repeatControl.name)] = arraySchema;
    if (repeatControl.required) {
        ctx.schemaRequired.push(String(repeatControl.name));
    }

    const columnsFromChildren = (repeatControl.children as Record<string, unknown>[] || []).map((child) => ({
        key: child.name,
        title: child.label,
        type: child.type || 'string',
        required: child.required === true,
        visible: true
    }));

    ctx.layoutTarget.push({
        id: repeatControl.id,
        pointer: `${ctx.pointerBase}/properties/${repeatControl.name}`,
        stateKey: repeatControl.stateKey || repeatControl.name,
        widget: 'repeat',
        label: repeatControl.label,
        required: repeatControl.required,
        visible: repeatControl.visible !== false,
        enabled: repeatControl.enabled !== false,
        validationMessage: repeatControl.validationMessage || null,
        hint: repeatControl.hint || null,
        hintFormat: repeatControl.hintFormat === 'text' ? 'text' : 'markdown',
        help: repeatControl.help || null,
        helpFormat: repeatControl.helpFormat === 'text' ? 'text' : 'markdown',
        colSpan: repeatControl.colSpan || 12,
        renderer: repeatControl.repeatRenderer || 'table',
        rowWidget: 'repeatingGroup',
        allowAdd: repeatControl.repeatAllowAdd !== false,
        allowDelete: repeatControl.repeatAllowDelete !== false,
        allowReorder: repeatControl.repeatAllowReorder === true,
        columns: columnsFromChildren.length > 0
            ? columnsFromChildren
            : (fallbackColumns || []).map((col) => ({
                key: col.key,
                title: col.title,
                type: col.type || 'string',
                required: col.required === true,
                visible: col.visible !== false
            })),
        children: rowLayout
    });
}

function templateMetadataForControl(control: Record<string, unknown>): TemplateMetadata | null {
    const stateKey = control.stateKey || control.name || control.label;
    const keys = Array.from((control.__templateKeys as Set<string>) || new Set<string>());
    return keys.length > 0 ? { stateKey: String(stateKey), keys } : null;
}

function markTemplateMetadata(control: Record<string, unknown>, layoutItem: Record<string, unknown>): void {
    if (!control || !layoutItem) {
        return;
    }

    const metadata = templateMetadataForControl(control);
    if (metadata) {
        layoutItem.template = metadata;
    }
}

const emitters: SchemaEmitterMap = {
    section(ctx: SchemaContext): boolean {
        const c = ctx.control;
        const sectionLayout = {
            id: c.id,
            stateKey: c.stateKey || c.name || c.label,
            widget: 'section',
            label: c.label,
            description: c.sectionDescription || '',
            collapsible: c.sectionCollapsible === true,
            defaultExpanded: c.sectionDefaultExpanded !== false,
            visible: c.visible !== false,
            enabled: c.enabled !== false,
            validationMessage: c.validationMessage || null,
            hint: c.hint || null,
            hintFormat: c.hintFormat === 'text' ? 'text' : 'markdown',
            help: c.help || null,
            helpFormat: c.helpFormat === 'text' ? 'text' : 'markdown',
            colSpan: c.colSpan || 12,
            children: []
        };
        markTemplateMetadata(c, sectionLayout);
        ctx.layoutTarget.push(sectionLayout);
        ctx.processControls(c.children as unknown[] || [], ctx.schemaProperties, ctx.schemaRequired, (sectionLayout as any).children, ctx.pointerBase);
        return true;
    },

    group(ctx: SchemaContext): boolean {
        const c = ctx.control;
        const groupSchema: ObjectSchema = {
            type: 'object',
            title: String(c.label),
            description: String(c.groupDescription || ''),
            properties: {}
        };
        const groupRequired: string[] = [];
        ctx.schemaProperties[String(c.name)] = groupSchema;
        if (c.required) {
            ctx.schemaRequired.push(String(c.name));
        }

        const groupPointer = `${ctx.pointerBase}/properties/${c.name}`;
        const groupLayout = {
            id: c.id,
            pointer: groupPointer,
            stateKey: c.stateKey || c.name,
            widget: 'group',
            label: c.label,
            description: c.groupDescription || '',
            required: c.required,
            visible: c.visible !== false,
            enabled: c.enabled !== false,
            validationMessage: c.validationMessage || null,
            hint: c.hint || null,
            hintFormat: c.hintFormat === 'text' ? 'text' : 'markdown',
            help: c.help || null,
            helpFormat: c.helpFormat === 'text' ? 'text' : 'markdown',
            colSpan: c.colSpan || 12,
            children: []
        };
        markTemplateMetadata(c, groupLayout);
        ctx.layoutTarget.push(groupLayout);

        ctx.processControls(c.children as unknown[] || [], groupSchema.properties, groupRequired, (groupLayout as any).children, groupPointer);
        if (groupRequired.length > 0) {
            groupSchema.required = groupRequired;
        }
        return true;
    },

    image(ctx: SchemaContext): boolean {
        const c = ctx.control;
        const assetRef: Record<string, unknown> = {
            assetKey: c.assetKey
        };
        if (Number(c.assetVersion) > 0) {
            assetRef.version = Number(c.assetVersion);
        }
        if ((c.assetHash || '').toString().trim()) {
            assetRef.sha256 = String(c.assetHash).trim();
        }

        ctx.layoutTarget.push({
            id: c.id,
            stateKey: c.stateKey || c.name || c.label,
            widget: 'image',
            label: c.label,
            visible: c.visible !== false,
            enabled: c.enabled !== false,
            validationMessage: c.validationMessage || null,
            hint: c.hint || null,
            hintFormat: c.hintFormat === 'text' ? 'text' : 'markdown',
            help: c.help || null,
            helpFormat: c.helpFormat === 'text' ? 'text' : 'markdown',
            colSpan: c.colSpan || 12,
            alt: c.altText || '',
            fit: c.objectFit || 'contain',
            width: (Number(c.imageWidth) || 0) > 0 ? Number(c.imageWidth) : null,
            height: (Number(c.imageHeight) || 0) > 0 ? Number(c.imageHeight) : null,
            assetRef
        });
        return true;
    },

    table(ctx: SchemaContext): boolean {
        const c = ctx.control;
        emitRepeatControl(ctx, {
            ...c,
            widget: 'repeat',
            repeatRenderer: 'table',
            repeatMinItems: c.tableMinItems,
            repeatMaxItems: c.tableMaxItems,
            repeatAllowAdd: c.tableAllowAdd,
            repeatAllowDelete: c.tableAllowDelete,
            repeatAllowReorder: c.tableAllowReorder,
            children: []
        }, c.tableColumns as ColumnDef[] || []);
        return true;
    },

    repeat(ctx: SchemaContext): boolean {
        emitRepeatControl(ctx, ctx.control, []);
        return true;
    },

    upload(ctx: SchemaContext): boolean {
        const c = ctx.control;
        const uploadSchema: UploadSchema = {
            title: String(c.label),
            type: 'string'
        };

        if (c.uploadAllowMultiple === true) {
            uploadSchema.type = 'array';
            uploadSchema.items = { type: 'string' };
            if (Array.isArray(c.defaultValue) && c.defaultValue.length > 0) {
                uploadSchema.default = c.defaultValue;
            }
        } else {
            uploadSchema.type = 'string';
            if (c.defaultValue !== null && c.defaultValue !== undefined && c.defaultValue !== '') {
                uploadSchema.default = String(c.defaultValue);
            }
        }

        ctx.schemaProperties[String(c.name)] = uploadSchema;
        if (c.required) {
            ctx.schemaRequired.push(String(c.name));
        }

        ctx.layoutTarget.push({
            id: c.id,
            pointer: `${ctx.pointerBase}/properties/${c.name}`,
            stateKey: c.stateKey || c.name,
            widget: 'upload',
            label: c.label,
            required: c.required,
            visible: c.visible !== false,
            enabled: c.enabled !== false,
            validationMessage: c.validationMessage || null,
            hint: c.hint || null,
            hintFormat: c.hintFormat === 'text' ? 'text' : 'markdown',
            help: c.help || null,
            helpFormat: c.helpFormat === 'text' ? 'text' : 'markdown',
            colSpan: c.colSpan || 12,
            accept: c.uploadAccept || '',
            multiple: c.uploadAllowMultiple === true,
            maxBytes: (Number(c.uploadMaxBytes) || 0) > 0 ? Number(c.uploadMaxBytes) : null
        });
        return true;
    },

    message(ctx: SchemaContext): boolean {
        const c = ctx.control;
        const layoutItem = {
            id: c.id,
            stateKey: c.stateKey || c.name || c.label,
            widget: 'message',
            label: c.label,
            visible: c.visible !== false,
            enabled: c.enabled !== false,
            hint: c.hint || null,
            hintFormat: c.hintFormat === 'text' ? 'text' : 'markdown',
            help: c.help || null,
            helpFormat: c.helpFormat === 'text' ? 'text' : 'markdown',
            colSpan: c.colSpan || 12,
            tone: c.messageTone || 'info',
            title: c.messageTitle || null,
            body: c.messageBody || '',
            format: c.messageFormat === 'text' ? 'text' : 'markdown'
        };
        markTemplateMetadata(c, layoutItem);
        ctx.layoutTarget.push(layoutItem);
        return true;
    },

    button(ctx: SchemaContext): boolean {
        const c = ctx.control;
        const layoutItem = {
            id: c.id,
            stateKey: c.stateKey || c.name || c.label,
            widget: 'button',
            label: c.label,
            visible: c.visible !== false,
            enabled: c.enabled !== false,
            hint: c.hint || null,
            hintFormat: c.hintFormat === 'text' ? 'text' : 'markdown',
            help: c.help || null,
            helpFormat: c.helpFormat === 'text' ? 'text' : 'markdown',
            colSpan: c.colSpan || 12,
            variant: c.buttonVariant || 'primary',
            action: {
                type: c.buttonActionType || 'customEvent',
                target: c.buttonActionTarget || null,
                payload: c.buttonPayload || null,
                confirmMessage: c.buttonConfirmMessage || null
            }
        };
        markTemplateMetadata(c, layoutItem);
        ctx.layoutTarget.push(layoutItem);
        return true;
    }
};

windowAny.formDesignerSchemaControls = {
    emitters
};
