(function () {
    const windowAny = window as any;

    interface FormControl {
        widget: string;
        stateKey?: string;
        name?: string;
        label?: string;
        localId?: string;
        defaultValue?: any;
        children?: FormControl[];
        options?: ControlOption[];
        autocompleteSourceType?: string;
        autocompleteSourceUrl?: string;
        autocompleteLabelField?: string;
        autocompleteValueField?: string;
        autocompleteSearchParam?: string;
        minDate?: string;
        maxDate?: string;
        minDateTime?: string;
        maxDateTime?: string;
        assetKey?: string;
        assetVersion?: number;
        assetHash?: string;
        assetPreviewUrl?: string;
        altText?: string;
        objectFit?: string;
        imageWidth?: number;
        imageHeight?: number;
        uploadAccept?: string;
        uploadAllowMultiple?: boolean;
        uploadMaxBytes?: number;
        buttonVariant?: string;
        buttonActionType?: string;
        buttonActionTarget?: string;
        buttonPayload?: string;
        buttonConfirmMessage?: string;
        messageTone?: string;
        messageTitle?: string;
        messageBody?: string;
        messageFormat?: string;
        repeatRenderer?: string;
        repeatMinItems?: number;
        repeatMaxItems?: number;
        repeatAllowAdd?: boolean;
        repeatAllowDelete?: boolean;
        repeatAllowReorder?: boolean;
        tableColumns?: TableColumn[];
        tableMinItems?: number;
        tableMaxItems?: number;
        tableAllowAdd?: boolean;
        tableAllowDelete?: boolean;
        tableAllowReorder?: boolean;
        sectionDescription?: string;
        sectionCollapsible?: boolean;
        sectionDefaultExpanded?: boolean;
        groupDescription?: string;
        nameManual?: boolean;
        type?: string;
        required?: boolean;
        visible?: boolean;
        enabled?: boolean;
        validationMessage?: string;
        hint?: string;
        hintFormat?: string;
        help?: string;
        helpFormat?: string;
        colSpan?: number;
        placeholder?: string;
        id?: string;
        [key: string]: any;
    }

    interface ControlOption {
        label: string;
        value: string;
        autoValue?: boolean;
    }

    interface TableColumn {
        key: string;
        title: string;
        type: string;
        required: boolean;
    }

    interface ControlRef {
        control: FormControl;
        index: number;
        list: FormControl[];
        parent: FormControl | null;
    }

    const coreInteractionsApi: Record<string, any> = {
        nextControlSeq: 0,
        controls: [] as FormControl[],
        selectedControlLocalId: null as string | null,
        selectedControl: null as FormControl | null,
        validationErrors: [] as string[],
        stateKeyEditEnabled: false,
        lastSelectedAt: 0,
        controlPalette: [] as any[],

        newControlLocalId(): string {
            const seq = this.nextControlSeq;
            this.nextControlSeq += 1;
            return `ctrl-${Date.now()}-${seq}`;
        },

        createControlFromPalette(index: number | null | undefined): FormControl | null {
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

        defaultInitialValueForWidget(widget: string): any {
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

        findControlByLocalId(localId: string, list?: FormControl[], parent: FormControl | null = null): ControlRef | null {
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

        isContainerWidget(widget: string): boolean {
            return widget === 'section' || widget === 'group' || widget === 'repeat';
        },

        isDescendantId(containerId: string, possibleDescendantId: string): boolean {
            const containerRef = this.findControlByLocalId(containerId);
            if (!containerRef || !Array.isArray(containerRef.control.children)) {
                return false;
            }

            const walk = (children: FormControl[]): boolean => {
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

        detachControl(localId: string): FormControl | null {
            const found = this.findControlByLocalId(localId);
            if (!found) {
                return null;
            }
            return found.list.splice(found.index, 1)[0];
        },

        selectControl(localId: string | null): void {
            this.selectedControlLocalId = localId;
            this.lastSelectedAt = Date.now();
            this.stateKeyEditEnabled = false;
            const found = this.findControlByLocalId(localId!);
            this.selectedControl = found ? this.normalizeControl(found.control) : null;
            this.validateSelected();
        },

        clearSelection(): void {
            this.selectedControlLocalId = null;
            this.selectedControl = null;
            this.stateKeyEditEnabled = false;
            this.lastSelectedAt = 0;
            this.validationErrors = [];
        },

        updateCanvasControl(localId: string, mutator: (control: FormControl) => void): void {
            const found = this.findControlByLocalId(localId);
            if (!found) {
                return;
            }

            const source = found.control || {};
            const draft: FormControl = {
                ...source,
                options: Array.isArray(source.options) ? source.options.map((o: ControlOption) => ({ ...o })) : [],
                tableColumns: Array.isArray(source.tableColumns) ? source.tableColumns.map((col: TableColumn) => ({ ...col })) : [],
                children: Array.isArray(source.children) ? source.children.map((child: FormControl) => ({ ...child })) : []
            };

            mutator(draft);
            const normalized = this.normalizeControl(draft);
            found.list[found.index] = normalized;

            if (this.selectedControlLocalId === localId) {
                this.selectedControl = {
                    ...normalized,
                    options: Array.isArray(normalized.options) ? normalized.options.map((o: ControlOption) => ({ ...o })) : [],
                    tableColumns: Array.isArray(normalized.tableColumns) ? normalized.tableColumns.map((col: TableColumn) => ({ ...col })) : []
                };
                this.validateSelected();
            }
        },

        onCanvasLabelChanged(controlId: string, value: string): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                control.label = value;
                if (!control.nameManual) {
                    control.name = this.toIdentifier(value);
                }
            });
        },

        onCanvasImageAltChanged(controlId: string, value: string): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                control.altText = value;
            });
        },

        onCanvasDefaultTextChanged(controlId: string, value: string): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                control.defaultValue = value;
            });
        },

        onCanvasDefaultNumberChanged(controlId: string, value: string | number | null | undefined): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                if (value === '' || value === null || value === undefined) {
                    control.defaultValue = null;
                    return;
                }

                const parsed = Number(value);
                control.defaultValue = Number.isFinite(parsed) ? parsed : null;
            });
        },

        onCanvasDefaultBooleanChanged(controlId: string, checked: boolean): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                control.defaultValue = checked === true;
            });
        },

        onCanvasDefaultMultiChanged(controlId: string, optionValue: string, checked: boolean): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
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

        onCanvasUploadDefaultChanged(controlId: string, value: string, allowMultiple: boolean): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                if (allowMultiple === true) {
                    control.defaultValue = (value || '')
                        .split(',')
                        .map((entry: string) => entry.trim())
                        .filter(Boolean);
                    return;
                }

                control.defaultValue = value || '';
            });
        },

        onCanvasUploadAcceptChanged(controlId: string, value: string): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                control.uploadAccept = value;
            });
        },

        onCanvasUploadMaxBytesChanged(controlId: string, value: string | number): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                const parsed = Number(value) || 0;
                control.uploadMaxBytes = parsed < 0 ? 0 : parsed;
            });
        },

        async uploadImageAsset(event: Event): Promise<void> {
            if (!this.selectedControl || this.selectedControl.widget !== 'image') {
                return;
            }

            const input = event && event.target ? (event.target as HTMLInputElement) : null;
            const file = input && input.files && input.files[0] ? input.files[0] : null;
            if (!file) {
                return;
            }

            const previewUrl = await new Promise<string>((resolve, reject) => {
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

        onCanvasTableColumnTitleChanged(controlId: string, columnIndex: number, value: string): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                if (!Array.isArray(control.tableColumns) || !control.tableColumns[columnIndex]) {
                    return;
                }
                control.tableColumns[columnIndex].title = value;
            });
        },

        onCanvasTableColumnTypeChanged(controlId: string, columnIndex: number, value: string): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                if (!Array.isArray(control.tableColumns) || !control.tableColumns[columnIndex]) {
                    return;
                }
                control.tableColumns[columnIndex].type = value;
            });
        },

        addTableColumnOnCanvas(controlId: string): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                if (!Array.isArray(control.tableColumns)) {
                    control.tableColumns = [];
                }

                const existingKeys = new Set(control.tableColumns.map((col: TableColumn) => col.key));
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

        removeLastTableColumnOnCanvas(controlId: string): void {
            this.updateCanvasControl(controlId, (control: FormControl) => {
                if (!Array.isArray(control.tableColumns) || control.tableColumns.length <= 1) {
                    return;
                }
                control.tableColumns.pop();
            });
        }
    };

    windowAny.formDesignerInteractionsCore = coreInteractionsApi;
})();
