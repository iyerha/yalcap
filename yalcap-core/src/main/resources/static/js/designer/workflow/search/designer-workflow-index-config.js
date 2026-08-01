window.workflowDesignerIndexConfigMixin = function workflowDesignerIndexConfigMixin(target) {
    Object.assign(target, {
        indexConfigLoading: false,
        indexConfigError: '',
        indexConfigFormKey: '',
        currentIndexConfig: null,

        getSelectedFormStep() {
            const step = this.steps.find((s) => String(s.nodeId) === String(this.selectedNodeId));
            if (!step || String(step.type || '').trim() !== 'form') {
                return null;
            }
            return step;
        },

        async loadFormDefinition(formKey) {
            const key = String(formKey || '').trim();
            if (!key) {
                return null;
            }

            try {
                const tenantId = window.tenantId;
                const response = await fetch('/api/definitions/' + encodeURIComponent(key), {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Tenant-Id': tenantId
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load form definition');
                }

                const definition = await response.json();
                return definition;
            } catch (error) {
                this.indexConfigError = error instanceof Error ? error.message : String(error);
                return null;
            }
        },

        extractControlsAsIndexFields(controls, parentPath) {
            const fields = [];
            if (!Array.isArray(controls)) {
                return fields;
            }

            controls.forEach((control) => {
                const controlType = String(control.type || '').trim().toLowerCase();
                const name = String(control.name || '').trim();
                const label = String(control.label || '').trim();

                if (!name) {
                    return;
                }

                const path = parentPath ? parentPath + '.' + name : name;
                const fieldType = controlType === 'table' || controlType === 'repeat' ? 'nested' : controlType === 'group' ? 'group' : 'text';

                const field = {
                    id: control.id || '',
                    name: name,
                    path: path,
                    type: fieldType,
                    searchable: fieldType !== 'nested' && fieldType !== 'group',
                    displayable: true
                };

                if ((controlType === 'table' || controlType === 'repeat' || controlType === 'group') && Array.isArray(control.children)) {
                    const childPath = fieldType === 'nested' ? path + '[]' : path;
                    field.childFields = this.extractControlsAsIndexFields(control.children, childPath);
                }

                fields.push(field);
            });

            return fields;
        },

        generateDefaultIndexConfig(formDefinition) {
            if (!formDefinition || !Array.isArray(formDefinition.controls)) {
                return { rootFields: [] };
            }

            return {
                rootFields: this.extractControlsAsIndexFields(formDefinition.controls, '')
            };
        },

        async refreshIndexConfig() {
            const step = this.getSelectedFormStep();
            if (!step) {
                this.currentIndexConfig = null;
                this.indexConfigFormKey = '';
                this.indexConfigError = '';
                return;
            }

            const formKey = step.ui && step.ui.pointer ? String(step.ui.pointer).trim() : '';
            if (!formKey) {
                this.currentIndexConfig = null;
                this.indexConfigFormKey = '';
                this.indexConfigError = 'Form step does not reference a form (ui.pointer is empty).';
                return;
            }

            this.indexConfigFormKey = formKey;
            this.indexConfigLoading = true;
            this.indexConfigError = '';

            try {
                const formDef = await this.loadFormDefinition(formKey);
                if (!formDef) {
                    throw new Error('Form definition not found: ' + formKey);
                }

                // Use existing indexConfig if present, otherwise generate default
                if (step.indexConfig && typeof step.indexConfig === 'object') {
                    this.currentIndexConfig = JSON.parse(JSON.stringify(step.indexConfig));
                } else {
                    this.currentIndexConfig = this.generateDefaultIndexConfig(formDef);
                    // Store generated config back to step
                    step.indexConfig = JSON.parse(JSON.stringify(this.currentIndexConfig));
                }

                this.indexConfigError = '';
            } catch (error) {
                this.currentIndexConfig = null;
                this.indexConfigError = error instanceof Error ? error.message : String(error);
            } finally {
                this.indexConfigLoading = false;
            }
        },

        toggleFieldSearchable(fieldId) {
            if (!this.currentIndexConfig || !Array.isArray(this.currentIndexConfig.rootFields)) {
                return;
            }

            const findAndToggle = (fields) => {
                for (let field of fields) {
                    if (field.id === fieldId) {
                        field.searchable = !field.searchable;
                        return true;
                    }
                    if (Array.isArray(field.childFields) && findAndToggle(field.childFields)) {
                        return true;
                    }
                }
                return false;
            };

            findAndToggle(this.currentIndexConfig.rootFields);
            this.syncIndexConfigToStep();
        },

        toggleFieldDisplayable(fieldId) {
            if (!this.currentIndexConfig || !Array.isArray(this.currentIndexConfig.rootFields)) {
                return;
            }

            const findAndToggle = (fields) => {
                for (let field of fields) {
                    if (field.id === fieldId) {
                        field.displayable = !field.displayable;
                        return true;
                    }
                    if (Array.isArray(field.childFields) && findAndToggle(field.childFields)) {
                        return true;
                    }
                }
                return false;
            };

            findAndToggle(this.currentIndexConfig.rootFields);
            this.syncIndexConfigToStep();
        },

        syncIndexConfigToStep() {
            const step = this.getSelectedFormStep();
            if (step && this.currentIndexConfig) {
                step.indexConfig = JSON.parse(JSON.stringify(this.currentIndexConfig));
                this.generate();
            }
        },

        async resetIndexConfig() {
            const step = this.getSelectedFormStep();
            if (!step) {
                return;
            }

            const formKey = step.ui && step.ui.pointer ? String(step.ui.pointer).trim() : '';
            if (!formKey) {
                return;
            }

            try {
                const formDef = await this.loadFormDefinition(formKey);
                if (!formDef) {
                    throw new Error('Form definition not found');
                }

                this.currentIndexConfig = this.generateDefaultIndexConfig(formDef);
                this.syncIndexConfigToStep();
                this.indexConfigError = '';
            } catch (error) {
                this.indexConfigError = error instanceof Error ? error.message : String(error);
            }
        }
    });
};