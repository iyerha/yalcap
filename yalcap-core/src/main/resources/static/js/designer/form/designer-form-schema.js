// @ts-check
(function () {
    const windowAny = /** @type {any} */ (window);
    const schemaControlsApi = windowAny.formDesignerSchemaControls || {};
    const controlEmitters = schemaControlsApi.emitters || {};

    windowAny.formDesignerSchema = {
        generate() {
            const previousSelection = this.selectedControlLocalId;
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
                    const usesStaticOptions = !(c.widget === 'autocomplete' && c.autocompleteSourceType === 'remote');
                    const effectiveOptions = usesStaticOptions ? options : [];
                    const optionValues = options.map((o) => o.value);

                    const emitter = controlEmitters[c.widget];
                    if (emitter) {
                        const handled = emitter({
                            control: c,
                            processControls,
                            schemaProperties,
                            schemaRequired,
                            layoutTarget,
                            pointerBase,
                            newControlId: this.newControlPersistentId.bind(this)
                        });
                        if (handled) {
                            return;
                        }
                    }

                    if (effectiveOptions.length > 0) {
                        if (c.widget === 'checkbox') {
                            schemaProperties[c.name] = {
                                type: 'array',
                                items: { type: 'string', enum: optionValues },
                                title: c.label
                            };
                            if (Array.isArray(c.defaultValue) && c.defaultValue.length > 0) {
                                schemaProperties[c.name].default = c.defaultValue;
                            }
                        } else if (c.type === 'number') {
                            const nums = optionValues.map((o) => Number(o));
                            schemaProperties[c.name] = { type: 'number', enum: nums, title: c.label };
                            if (c.defaultValue !== null && c.defaultValue !== undefined && c.defaultValue !== '') {
                                const parsedDefault = Number(c.defaultValue);
                                if (!Number.isNaN(parsedDefault)) {
                                    schemaProperties[c.name].default = parsedDefault;
                                }
                            }
                        } else {
                            schemaProperties[c.name] = { type: c.type, enum: optionValues, title: c.label };
                            if (c.defaultValue !== null && c.defaultValue !== undefined && c.defaultValue !== '') {
                                schemaProperties[c.name].default = c.defaultValue;
                            }
                        }
                    } else {
                        schemaProperties[c.name] = { type: c.type, title: c.label };
                        const hasDefaultArray = Array.isArray(c.defaultValue);
                        const hasDefaultScalar = c.defaultValue !== null && c.defaultValue !== undefined && c.defaultValue !== '';
                        if (hasDefaultArray || hasDefaultScalar) {
                            schemaProperties[c.name].default = c.defaultValue;
                        }
                        if (c.placeholder) {
                            schemaProperties[c.name].placeholder = c.placeholder;
                        }
                        if (c.widget === 'date') {
                            schemaProperties[c.name].format = 'date';
                        }
                        if (c.widget === 'datetime') {
                            schemaProperties[c.name].format = 'date-time';
                        }
                    }

                    if (c.required) {
                        schemaRequired.push(c.name);
                    }

                    layoutTarget.push({
                        id: c.id,
                        pointer: `${pointerBase}/properties/${c.name}`,
                        stateKey: c.stateKey || c.name,
                        widget: c.widget,
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
                        minDate: c.widget === 'date' ? (c.minDate || null) : null,
                        maxDate: c.widget === 'date' ? (c.maxDate || null) : null,
                        minDateTime: c.widget === 'datetime' ? (c.minDateTime || null) : null,
                        maxDateTime: c.widget === 'datetime' ? (c.maxDateTime || null) : null,
                        autocompleteSourceType: c.widget === 'autocomplete' ? (c.autocompleteSourceType || 'static') : null,
                        autocompleteSourceUrl: c.widget === 'autocomplete' && c.autocompleteSourceType === 'remote' ? (c.autocompleteSourceUrl || null) : null,
                        autocompleteLabelField: c.widget === 'autocomplete' ? (c.autocompleteLabelField || 'label') : null,
                        autocompleteValueField: c.widget === 'autocomplete' ? (c.autocompleteValueField || 'value') : null,
                        autocompleteSearchParam: c.widget === 'autocomplete' ? (c.autocompleteSearchParam || 'q') : null,
                        options: effectiveOptions.map((o) => ({
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
                validation: {
                    messagePlacement: this.validationDisplayMode || 'inline-summary'
                },
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

            let rules = [];
            try {
                rules = typeof this.normalizedRulesPayload === 'function'
                    ? this.normalizedRulesPayload()
                    : [];
            } catch (err) {
                this.validationErrors = [
                    `Rules validation failed: ${err instanceof Error ? err.message : String(err)}`
                ];
                alert('Please fix rules validation issues before generating JSON.');
                return;
            }

            if (rules.length > 0) {
                definition.rules = rules;
            }
            this.definitionJson = JSON.stringify(definition, null, 2);
        }
    };
})();
