(function () {
    window.formDesignerSchema = {
        generate() {
            const previousSelection = this.selectedControlId;
            const allErrors = [];
            const walkControls = (controls) => {
                controls.forEach((c) => {
                    const errs = this.validateControl(c);
                    errs.forEach((err) => allErrors.push(`${c.label || c.name}: ${err}`));
                    if (Array.isArray(c.children) && c.children.length > 0) {
                        walkControls(c.children);
                    }
                });
            };
            walkControls(this.controls);

            this.validationErrors = allErrors;
            if (allErrors.length > 0) {
                alert('Please fix validation issues before generating JSON.');
                this.selectControl(previousSelection);
                return;
            }
            this.selectControl(previousSelection);

            const dataSchema = {
                $schema: 'https://json-schema.org/draft/2020-12/schema',
                type: 'object',
                properties: {}
            };
            const rootRequired = [];
            const layout = [];

            const processControls = (controls, schemaProperties, schemaRequired, layoutTarget, pointerBase) => {
                controls.forEach((rawControl) => {
                    const c = this.normalizeControl(rawControl);
                    const options = c.options || [];
                    const optionValues = options.map((o) => o.value);

                    if (c.widget === 'section') {
                        const sectionLayout = {
                            widget: 'section',
                            label: c.label,
                            description: c.sectionDescription || '',
                            collapsible: c.sectionCollapsible === true,
                            defaultExpanded: c.sectionDefaultExpanded !== false,
                            colSpan: c.colSpan || 12,
                            children: []
                        };
                        layoutTarget.push(sectionLayout);
                        processControls(c.children || [], schemaProperties, schemaRequired, sectionLayout.children, pointerBase);
                        return;
                    }

                    if (c.widget === 'group') {
                        const groupSchema = {
                            type: 'object',
                            title: c.label,
                            description: c.groupDescription || '',
                            properties: {}
                        };
                        const groupRequired = [];
                        schemaProperties[c.name] = groupSchema;
                        if (c.required) {
                            schemaRequired.push(c.name);
                        }

                        const groupPointer = `${pointerBase}/properties/${c.name}`;
                        const groupLayout = {
                            pointer: groupPointer,
                            widget: 'group',
                            label: c.label,
                            description: c.groupDescription || '',
                            required: c.required,
                            colSpan: c.colSpan || 12,
                            children: []
                        };
                        layoutTarget.push(groupLayout);

                        processControls(c.children || [], groupSchema.properties, groupRequired, groupLayout.children, groupPointer);
                        if (groupRequired.length > 0) {
                            groupSchema.required = groupRequired;
                        }
                        return;
                    }

                    if (c.widget === 'image') {
                        const assetRef = {
                            assetKey: c.assetKey
                        };
                        if (Number(c.assetVersion) > 0) {
                            assetRef.version = Number(c.assetVersion);
                        }
                        if ((c.assetHash || '').trim()) {
                            assetRef.sha256 = c.assetHash.trim();
                        }

                        layoutTarget.push({
                            widget: 'image',
                            label: c.label,
                            colSpan: c.colSpan || 12,
                            alt: c.altText || '',
                            fit: c.objectFit || 'contain',
                            width: c.imageWidth > 0 ? c.imageWidth : null,
                            height: c.imageHeight > 0 ? c.imageHeight : null,
                            assetRef
                        });
                        return;
                    }

                    if (c.widget === 'table') {
                        const rowProperties = {};
                        const rowRequired = [];
                        (c.tableColumns || []).forEach((col) => {
                            rowProperties[col.key] = {
                                type: col.type || 'string',
                                title: col.title || col.key
                            };
                            if (col.required) {
                                rowRequired.push(col.key);
                            }
                        });

                        const arraySchema = {
                            type: 'array',
                            title: c.label,
                            items: {
                                type: 'object',
                                properties: rowProperties
                            }
                        };
                        if (rowRequired.length > 0) {
                            arraySchema.items.required = rowRequired;
                        }
                        if (c.tableMinItems > 0) {
                            arraySchema.minItems = c.tableMinItems;
                        }
                        if (c.tableMaxItems > 0) {
                            arraySchema.maxItems = c.tableMaxItems;
                        }

                        schemaProperties[c.name] = arraySchema;
                        if (c.required) {
                            schemaRequired.push(c.name);
                        }

                        layoutTarget.push({
                            pointer: `${pointerBase}/properties/${c.name}`,
                            widget: 'table',
                            label: c.label,
                            required: c.required,
                            colSpan: c.colSpan || 12,
                            rowWidget: 'repeatingGroup',
                            allowAdd: c.tableAllowAdd !== false,
                            allowDelete: c.tableAllowDelete !== false,
                            allowReorder: c.tableAllowReorder === true,
                            columns: (c.tableColumns || []).map((col) => ({
                                key: col.key,
                                title: col.title,
                                type: col.type || 'string',
                                required: col.required === true
                            }))
                        });
                        return;
                    }

                    if (c.widget === 'upload') {
                        const uploadSchema = {
                            title: c.label
                        };

                        if (c.uploadAllowMultiple === true) {
                            uploadSchema.type = 'array';
                            uploadSchema.items = { type: 'string' };
                        } else {
                            uploadSchema.type = 'string';
                        }

                        schemaProperties[c.name] = uploadSchema;
                        if (c.required) {
                            schemaRequired.push(c.name);
                        }

                        layoutTarget.push({
                            pointer: `${pointerBase}/properties/${c.name}`,
                            widget: 'upload',
                            label: c.label,
                            required: c.required,
                            colSpan: c.colSpan || 12,
                            accept: c.uploadAccept || '',
                            multiple: c.uploadAllowMultiple === true,
                            maxBytes: c.uploadMaxBytes > 0 ? c.uploadMaxBytes : null
                        });
                        return;
                    }

                    if (options.length > 0) {
                        if (c.widget === 'checkbox') {
                            schemaProperties[c.name] = {
                                type: 'array',
                                items: { type: 'string', enum: optionValues },
                                title: c.label
                            };
                        } else if (c.type === 'number') {
                            const nums = optionValues.map((o) => Number(o));
                            schemaProperties[c.name] = { type: 'number', enum: nums, title: c.label };
                        } else {
                            schemaProperties[c.name] = { type: c.type, enum: optionValues, title: c.label };
                        }
                    } else {
                        schemaProperties[c.name] = { type: c.type, title: c.label };
                        if (c.placeholder) {
                            schemaProperties[c.name].placeholder = c.placeholder;
                        }
                    }

                    if (c.required) {
                        schemaRequired.push(c.name);
                    }

                    layoutTarget.push({
                        pointer: `${pointerBase}/properties/${c.name}`,
                        widget: c.widget,
                        label: c.label,
                        required: c.required,
                        colSpan: c.colSpan || 12,
                        options: options.map((o) => ({
                            label: o.label,
                            value: c.type === 'number' ? Number(o.value) : o.value
                        }))
                    });
                });
            };

            processControls(this.controls, dataSchema.properties, rootRequired, layout, '#');

            if (rootRequired.length > 0) {
                dataSchema.required = rootRequired;
            }

            const controlSchema = {
                layout,
                theme: {
                    preset: this.selectedTheme,
                    custom: this.selectedTheme === 'custom' ? this.customTheme : null
                }
            };

            const definition = {
                id: this.definitionKey || 'generated-definition',
                title: this.definitionKey || 'Generated Form',
                version: '1.0.0',
                kind: 'form',
                form: {
                    dataSchema,
                    controlSchema
                }
            };
            this.definitionJson = JSON.stringify(definition, null, 2);
        }
    };
})();
