// @ts-check
(function () {
    const windowAny = /** @type {any} */ (window);

    function emitRepeatControl(ctx, repeatControl, fallbackColumns) {
        const rowSchema = {
            type: 'object',
            properties: {}
        };
        const rowRequired = [];
        const rowLayout = [];

        if (Array.isArray(repeatControl.children) && repeatControl.children.length > 0) {
            const rowDefaults = {};
            repeatControl.children.forEach((child) => {
                const childDefault = child.defaultValue;
                if (childDefault !== null && childDefault !== undefined && childDefault !== '') {
                    rowDefaults[child.name] = childDefault;
                }
            });

            ctx.processControls(
                repeatControl.children,
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
                    pointer: `${ctx.pointerBase}/properties/${repeatControl.name}/items/properties/${col.key}`,
                    widget: (col.type || 'string') === 'number' ? 'number' : 'text',
                    label: col.title || col.key,
                    required: col.required === true,
                    visible: true,
                    enabled: true,
                    colSpan: 12,
                    options: []
                });
            });
        }

        const arraySchema = {
            type: 'array',
            title: repeatControl.label,
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

        ctx.schemaProperties[repeatControl.name] = arraySchema;
        if (repeatControl.required) {
            ctx.schemaRequired.push(repeatControl.name);
        }

        const columnsFromChildren = (repeatControl.children || []).map((child) => ({
            key: child.name,
            title: child.label,
            type: child.type || 'string',
            required: child.required === true,
            visible: true
        }));

        ctx.layoutTarget.push({
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

    function templateMetadataForControl(control) {
        const stateKey = control.stateKey || control.name || control.label;
        const keys = Array.from((control.__templateKeys || new Set()));
        return keys.length > 0 ? { stateKey, keys } : null;
    }

    function markTemplateMetadata(control, layoutItem) {
        if (!control || !layoutItem) {
            return;
        }

        const metadata = templateMetadataForControl(control);
        if (metadata) {
            layoutItem.template = metadata;
        }
    }

    windowAny.formDesignerSchemaControls = {
        emitters: {
            section(ctx) {
                const c = ctx.control;
                const sectionLayout = {
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
                ctx.processControls(c.children || [], ctx.schemaProperties, ctx.schemaRequired, sectionLayout.children, ctx.pointerBase);
                return true;
            },
            group(ctx) {
                const c = ctx.control;
                const groupSchema = {
                    type: 'object',
                    title: c.label,
                    description: c.groupDescription || '',
                    properties: {}
                };
                const groupRequired = [];
                ctx.schemaProperties[c.name] = groupSchema;
                if (c.required) {
                    ctx.schemaRequired.push(c.name);
                }

                const groupPointer = `${ctx.pointerBase}/properties/${c.name}`;
                const groupLayout = {
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

                ctx.processControls(c.children || [], groupSchema.properties, groupRequired, groupLayout.children, groupPointer);
                if (groupRequired.length > 0) {
                    groupSchema.required = groupRequired;
                }
                return true;
            },
            image(ctx) {
                const c = ctx.control;
                const assetRef = {
                    assetKey: c.assetKey
                };
                if (Number(c.assetVersion) > 0) {
                    assetRef.version = Number(c.assetVersion);
                }
                if ((c.assetHash || '').trim()) {
                    assetRef.sha256 = c.assetHash.trim();
                }

                ctx.layoutTarget.push({
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
                    width: c.imageWidth > 0 ? c.imageWidth : null,
                    height: c.imageHeight > 0 ? c.imageHeight : null,
                    assetRef
                });
                return true;
            },
            table(ctx) {
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
                }, c.tableColumns || []);
                return true;
            },
            repeat(ctx) {
                emitRepeatControl(ctx, ctx.control, []);
                return true;
            },
            upload(ctx) {
                const c = ctx.control;
                const uploadSchema = {
                    title: c.label
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

                ctx.schemaProperties[c.name] = uploadSchema;
                if (c.required) {
                    ctx.schemaRequired.push(c.name);
                }

                ctx.layoutTarget.push({
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
                    maxBytes: c.uploadMaxBytes > 0 ? c.uploadMaxBytes : null
                });
                return true;
            },
            message(ctx) {
                const c = ctx.control;
                const layoutItem = {
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
            button(ctx) {
                const c = ctx.control;
                const layoutItem = {
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
        }
    };
})();
