function formDesigner() {
    const controlsApi = window.formDesignerControls || {};
    const schemaApi = window.formDesignerSchema || {};

    return {
        definitionKey: document.getElementById('definitionKey') ? document.getElementById('definitionKey').value : 'generated-definition',
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
            { label: 'File Upload', widget: 'upload', type: 'string' },
            { label: 'Table', widget: 'table', type: 'array' },
            { label: 'Section', widget: 'section', type: 'object' },
            { label: 'Group', widget: 'group', type: 'object' }
        ],
        controls: [],
        columnOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        selectedControlId: null,
        selectedControl: null,
        lastSelectedAt: 0,
        draggedPaletteIndex: null,
        draggedCanvasId: null,
        dragSourceType: null,
        dragImageElement: null,
        nextControlSeq: 1,
        resizingControlId: null,
        resizeStartX: 0,
        resizeStartSpan: 12,
        resizeMoveHandler: null,
        resizeUpHandler: null,
        resizeCancelHandler: null,
        resizeKeyHandler: null,
        resizeVisibilityHandler: null,
        validationErrors: [],
        definitionJson: '',

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

        paletteIconSvg(widget) {
            const icons = {
                text: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><path d="M4 6h16M12 6v12M8 18h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                number: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><path d="M7 5l-2 14M15 5l-2 14M4 10h16M3 15h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                textarea: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 10h10M7 14h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                select: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 11h6M15 11l2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                radio: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><circle cx="7" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="7" cy="8" r="1.2" fill="currentColor"/><path d="M13 8h7M13 16h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                checkbox: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="4" y="5" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 8l1.4 1.4L9 7.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 8h7M13 16h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                booleanCheckbox: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="4" y="6" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 10l2 2 3-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                image: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.4" fill="currentColor"/><path d="M5 17l5-5 3 3 3-2 3 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                table: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M9 5v14M15 5v14" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
                section: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 9h8M8 13h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
                group: '<svg viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true"><rect x="4" y="6" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13" y="6" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="8.5" y="14" width="7" height="4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
            };

            return icons[widget] || icons.text;
        },

        startPaletteDrag(index) {
            this.dragSourceType = 'palette';
            this.draggedPaletteIndex = index;
        },

        startCanvasDrag(controlId, event) {
            if (!event || !event.target || !event.target.closest || !event.target.closest('.drag-handle')) {
                if (event) {
                    event.preventDefault();
                }
                return;
            }

            if (event && this.shouldBlockDragStart(event.target)) {
                event.preventDefault();
                return;
            }

            this.dragSourceType = 'canvas';
            this.draggedCanvasId = controlId;

            if (event && event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';

                const sourceEl = event.target && event.target.closest
                    ? event.target.closest('.canvas-item, .nested-runtime-control')
                    : null;

                if (sourceEl) {
                    const dragImage = sourceEl.cloneNode(true);
                    dragImage.classList.add('drag-image');
                    dragImage.style.position = 'fixed';
                    dragImage.style.top = '-10000px';
                    dragImage.style.left = '-10000px';
                    dragImage.style.width = `${sourceEl.offsetWidth}px`;
                    dragImage.style.pointerEvents = 'none';

                    const chromeNodes = dragImage.querySelectorAll('.canvas-item-toolbar, .resize-row');
                    chromeNodes.forEach((node) => node.remove());

                    document.body.appendChild(dragImage);
                    this.dragImageElement = dragImage;
                    event.dataTransfer.setDragImage(dragImage, 12, 12);
                }
            }
        },

        stopCanvasDrag() {
            this.resetDragState();
        },

        shouldBlockDragStart(target) {
            if (!target || !target.closest) {
                return false;
            }
            if (target.closest('.drag-handle')) {
                return false;
            }
            return Boolean(target.closest('input, textarea, select, button, option, label'));
        },

        newControlId() {
            const seq = this.nextControlSeq;
            this.nextControlSeq += 1;
            return `ctrl-${Date.now()}-${seq}`;
        },

        dropOnCanvas() {
            if (this.dragSourceType === 'palette') {
                const control = this.createControlFromPalette(this.draggedPaletteIndex);
                if (!control) {
                    return;
                }
                this.controls.push(control);
                this.clearSelection();
            } else if (this.dragSourceType === 'canvas') {
                const dragged = this.detachControl(this.draggedCanvasId);
                if (dragged) {
                    this.controls.push(dragged);
                    this.clearSelection();
                }
            }
            this.resetDragState();
        },

        dropOnControl(targetId) {
            const targetRef = this.findControlById(targetId);
            if (!targetRef) {
                return;
            }

            if (this.dragSourceType === 'palette') {
                const control = this.createControlFromPalette(this.draggedPaletteIndex);
                if (!control) {
                    return;
                }
                targetRef.list.splice(targetRef.index, 0, control);
                this.clearSelection();
                this.resetDragState();
                return;
            }

            if (this.dragSourceType === 'canvas') {
                if (!this.draggedCanvasId || this.draggedCanvasId === targetId) {
                    this.resetDragState();
                    return;
                }

                if (this.isDescendantId(this.draggedCanvasId, targetId)) {
                    this.resetDragState();
                    return;
                }

                const dragged = this.detachControl(this.draggedCanvasId);
                if (!dragged) {
                    this.resetDragState();
                    return;
                }

                const refreshedTargetRef = this.findControlById(targetId);
                if (!refreshedTargetRef) {
                    this.controls.push(dragged);
                } else {
                    refreshedTargetRef.list.splice(refreshedTargetRef.index, 0, dragged);
                }
                this.clearSelection();
                this.resetDragState();
            }
        },

        dropOnContainer(containerId) {
            const containerRef = this.findControlById(containerId);
            if (!containerRef || !this.isContainerWidget(containerRef.control.widget)) {
                return;
            }

            if (!Array.isArray(containerRef.control.children)) {
                containerRef.control.children = [];
            }

            if (this.dragSourceType === 'palette') {
                const control = this.createControlFromPalette(this.draggedPaletteIndex);
                if (!control) {
                    return;
                }
                containerRef.control.children.push(control);
                this.clearSelection();
                this.resetDragState();
                return;
            }

            if (this.dragSourceType === 'canvas' && this.draggedCanvasId) {
                if (this.draggedCanvasId === containerId || this.isDescendantId(this.draggedCanvasId, containerId)) {
                    this.resetDragState();
                    return;
                }

                const dragged = this.detachControl(this.draggedCanvasId);
                if (!dragged) {
                    this.resetDragState();
                    return;
                }

                const refreshedContainerRef = this.findControlById(containerId);
                if (!refreshedContainerRef || !this.isContainerWidget(refreshedContainerRef.control.widget)) {
                    this.controls.push(dragged);
                } else {
                    if (!Array.isArray(refreshedContainerRef.control.children)) {
                        refreshedContainerRef.control.children = [];
                    }
                    refreshedContainerRef.control.children.push(dragged);
                }

                this.clearSelection();
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
                id: this.newControlId(),
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
                assetVersion: 0,
                assetHash: '',
                altText: '',
                objectFit: 'contain',
                imageWidth: 0,
                imageHeight: 0,
                uploadAccept: '',
                uploadAllowMultiple: false,
                uploadMaxBytes: 0,
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

        findControlById(controlId, list = this.controls, parent = null) {
            for (let i = 0; i < list.length; i += 1) {
                const control = list[i];
                if (control.id === controlId) {
                    return { control, index: i, list, parent };
                }
                if (Array.isArray(control.children) && control.children.length > 0) {
                    const found = this.findControlById(controlId, control.children, control);
                    if (found) {
                        return found;
                    }
                }
            }
            return null;
        },

        isContainerWidget(widget) {
            return widget === 'section' || widget === 'group';
        },

        isDescendantId(containerId, possibleDescendantId) {
            const containerRef = this.findControlById(containerId);
            if (!containerRef || !Array.isArray(containerRef.control.children)) {
                return false;
            }

            const walk = (children) => {
                for (let i = 0; i < children.length; i += 1) {
                    const child = children[i];
                    if (child.id === possibleDescendantId) {
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

        detachControl(controlId) {
            const found = this.findControlById(controlId);
            if (!found) {
                return null;
            }
            return found.list.splice(found.index, 1)[0];
        },

        resetDragState() {
            this.dragSourceType = null;
            this.draggedPaletteIndex = null;
            this.draggedCanvasId = null;
            if (this.dragImageElement && this.dragImageElement.parentNode) {
                this.dragImageElement.parentNode.removeChild(this.dragImageElement);
            }
            this.dragImageElement = null;
        },

        selectControl(id) {
            this.selectedControlId = id;
            this.lastSelectedAt = Date.now();
            const found = this.findControlById(id);
            this.selectedControl = found ? this.normalizeControl(found.control) : null;
            this.validateSelected();
        },

        clearSelection() {
            this.selectedControlId = null;
            this.selectedControl = null;
            this.lastSelectedAt = 0;
            this.validationErrors = [];
        },

        updateCanvasControl(controlId, mutator) {
            const found = this.findControlById(controlId);
            if (!found) {
                return;
            }

            const source = found.control || {};
            const draft = {
                ...source,
                options: Array.isArray(source.options) ? source.options.map((o) => ({ ...o })) : [],
                tableColumns: Array.isArray(source.tableColumns) ? source.tableColumns.map((col) => ({ ...col })) : [],
                children: Array.isArray(source.children) ? source.children.map((child) => ({ ...child })) : []
            };

            mutator(draft);
            const normalized = this.normalizeControl(draft);
            found.list[found.index] = normalized;

            if (this.selectedControlId === controlId) {
                this.selectedControl = {
                    ...normalized,
                    options: Array.isArray(normalized.options) ? normalized.options.map((o) => ({ ...o })) : [],
                    tableColumns: Array.isArray(normalized.tableColumns) ? normalized.tableColumns.map((col) => ({ ...col })) : []
                };
                this.validateSelected();
            }
        },

        onCanvasLabelChanged(controlId, value) {
            this.updateCanvasControl(controlId, (control) => {
                control.label = value;
                if (!control.nameManual) {
                    control.name = this.toIdentifier(value);
                }
            });
        },

        onCanvasImageAltChanged(controlId, value) {
            this.updateCanvasControl(controlId, (control) => {
                control.altText = value;
            });
        },

        onCanvasUploadAcceptChanged(controlId, value) {
            this.updateCanvasControl(controlId, (control) => {
                control.uploadAccept = value;
            });
        },

        onCanvasUploadMaxBytesChanged(controlId, value) {
            this.updateCanvasControl(controlId, (control) => {
                const parsed = Number(value) || 0;
                control.uploadMaxBytes = parsed < 0 ? 0 : parsed;
            });
        },

        async uploadImageAsset(event) {
            if (!this.selectedControl || this.selectedControl.widget !== 'image') {
                return;
            }

            const input = event && event.target ? event.target : null;
            const file = input && input.files && input.files[0] ? input.files[0] : null;
            if (!file) {
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            if (this.selectedControl.assetKey) {
                formData.append('assetKey', this.selectedControl.assetKey);
            }
            formData.append('createdBy', 'designer');

                const tenantId = (window.yalcapTenantId || '').toString().trim();
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

        onCanvasTableColumnTitleChanged(controlId, columnIndex, value) {
            this.updateCanvasControl(controlId, (control) => {
                if (!Array.isArray(control.tableColumns) || !control.tableColumns[columnIndex]) {
                    return;
                }
                control.tableColumns[columnIndex].title = value;
            });
        },

        onCanvasTableColumnTypeChanged(controlId, columnIndex, value) {
            this.updateCanvasControl(controlId, (control) => {
                if (!Array.isArray(control.tableColumns) || !control.tableColumns[columnIndex]) {
                    return;
                }
                control.tableColumns[columnIndex].type = value;
            });
        },

        addTableColumnOnCanvas(controlId) {
            this.updateCanvasControl(controlId, (control) => {
                if (!Array.isArray(control.tableColumns)) {
                    control.tableColumns = [];
                }

                const existingKeys = new Set(control.tableColumns.map((col) => col.key));
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

        removeLastTableColumnOnCanvas(controlId) {
            this.updateCanvasControl(controlId, (control) => {
                if (!Array.isArray(control.tableColumns) || control.tableColumns.length <= 1) {
                    return;
                }
                control.tableColumns.pop();
            });
        },

        startResize(controlId, event) {
            const found = this.findControlById(controlId);
            if (!found) {
                return;
            }

            if (event && event.button !== 0) {
                return;
            }

            this.stopResize();

            this.resizingControlId = controlId;
            this.resizeStartX = event.clientX;
            this.resizeStartSpan = Number(found.control.colSpan) || 12;

            this.resizeMoveHandler = (moveEvent) => this.onResizeMove(moveEvent);
            this.resizeUpHandler = () => this.stopResize();
            this.resizeCancelHandler = () => this.stopResize();
            this.resizeKeyHandler = (keyEvent) => {
                if (keyEvent.key === 'Escape') {
                    this.stopResize();
                }
            };
            this.resizeVisibilityHandler = () => {
                if (document.hidden) {
                    this.stopResize();
                }
            };

            window.addEventListener('mousemove', this.resizeMoveHandler, true);
            window.addEventListener('mouseup', this.resizeUpHandler, true);
            window.addEventListener('blur', this.resizeCancelHandler);
            window.addEventListener('keydown', this.resizeKeyHandler, true);
            document.addEventListener('visibilitychange', this.resizeVisibilityHandler);
            document.body.classList.add('is-resizing');
        },

        onResizeMove(event) {
            if (!this.resizingControlId) {
                return;
            }

            if (event.buttons === 0) {
                this.stopResize();
                return;
            }

            const canvas = this.$root ? this.$root.querySelector('.canvas') : null;
            if (!canvas) {
                return;
            }

            const colWidth = canvas.clientWidth / 12;
            if (!colWidth || Number.isNaN(colWidth)) {
                return;
            }

            const deltaX = event.clientX - this.resizeStartX;
            const deltaCols = Math.round(deltaX / colWidth);
            let nextSpan = this.resizeStartSpan + deltaCols;
            if (nextSpan < 1) {
                nextSpan = 1;
            }
            if (nextSpan > 12) {
                nextSpan = 12;
            }

            this.updateCanvasControl(this.resizingControlId, (control) => {
                control.colSpan = nextSpan;
            });
        },

        stopResize() {
            if (this.resizeMoveHandler) {
                window.removeEventListener('mousemove', this.resizeMoveHandler, true);
            }
            if (this.resizeUpHandler) {
                window.removeEventListener('mouseup', this.resizeUpHandler, true);
            }
            if (this.resizeCancelHandler) {
                window.removeEventListener('blur', this.resizeCancelHandler);
            }
            if (this.resizeKeyHandler) {
                window.removeEventListener('keydown', this.resizeKeyHandler, true);
            }
            if (this.resizeVisibilityHandler) {
                document.removeEventListener('visibilitychange', this.resizeVisibilityHandler);
            }

            this.resizingControlId = null;
            this.resizeMoveHandler = null;
            this.resizeUpHandler = null;
            this.resizeCancelHandler = null;
            this.resizeKeyHandler = null;
            this.resizeVisibilityHandler = null;
            document.body.classList.remove('is-resizing');
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
            const found = this.findControlById(this.selectedControlId);
            if (!found) {
                return;
            }

            found.list[found.index] = {
                ...this.selectedControl,
                options: [...(this.selectedControl.options || [])],
                tableColumns: [...(this.selectedControl.tableColumns || [])],
                children: [...(this.selectedControl.children || [])]
            };
            this.validateSelected();
        },

        validateSelected() {
            this.validationErrors = this.selectedControl ? this.validateControl(this.selectedControl) : [];
        },

        removeControl(id, event) {
            if (!event || !event.target || !event.target.closest || !event.target.closest('.remove-control-btn')) {
                return;
            }

            if (this.selectedControlId === id && (Date.now() - this.lastSelectedAt) < 300) {
                return;
            }

            if (!window.confirm('Remove this control from the canvas?')) {
                return;
            }

            const found = this.findControlById(id);
            if (found) {
                found.list.splice(found.index, 1);
            }
            if (this.selectedControlId === id) {
                this.selectedControlId = null;
                this.selectedControl = null;
            }
        }
    };
}

window.formDesigner = formDesigner;
