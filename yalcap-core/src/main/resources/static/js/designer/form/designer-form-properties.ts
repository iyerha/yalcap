(function () {
    const windowAny = window as any;

    interface PropertiesApi {
        selectedControl: any;
        selectedControlLocalId: string | null;
        validationErrors: string[];
        toggleStateKeyEdit(): void;
        onLabelChanged(): void;
        onNameChanged(): void;
        onWidgetChanged(): void;
        onTypeChanged(): void;
        addOptionRow(): void;
        removeOptionRow(index: number): void;
        addTableColumn(): void;
        removeTableColumn(index: number): void;
        onTableColumnKeyChanged(index: number): void;
        onOptionLabelChanged(index: number): void;
        onOptionValueChanged(index: number): void;
        syncSelected(): void;
        validateSelected(): void;
        [key: string]: any;
    }

    const propertiesApi: PropertiesApi = {
        selectedControl: null,
        selectedControlLocalId: null,
        validationErrors: [],

        toggleStateKeyEdit(): void {
            this.stateKeyEditEnabled = false;
        },

        onLabelChanged(): void {
            if (!this.selectedControl) {
                return;
            }

            if (!this.selectedControl.nameManual) {
                this.selectedControl.name = this.toIdentifier(this.selectedControl.label);
            }

            this.syncSelected();
        },

        onNameChanged(): void {
            if (!this.selectedControl) {
                return;
            }

            this.selectedControl.nameManual = true;
            this.selectedControl.name = this.toIdentifier(this.selectedControl.name);
            this.syncSelected();
        },

        onWidgetChanged(): void {
            if (!this.selectedControl) {
                return;
            }
            this.selectedControl = this.normalizeControl(this.selectedControl);
            this.syncSelected();
        },

        onTypeChanged(): void {
            if (!this.selectedControl) {
                return;
            }

            if (this.selectedControl.type === 'null') {
                if (this.selectedControl.widget !== 'message' && this.selectedControl.widget !== 'button') {
                    this.selectedControl.widget = 'button';
                }
                this.selectedControl = this.normalizeControl(this.selectedControl);
                this.syncSelected();
                return;
            }

            if (this.selectedControl.widget === 'upload') {
                this.selectedControl = this.normalizeControl(this.selectedControl);
                this.syncSelected();
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

        addOptionRow(): void {
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

        removeOptionRow(index: number): void {
            if (!this.selectedControl || !Array.isArray(this.selectedControl.options)) {
                return;
            }
            this.selectedControl.options.splice(index, 1);
            this.syncSelected();
        },

        addTableColumn(): void {
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

        removeTableColumn(index: number): void {
            if (!this.selectedControl || this.selectedControl.widget !== 'table' || !Array.isArray(this.selectedControl.tableColumns)) {
                return;
            }
            this.selectedControl.tableColumns.splice(index, 1);
            this.syncSelected();
        },

        onTableColumnKeyChanged(index: number): void {
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

        onOptionLabelChanged(index: number): void {
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

        onOptionValueChanged(index: number): void {
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

        syncSelected(): void {
            if (!this.selectedControl) {
                return;
            }

            this.selectedControl = this.normalizeControl(this.selectedControl);
            const found = this.findControlByLocalId(this.selectedControlLocalId);
            if (!found) {
                return;
            }

            found.list[found.index] = {
                ...this.selectedControl,
                options: [...(this.selectedControl.options || [])],
                tableColumns: [...(this.selectedControl.tableColumns || [])],
                children: [...(this.selectedControl.children || [])]
            };

            this.recomputeDerivedStateKeys();
            const refreshed = this.findControlByLocalId(this.selectedControlLocalId);
            if (refreshed) {
                this.selectedControl = this.normalizeControl(refreshed.control);
            }

            this.validateSelected();
        },

        validateSelected(): void {
            this.validationErrors = this.selectedControl ? this.validateControl(this.selectedControl) : [];
        }
    };

    windowAny.formDesignerProperties = propertiesApi;
})();
