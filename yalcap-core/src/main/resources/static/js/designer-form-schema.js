(function () {
    window.formDesignerSchema = {
        generate() {
            const previousSelection = this.selectedControlId;
            const allErrors = [];
            this.controls.forEach((c) => {
                const errs = this.validateControl(c);
                errs.forEach((err) => allErrors.push(`${c.label || c.name}: ${err}`));
            });
            this.validationErrors = allErrors;
            if (allErrors.length > 0) {
                alert('Please fix validation issues before generating JSON.');
                this.selectControl(previousSelection);
                return;
            }
            this.selectControl(previousSelection);

            const properties = {};
            const required = [];
            const layout = [];

            this.controls.forEach((rawControl) => {
                const c = this.normalizeControl(rawControl);
                const options = c.options || [];
                const optionValues = options.map((o) => o.value);

                if (c.widget === 'image') {
                    layout.push({
                        widget: 'image',
                        label: c.label,
                        colSpan: c.colSpan || 12,
                        alt: c.altText || '',
                        fit: c.objectFit || 'contain',
                        width: c.imageWidth > 0 ? c.imageWidth : null,
                        height: c.imageHeight > 0 ? c.imageHeight : null,
                        assetRef: {
                            assetKey: c.assetKey,
                            version: Number(c.assetVersion),
                            sha256: c.assetHash
                        }
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

                    properties[c.name] = arraySchema;

                    if (c.required) {
                        required.push(c.name);
                    }

                    layout.push({
                        pointer: `#/properties/${c.name}`,
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

                if (options.length > 0) {
                    if (c.widget === 'checkbox') {
                        properties[c.name] = {
                            type: 'array',
                            items: { type: 'string', enum: optionValues },
                            title: c.label
                        };
                    } else if (c.type === 'number') {
                        const nums = optionValues.map((o) => Number(o));
                        properties[c.name] = { type: 'number', enum: nums, title: c.label };
                    } else {
                        properties[c.name] = { type: c.type, enum: optionValues, title: c.label };
                    }
                } else {
                    properties[c.name] = { type: c.type, title: c.label };
                    if (c.placeholder) {
                        properties[c.name].placeholder = c.placeholder;
                    }
                }

                if (c.required) {
                    required.push(c.name);
                }

                layout.push({
                    pointer: `#/properties/${c.name}`,
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

            const dataSchema = {
                $schema: 'https://json-schema.org/draft/2020-12/schema',
                type: 'object',
                properties
            };
            if (required.length) {
                dataSchema.required = required;
            }

            const controlSchema = {
                layout,
                theme: {
                    preset: this.selectedTheme,
                    custom: this.selectedTheme === 'custom' ? this.customTheme : null
                }
            };

            const manifest = {
                id: this.manifestKey || 'generated-manifest',
                title: this.manifestKey || 'Generated Form',
                version: '1.0.0',
                kind: 'form',
                form: {
                    dataSchema,
                    controlSchema
                }
            };
            this.manifestJson = JSON.stringify(manifest, null, 2);
        }
    };
})();
