function formDesigner() {
    const controlsApi = window.formDesignerControls || {};
    const schemaApi = window.formDesignerSchema || {};

    return {
        manifestKey: document.getElementById('manifestKey') ? document.getElementById('manifestKey').value : 'generated-manifest',
        selectedTheme: 'default',
        customTheme: {
            accent: '#2563eb',
            bg: '#f7f8fa',
            surface: '#ffffff',
            text: '#1f2937'
        },
        controlPalette: [
            { label: 'Text Input', widget: 'text', type: 'string' },
            { label: 'Number Input', widget: 'number', type: 'number' },
            { label: 'Textarea', widget: 'textarea', type: 'string' },
            { label: 'Select', widget: 'select', type: 'string' },
            { label: 'Radio Group', widget: 'radio', type: 'string' },
            { label: 'Checkbox Group', widget: 'checkbox', type: 'array' },
            { label: 'Boolean Checkbox', widget: 'booleanCheckbox', type: 'boolean' },
            { label: 'Image', widget: 'image', type: 'string' },
            { label: 'Table', widget: 'table', type: 'array' }
        ],
        controls: [],
        columnOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        selectedControlId: null,
        selectedControl: null,
        draggedPaletteIndex: null,
        draggedCanvasId: null,
        dragSourceType: null,
        validationErrors: [],
        manifestJson: '',

        ...controlsApi,
        ...schemaApi,

        applyTheme() {
            const host = this.$root;
            if (!host) {
                return;
            }

            if (this.selectedTheme !== 'custom') {
                host.style.removeProperty('--accent');
                host.style.removeProperty('--bg');
                host.style.removeProperty('--surface');
                host.style.removeProperty('--text');
                return;
            }

            host.style.setProperty('--accent', this.customTheme.accent);
            host.style.setProperty('--bg', this.customTheme.bg);
            host.style.setProperty('--surface', this.customTheme.surface);
            host.style.setProperty('--text', this.customTheme.text);
        },

        startPaletteDrag(index) {
            this.dragSourceType = 'palette';
            this.draggedPaletteIndex = index;
        },

        startCanvasDrag(controlId) {
            this.dragSourceType = 'canvas';
            this.draggedCanvasId = controlId;
        },

        dropOnCanvas() {
            if (this.dragSourceType === 'palette') {
                const control = this.createControlFromPalette(this.draggedPaletteIndex);
                if (!control) {
                    return;
                }
                this.controls.push(control);
                this.selectControl(control.id);
            } else if (this.dragSourceType === 'canvas') {
                const fromIndex = this.controls.findIndex((c) => c.id === this.draggedCanvasId);
                if (fromIndex !== -1) {
                    const dragged = this.controls.splice(fromIndex, 1)[0];
                    this.controls.push(dragged);
                    this.selectControl(dragged.id);
                }
            }
            this.resetDragState();
        },

        dropOnControl(targetId) {
            const targetIndex = this.controls.findIndex((c) => c.id === targetId);
            if (targetIndex === -1) {
                return;
            }

            if (this.dragSourceType === 'palette') {
                const control = this.createControlFromPalette(this.draggedPaletteIndex);
                if (!control) {
                    return;
                }
                this.controls.splice(targetIndex, 0, control);
                this.selectControl(control.id);
                this.resetDragState();
                return;
            }

            if (this.dragSourceType === 'canvas') {
                const fromIndex = this.controls.findIndex((c) => c.id === this.draggedCanvasId);
                if (fromIndex === -1 || fromIndex === targetIndex) {
                    this.resetDragState();
                    return;
                }
                const dragged = this.controls.splice(fromIndex, 1)[0];
                const adjustedTargetIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
                this.controls.splice(adjustedTargetIndex, 0, dragged);
                this.selectControl(dragged.id);
                this.resetDragState();
            }
        },

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
                id: `ctrl-${Date.now()}-${next}`,
                name: this.toIdentifier(`${base.label} ${next}`),
                label: `${base.label} ${next}`,
                nameManual: false,
                type: base.type,
                widget: base.widget,
                required: false,
                colSpan: 12,
                placeholder: '',
                options: withOptions ? this.createDefaultOptions() : [],
                assetKey: '',
                assetVersion: 1,
                assetHash: '',
                altText: '',
                objectFit: 'contain',
                imageWidth: 0,
                imageHeight: 0,
                tableColumns: [
                    { key: 'column1', title: 'Column 1', type: 'string', required: false },
                    { key: 'column2', title: 'Column 2', type: 'string', required: false }
                ],
                tableMinItems: 0,
                tableMaxItems: 0,
                tableAllowAdd: true,
                tableAllowDelete: true,
                tableAllowReorder: false
            };
        },

        resetDragState() {
            this.dragSourceType = null;
            this.draggedPaletteIndex = null;
            this.draggedCanvasId = null;
        },

        selectControl(id) {
            this.selectedControlId = id;
            const found = this.controls.find((c) => c.id === id);
            this.selectedControl = found ? this.normalizeControl(found) : null;
            this.validateSelected();
        },

        onLabelChanged() {
            if (!this.selectedControl) {
                return;
            }

            if (!this.selectedControl.nameManual) {
                this.selectedControl.name = this.toIdentifier(this.selectedControl.label);
            }

            this.syncSelected();
        },

        onNameChanged() {
            if (!this.selectedControl) {
                return;
            }

            this.selectedControl.nameManual = true;
            this.selectedControl.name = this.toIdentifier(this.selectedControl.name);
            this.syncSelected();
        },

        onWidgetChanged() {
            if (!this.selectedControl) {
                return;
            }
            this.selectedControl = this.normalizeControl(this.selectedControl);
            this.syncSelected();
        },

        onTypeChanged() {
            if (!this.selectedControl) {
                return;
            }

            if (this.selectedControl.type === 'boolean') {
                this.selectedControl.widget = 'booleanCheckbox';
                this.selectedControl.type = 'boolean';
                this.selectedControl.options = [];
                this.selectedControl.placeholder = '';
            }

            if (this.selectedControl.type === 'array') {
                this.selectedControl.widget = 'checkbox';
                this.selectedControl.type = 'array';
                if (!Array.isArray(this.selectedControl.options) || this.selectedControl.options.length === 0) {
                    this.selectedControl.options = [
                        { label: 'Yes', value: 'yes', autoValue: false },
                        { label: 'No', value: 'no', autoValue: false }
                    ];
                }
            }

            if (this.selectedControl.type === 'number'
                && (this.selectedControl.widget === 'text' || this.selectedControl.widget === 'textarea')) {
                this.selectedControl.widget = 'number';
            }

            this.selectedControl = this.normalizeControl(this.selectedControl);
            this.syncSelected();
        },

        addOptionRow() {
            if (!this.selectedControl || !this.isOptionWidget(this.selectedControl.widget)) {
                return;
            }
            this.ensureOptionsArray(this.selectedControl);
            const next = this.selectedControl.options.length + 1;
            this.selectedControl.options.push({
                label: `Option ${next}`,
                value: `option_${next}`,
                autoValue: true
            });
            this.syncSelected();
        },

        removeOptionRow(index) {
            if (!this.selectedControl || !Array.isArray(this.selectedControl.options)) {
                return;
            }
            this.selectedControl.options.splice(index, 1);
            this.syncSelected();
        },

        addTableColumn() {
            if (!this.selectedControl || this.selectedControl.widget !== 'table') {
                return;
            }
            if (!Array.isArray(this.selectedControl.tableColumns)) {
                this.selectedControl.tableColumns = [];
            }
            const next = this.selectedControl.tableColumns.length + 1;
            this.selectedControl.tableColumns.push({
                key: `column${next}`,
                title: `Column ${next}`,
                type: 'string',
                required: false
            });
            this.syncSelected();
        },

        removeTableColumn(index) {
            if (!this.selectedControl || this.selectedControl.widget !== 'table' || !Array.isArray(this.selectedControl.tableColumns)) {
                return;
            }
            this.selectedControl.tableColumns.splice(index, 1);
            this.syncSelected();
        },

        onTableColumnKeyChanged(index) {
            if (!this.selectedControl || this.selectedControl.widget !== 'table' || !Array.isArray(this.selectedControl.tableColumns)) {
                return;
            }
            const col = this.selectedControl.tableColumns[index];
            if (!col) {
                return;
            }
            col.key = this.toIdentifier(col.key);
            this.syncSelected();
        },

        onOptionLabelChanged(index) {
            if (!this.selectedControl || !Array.isArray(this.selectedControl.options)) {
                return;
            }
            const option = this.selectedControl.options[index];
            if (!option) {
                return;
            }
            if (option.autoValue !== false) {
                option.value = this.slugify(option.label);
            }
            this.syncSelected();
        },

        onOptionValueChanged(index) {
            if (!this.selectedControl || !Array.isArray(this.selectedControl.options)) {
                return;
            }
            const option = this.selectedControl.options[index];
            if (!option) {
                return;
            }
            option.autoValue = false;
            this.syncSelected();
        },

        syncSelected() {
            if (!this.selectedControl) {
                return;
            }

            this.selectedControl = this.normalizeControl(this.selectedControl);
            const idx = this.controls.findIndex((c) => c.id === this.selectedControlId);
            if (idx === -1) {
                return;
            }

            this.controls[idx] = { ...this.selectedControl, options: [...this.selectedControl.options] };
            this.validateSelected();
        },

        validateSelected() {
            this.validationErrors = this.selectedControl ? this.validateControl(this.selectedControl) : [];
        },

        removeControl(id) {
            const idx = this.controls.findIndex((c) => c.id === id);
            if (idx !== -1) {
                this.controls.splice(idx, 1);
            }
            if (this.selectedControlId === id) {
                this.selectedControlId = null;
                this.selectedControl = null;
            }
        }
    };
}

window.formDesigner = formDesigner;
