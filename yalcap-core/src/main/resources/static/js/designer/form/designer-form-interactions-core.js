// @ts-check
(function () {
    const windowAny = /** @type {any} */ (window);

    const coreInteractionsApi = /** @type {Record<string, any>} */ ({
        newControlLocalId() {
            const seq = this.nextControlSeq;
            this.nextControlSeq += 1;
            return `ctrl-${Date.now()}-${seq}`;
        },

        /** @param {number | null | undefined} index */
        createControlFromPalette(index) {
            if (index === null || index === undefined) {
                return null;
            }
            const base = this.controlPalette[index];
            if (!base) {
                return null;
            }
            const next = this.controls.length + 1;
            const withOptions = this.isOptionWidget(base.widget);
            return {
                localId: this.newControlLocalId(),
                id: this.newControlPersistentId(),
                name: this.toIdentifier(`${base.label} ${next}`),
                stateKey: this.slugify(`${base.label} ${next}`),
                label: `${base.label} ${next}`,
                nameManual: false,
                type: base.type,
                widget: base.widget,
                required: false,
                visible: true,
                enabled: true,
                validationMessage: '',
                hint: '',
                hintFormat: 'markdown',
                help: '',
                helpFormat: 'markdown',
                defaultValue: this.defaultInitialValueForWidget(base.widget),
                colSpan: 12,
                placeholder: '',
                options: withOptions ? this.createDefaultOptions() : [],
                autocompleteSourceType: 'static',
                autocompleteSourceUrl: '',
                autocompleteLabelField: 'label',
                autocompleteValueField: 'value',
                autocompleteSearchParam: 'q',
                minDate: '',
                maxDate: '',
                minDateTime: '',
                maxDateTime: '',
                assetKey: '',
                assetVersion: 0,
                assetHash: '',
                assetPreviewUrl: '',
                altText: '',
                objectFit: 'contain',
                imageWidth: 0,
                imageHeight: 0,
                uploadAccept: '',
                uploadAllowMultiple: false,
                uploadMaxBytes: 0,
                buttonVariant: 'primary',
                buttonActionType: 'customEvent',
                buttonActionTarget: '',
                buttonPayload: '',
                buttonConfirmMessage: '',
                messageTone: 'info',
                messageTitle: '',
                messageBody: '',
                messageFormat: 'markdown',
                repeatRenderer: 'table',
                repeatMinItems: 0,
                repeatMaxItems: 0,
                repeatAllowAdd: true,
                repeatAllowDelete: true,
                repeatAllowReorder: false,
                tableColumns: [
                    { key: 'column1', title: 'Column 1', type: 'string', required: false },
                    { key: 'column2', title: 'Column 2', type: 'string', required: false }
                ],
                tableMinItems: 0,
                tableMaxItems: 0,
                tableAllowAdd: true,
                tableAllowDelete: true,
                tableAllowReorder: false,
                sectionDescription: '',
                sectionCollapsible: false,
                sectionDefaultExpanded: true,
                groupDescription: '',
                children: []
            };
        },

        /** @param {string} widget */
        defaultInitialValueForWidget(widget) {
            if (widget === 'checkbox') {
                return [];
            }
            if (widget === 'number') {
                return null;
            }
            if (widget === 'booleanCheckbox') {
                return false;
            }
            if (widget === 'message' || widget === 'button' || widget === 'section' || widget === 'group' || widget === 'repeat' || widget === 'table' || widget === 'image') {
                return null;
            }
            return '';
        },

        /** @param {string} localId @param {Array<any>=} list @param {any=} parent */
        findControlByLocalId(localId, list = undefined, parent = null) {
            const items = Array.isArray(list) ? list : this.controls;
            for (let i = 0; i < items.length; i += 1) {
                const control = items[i];
                if (control.localId === localId) {
                    return { control, index: i, list: items, parent };
                }
                if (Array.isArray(control.children) && control.children.length > 0) {
                    const found = this.findControlByLocalId(localId, control.children, control);
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        },

        /** @param {string} widget */
        isContainerWidget(widget) {
            return widget === 'section' || widget === 'group' || widget === 'repeat';
        },

        /** @param {string} containerId @param {string} possibleDescendantId */
        isDescendantId(containerId, possibleDescendantId) {
            const containerRef = this.findControlByLocalId(containerId);
            if (!containerRef || !Array.isArray(containerRef.control.children)) {
                return false;
            }

            /** @param {Array<any>} children */
            const walk = (children) => {
                for (let i = 0; i < children.length; i += 1) {
                    const child = children[i];
                    if (child.localId === possibleDescendantId) {
                        return true;
                    }
                    if (Array.isArray(child.children) && walk(child.children)) {
                        return true;
                    }
                }
                return false;
            };

            return walk(containerRef.control.children);
        },

        /** @param {string} localId */
        detachControl(localId) {
            const found = this.findControlByLocalId(localId);
            if (!found) {
                return null;
            }
            return found.list.splice(found.index, 1)[0];
        },

        /** @param {string | null} localId */
        selectControl(localId) {
            this.selectedControlLocalId = localId;
            this.lastSelectedAt = Date.now();
            this.stateKeyEditEnabled = false;
            const found = this.findControlByLocalId(localId);
            this.selectedControl = found ? this.normalizeControl(found.control) : null;
            this.validateSelected();
        },

        clearSelection() {
            this.selectedControlLocalId = null;
            this.selectedControl = null;
            this.stateKeyEditEnabled = false;
            this.lastSelectedAt = 0;
            this.validationErrors = [];
        },

        /** @param {string} localId @param {(control: any) => void} mutator */
        updateCanvasControl(localId, mutator) {
            const found = this.findControlByLocalId(localId);
            if (!found) {
                return;
            }

            const source = found.control || {};
            const draft = {
                ...source,
                options: Array.isArray(source.options) ? source.options.map((/** @type {any} */ o) => ({ ...o })) : [],
                tableColumns: Array.isArray(source.tableColumns) ? source.tableColumns.map((/** @type {any} */ col) => ({ ...col })) : [],
                children: Array.isArray(source.children) ? source.children.map((/** @type {any} */ child) => ({ ...child })) : []
            };

            mutator(draft);
            const normalized = this.normalizeControl(draft);
            found.list[found.index] = normalized;

            if (this.selectedControlLocalId === localId) {
                this.selectedControl = {
                    ...normalized,
                    options: Array.isArray(normalized.options) ? normalized.options.map((/** @type {any} */ o) => ({ ...o })) : [],
                    tableColumns: Array.isArray(normalized.tableColumns) ? normalized.tableColumns.map((/** @type {any} */ col) => ({ ...col })) : []
                };
                this.validateSelected();
            }
        },

        /** @param {string} controlId @param {string} value */
        onCanvasLabelChanged(controlId, value) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                control.label = value;
                if (!control.nameManual) {
                    control.name = this.toIdentifier(value);
                }
            });
        },

        /** @param {string} controlId @param {string} value */
        onCanvasImageAltChanged(controlId, value) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                control.altText = value;
            });
        },

        /** @param {string} controlId @param {string} value */
        onCanvasDefaultTextChanged(controlId, value) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                control.defaultValue = value;
            });
        },

        /** @param {string} controlId @param {string | number | null | undefined} value */
        onCanvasDefaultNumberChanged(controlId, value) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                if (value === '' || value === null || value === undefined) {
                    control.defaultValue = null;
                    return;
                }

                const parsed = Number(value);
                control.defaultValue = Number.isFinite(parsed) ? parsed : null;
            });
        },

        /** @param {string} controlId @param {boolean} checked */
        onCanvasDefaultBooleanChanged(controlId, checked) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                control.defaultValue = checked === true;
            });
        },

        /** @param {string} controlId @param {string} optionValue @param {boolean} checked */
        onCanvasDefaultMultiChanged(controlId, optionValue, checked) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                const values = Array.isArray(control.defaultValue)
                    ? [...control.defaultValue]
                    : [];
                const currentIndex = values.indexOf(optionValue);

                if (checked && currentIndex === -1) {
                    values.push(optionValue);
                }

                if (!checked && currentIndex !== -1) {
                    values.splice(currentIndex, 1);
                }

                control.defaultValue = values;
            });
        },

        /** @param {string} controlId @param {string} value @param {boolean} allowMultiple */
        onCanvasUploadDefaultChanged(controlId, value, allowMultiple) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                if (allowMultiple === true) {
                    control.defaultValue = (value || '')
                        .split(',')
                        .map((/** @type {string} */ entry) => entry.trim())
                        .filter(Boolean);
                    return;
                }

                control.defaultValue = value || '';
            });
        },

        /** @param {string} controlId @param {string} value */
        onCanvasUploadAcceptChanged(controlId, value) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                control.uploadAccept = value;
            });
        },

        /** @param {string} controlId @param {string | number} value */
        onCanvasUploadMaxBytesChanged(controlId, value) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                const parsed = Number(value) || 0;
                control.uploadMaxBytes = parsed < 0 ? 0 : parsed;
            });
        },

        /** @param {Event} event */
        async uploadImageAsset(event) {
            if (!this.selectedControl || this.selectedControl.widget !== 'image') {
                return;
            }

            const input = /** @type {HTMLInputElement | null} */ (event && event.target ? event.target : null);
            const file = input && input.files && input.files[0] ? input.files[0] : null;
            if (!file) {
                return;
            }

            const previewUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result ? String(reader.result) : '');
                reader.onerror = () => reject(new Error('Unable to read image preview'));
                reader.readAsDataURL(file);
            }).catch(() => '');

            if (previewUrl) {
                this.selectedControl.assetPreviewUrl = previewUrl;
            }

            const formData = new FormData();
            formData.append('file', file);
            if (this.selectedControl.assetKey) {
                formData.append('assetKey', this.selectedControl.assetKey);
            }
            formData.append('createdBy', 'designer');

            const tenantId = (windowAny.tenantId || '').toString().trim();
            const uploadUrl = tenantId ? `/t/${tenantId}/api/assets/upload` : '/api/assets/upload';

            try {
                const response = await fetch(uploadUrl, {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const payload = await response.json();
                this.selectedControl.assetKey = payload.assetKey || this.selectedControl.assetKey;
                this.selectedControl.assetVersion = payload.version || this.selectedControl.assetVersion;
                this.selectedControl.assetHash = payload.sha256 || this.selectedControl.assetHash;
                this.selectedControl.imageWidth = payload.width || 0;
                this.selectedControl.imageHeight = payload.height || 0;
                this.syncSelected();
            } catch (err) {
                alert('Image upload failed. Please try again.');
            } finally {
                if (input) {
                    input.value = '';
                }
            }
        },

        /** @param {string} controlId @param {number} columnIndex @param {string} value */
        onCanvasTableColumnTitleChanged(controlId, columnIndex, value) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                if (!Array.isArray(control.tableColumns) || !control.tableColumns[columnIndex]) {
                    return;
                }
                control.tableColumns[columnIndex].title = value;
            });
        },

        /** @param {string} controlId @param {number} columnIndex @param {string} value */
        onCanvasTableColumnTypeChanged(controlId, columnIndex, value) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                if (!Array.isArray(control.tableColumns) || !control.tableColumns[columnIndex]) {
                    return;
                }
                control.tableColumns[columnIndex].type = value;
            });
        },

        /** @param {string} controlId */
        addTableColumnOnCanvas(controlId) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                if (!Array.isArray(control.tableColumns)) {
                    control.tableColumns = [];
                }

                const existingKeys = new Set(control.tableColumns.map((/** @type {any} */ col) => col.key));
                let next = control.tableColumns.length + 1;
                let nextKey = `column${next}`;
                while (existingKeys.has(nextKey)) {
                    next += 1;
                    nextKey = `column${next}`;
                }

                control.tableColumns.push({
                    key: nextKey,
                    title: `Column ${next}`,
                    type: 'string',
                    required: false
                });
            });
        },

        /** @param {string} controlId */
        removeLastTableColumnOnCanvas(controlId) {
            /** @param {any} control */
            this.updateCanvasControl(controlId, (control) => {
                if (!Array.isArray(control.tableColumns) || control.tableColumns.length <= 1) {
                    return;
                }
                control.tableColumns.pop();
            });
        }
    });

    windowAny.formDesignerInteractionsCore = coreInteractionsApi;
})();
