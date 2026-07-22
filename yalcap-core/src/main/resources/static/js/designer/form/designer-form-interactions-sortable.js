// @ts-check
(function () {
    const windowAny = /** @type {any} */ (window);

    const sortableInteractionsApi = /** @type {Record<string, any>} */ ({
        initSortable() {
            if (!windowAny.Sortable || !this.$root) {
                return;
            }

            const paletteList = this.$root.querySelector('.palette-list');
            const canvas = this.$root.querySelector('.canvas');
            if (!paletteList || !canvas) {
                return;
            }

            if (!this.paletteSortable) {
                this.paletteSortable = windowAny.Sortable.create(paletteList, {
                    group: { name: 'designer-controls', pull: 'clone', put: false },
                    sort: false,
                    animation: 120,
                    ghostClass: 'sortable-ghost',
                    chosenClass: 'sortable-chosen',
                    onClone: (/** @type {any} */ evt) => this.preparePaletteClone(evt)
                });
            }

            if (!this.canvasSortable) {
                this.canvasSortable = windowAny.Sortable.create(canvas, {
                    group: { name: 'designer-controls', pull: true, put: true },
                    animation: 140,
                    draggable: '.canvas-item',
                    ghostClass: 'sortable-ghost',
                    chosenClass: 'sortable-chosen',
                    fallbackTolerance: 6,
                    swapThreshold: 0.65,
                    invertSwap: true,
                    invertedSwapThreshold: 0.25,
                    filter: 'input, textarea, select, button, option, label, .remove-control-btn',
                    preventOnFilter: false,
                    onAdd: (/** @type {any} */ evt) => this.handleSortableAdd(evt, '__root__'),
                    onUpdate: (/** @type {any} */ evt) => this.handleSortableReorder(evt, '__root__')
                });
            }

            this.setupNestedSortables();
            this.initDesignerWidgets();

            if (!this.sortableObserver) {
                this.sortableObserver = new MutationObserver(() => {
                    this.setupNestedSortables();
                    this.initDesignerWidgets();
                });
                this.sortableObserver.observe(canvas, { childList: true, subtree: true });
            }

            if (!this.sortableCleanupBound) {
                this.sortableCleanupBound = () => this.destroySortable();
                window.addEventListener('pagehide', this.sortableCleanupBound);
                window.addEventListener('beforeunload', this.sortableCleanupBound);
            }
        },

        destroySortable() {
            this.destroyDesignerWidgets();

            if (this.paletteSortable && this.paletteSortable.destroy) {
                this.paletteSortable.destroy();
            }
            this.paletteSortable = null;

            if (this.canvasSortable && this.canvasSortable.destroy) {
                this.canvasSortable.destroy();
            }
            this.canvasSortable = null;

            if (this.nestedSortables) {
                this.nestedSortables.forEach((/** @type {any} */ sortable) => {
                    if (sortable && sortable.destroy) {
                        sortable.destroy();
                    }
                });
                this.nestedSortables.clear();
            }

            if (this.sortableObserver) {
                this.sortableObserver.disconnect();
                this.sortableObserver = null;
            }

            if (this.sortableCleanupBound) {
                window.removeEventListener('pagehide', this.sortableCleanupBound);
                window.removeEventListener('beforeunload', this.sortableCleanupBound);
                this.sortableCleanupBound = null;
            }
        },

        setupNestedSortables() {
            if (!windowAny.Sortable || !this.$root) {
                return;
            }

            if (!this.nestedSortables) {
                this.nestedSortables = new Map();
            }

            const seenSources = new Set();
            const nestedZones = this.$root.querySelectorAll('.nested-dropzone[data-sortable-source]');
            nestedZones.forEach((/** @type {any} */ zone) => {
                const sourceId = (zone.dataset.sortableSource || '').trim();
                if (!sourceId) {
                    return;
                }

                seenSources.add(sourceId);
                if (this.nestedSortables.has(sourceId)) {
                    return;
                }

                const sortable = windowAny.Sortable.create(zone, {
                    group: { name: 'designer-controls', pull: true, put: true },
                    animation: 140,
                    draggable: '.nested-runtime-control',
                    ghostClass: 'sortable-ghost',
                    chosenClass: 'sortable-chosen',
                    fallbackTolerance: 6,
                    swapThreshold: 0.65,
                    invertSwap: true,
                    invertedSwapThreshold: 0.25,
                    filter: 'input, textarea, select, button, option, label, .remove-control-btn',
                    preventOnFilter: false,
                    onAdd: (/** @type {any} */ evt) => this.handleSortableAdd(evt, sourceId),
                    onUpdate: (/** @type {any} */ evt) => this.handleSortableReorder(evt, sourceId)
                });

                this.nestedSortables.set(sourceId, sortable);
            });

            this.nestedSortables.forEach((/** @type {any} */ sortable, /** @type {string} */ sourceId) => {
                if (seenSources.has(sourceId)) {
                    return;
                }
                sortable.destroy();
                this.nestedSortables.delete(sourceId);
            });
        },

        /** @param {any} evt @param {string} targetSourceId */
        handleSortableAdd(evt, targetSourceId) {
            if (!evt || !evt.item) {
                return;
            }

            const rawIndex = Number(evt.newIndex);
            const paletteIndex = Number(evt.item.dataset.paletteIndex);
            if (!Number.isNaN(paletteIndex)) {
                const created = this.createControlFromPalette(paletteIndex);
                if (!created) {
                    return;
                }

                if (!this.canInsertIntoSource(targetSourceId, created)) {
                    this.flashInvalidDrop(evt.to);
                    if (evt.item.parentNode) {
                        evt.item.parentNode.removeChild(evt.item);
                    }
                    this.syncSortableDom();
                    return;
                }

                if (!this.insertControlIntoSource(targetSourceId, created, rawIndex)) {
                    if (targetSourceId === '__root__') {
                        this.controls.push(created);
                    } else {
                        this.flashInvalidDrop(evt.to);
                        if (evt.item.parentNode) {
                            evt.item.parentNode.removeChild(evt.item);
                        }
                        this.syncSortableDom();
                        return;
                    }
                }

                if (evt.item.parentNode) {
                    evt.item.parentNode.removeChild(evt.item);
                }

                this.clearSelection();
                this.syncSortableDom();
                return;
            }

            const controlId = (evt.item.dataset.controlId || '').trim();
            if (!controlId) {
                return;
            }

            if (targetSourceId !== '__root__' && (controlId === targetSourceId || this.isDescendantId(controlId, targetSourceId))) {
                this.flashInvalidDrop(evt.to);
                this.syncSortableDom();
                return;
            }

            const movingRef = this.findControlByLocalId(controlId);
            if (!movingRef || !this.canInsertIntoSource(targetSourceId, movingRef.control, controlId)) {
                this.flashInvalidDrop(evt.to);
                this.syncSortableDom();
                return;
            }

            const moved = this.detachControl(controlId);
            if (!moved) {
                this.flashInvalidDrop(evt.to);
                this.syncSortableDom();
                return;
            }

            if (!this.insertControlIntoSource(targetSourceId, moved, rawIndex)) {
                if (targetSourceId === '__root__') {
                    this.controls.push(moved);
                } else {
                    this.flashInvalidDrop(evt.to);
                    this.syncSortableDom();
                    return;
                }
            }

            this.clearSelection();
            this.syncSortableDom();
        },

        /** @param {any} evt @param {string} sourceId */
        handleSortableReorder(evt, sourceId) {
            if (!evt || evt.from !== evt.to) {
                return;
            }

            const list = this.getControlListBySource(sourceId);
            if (!list) {
                return;
            }

            const oldIndex = Number(evt.oldIndex);
            const newIndex = Number(evt.newIndex);
            if (!Number.isInteger(oldIndex) || !Number.isInteger(newIndex) || oldIndex === newIndex) {
                return;
            }

            if (oldIndex < 0 || oldIndex >= list.length || newIndex < 0 || newIndex >= list.length) {
                return;
            }

            const [moved] = list.splice(oldIndex, 1);
            list.splice(newIndex, 0, moved);
            this.clearSelection();
        },

        /** @param {string} sourceId */
        getControlListBySource(sourceId) {
            if (sourceId === '__root__') {
                return this.controls;
            }

            const containerRef = this.findControlByLocalId(sourceId);
            if (!containerRef || !this.isContainerWidget(containerRef.control.widget)) {
                return null;
            }

            if (!Array.isArray(containerRef.control.children)) {
                containerRef.control.children = [];
            }

            return containerRef.control.children;
        },

        /** @param {string} sourceId @param {any} control @param {number} index */
        insertControlIntoSource(sourceId, control, index) {
            const list = this.getControlListBySource(sourceId);
            if (!list) {
                return false;
            }

            if (!this.canInsertIntoSource(sourceId, control)) {
                return false;
            }

            const targetIndex = Number.isInteger(index)
                ? Math.max(0, Math.min(index, list.length))
                : list.length;

            list.splice(targetIndex, 0, control);
            return true;
        },

        /** @param {string} widget */
        getControlDesignerHooks(widget) {
            const key = String(widget || '').trim().toLowerCase();
            if (!key) {
                return null;
            }

            const registry = windowAny.designerControlHooks;
            if (!registry || typeof registry !== 'object') {
                return null;
            }

            return registry[key] || null;
        },

        /** @param {string} sourceId @param {any} control @param {string=} controlId */
        canInsertIntoSource(sourceId, control, controlId = '') {
            if (sourceId === '__root__') {
                return true;
            }

            const containerRef = this.findControlByLocalId(sourceId);
            if (!containerRef || !containerRef.control) {
                return false;
            }

            const containerWidget = String(containerRef.control.widget || '').trim();
            const hooks = this.getControlDesignerHooks(containerWidget);
            if (!hooks || typeof hooks.canInsertIntoSource !== 'function') {
                return true;
            }

            return hooks.canInsertIntoSource({
                sourceId,
                control,
                controlId,
                container: containerRef.control
            }) !== false;
        },

        syncSortableDom() {
            this.recomputeDerivedStateKeys();
            this.controls = [...this.controls];
            this.$nextTick(() => {
                this.setupNestedSortables();
                this.initDesignerWidgets();
            });
        },

        /** @param {any} evt */
        preparePaletteClone(evt) {
            if (!evt || !evt.clone) {
                return;
            }

            const clone = evt.clone;
            clone.setAttribute('x-ignore', '');
            this.stripAlpineAttrs(clone);
        },

        /** @param {Element} root */
        stripAlpineAttrs(root) {
            if (!root || !root.querySelectorAll) {
                return;
            }

            const nodes = [root, ...root.querySelectorAll('*')];
            nodes.forEach((node) => {
                const attrs = Array.from(node.attributes || []);
                attrs.forEach((attr) => {
                    const name = String(attr.name || '');
                    if (name.startsWith('x-') || name.startsWith(':') || name.startsWith('@')) {
                        node.removeAttribute(name);
                    }
                });
            });
        },

        initDesignerWidgets() {
            if (!this.$root) {
                return;
            }

            if (!this.flatpickrInstances) {
                this.flatpickrInstances = new Map();
            }
            if (!this.tomSelectInstances) {
                this.tomSelectInstances = new Map();
            }

            this.flatpickrInstances.forEach((/** @type {any} */ instance, /** @type {any} */ element) => {
                if (this.$root.contains(element)) {
                    return;
                }
                if (instance && instance.destroy) {
                    instance.destroy();
                }
                this.flatpickrInstances.delete(element);
            });

            this.tomSelectInstances.forEach((/** @type {any} */ instance, /** @type {any} */ element) => {
                if (this.$root.contains(element)) {
                    return;
                }
                if (instance && instance.destroy) {
                    instance.destroy();
                }
                this.tomSelectInstances.delete(element);
            });

            if (windowAny.flatpickr) {
                const inputs = this.$root.querySelectorAll('input[data-flatpickr]');
                inputs.forEach((input) => {
                    if (this.flatpickrInstances.has(input)) {
                        return;
                    }

                    const mode = input.dataset.flatpickr || 'date';
                    const controlId = (input.dataset.controlId || '').trim();
                    const instance = windowAny.flatpickr(input, {
                        enableTime: mode === 'datetime',
                        noCalendar: false,
                        dateFormat: mode === 'datetime' ? 'Y-m-d\\TH:i' : 'Y-m-d',
                        allowInput: true,
                        time_24hr: true,
                        minDate: mode === 'datetime' ? (input.dataset.minDateTime || null) : (input.dataset.minDate || null),
                        maxDate: mode === 'datetime' ? (input.dataset.maxDateTime || null) : (input.dataset.maxDate || null),
                        defaultDate: input.value || null,
                        onChange: (selectedDates, dateStr) => {
                            if (controlId) {
                                this.onCanvasDefaultTextChanged(controlId, dateStr || '');
                            }
                        }
                    });

                    this.flatpickrInstances.set(input, instance);
                });
            }

            if (windowAny.TomSelect) {
                const selects = this.$root.querySelectorAll('select[data-tom-select]');
                selects.forEach((select) => {
                    if (this.tomSelectInstances.has(select)) {
                        return;
                    }

                    const controlId = (select.dataset.controlId || '').trim();
                    const sourceType = (select.dataset.sourceType || 'static').trim() || 'static';
                    const sourceUrl = (select.dataset.sourceUrl || '').trim();
                    const labelField = (select.dataset.labelField || 'label').trim() || 'label';
                    const valueField = (select.dataset.valueField || 'value').trim() || 'value';
                    const searchParam = (select.dataset.searchParam || 'q').trim() || 'q';
                    const instance = new windowAny.TomSelect(select, {
                        create: false,
                        allowEmptyOption: true,
                        maxOptions: null,
                        searchField: ['text'],
                        preload: sourceType === 'remote' ? false : 'focus',
                        load: sourceType === 'remote'
                            ? (query, callback) => {
                                const targetUrl = sourceUrl ? new URL(sourceUrl, window.location.origin) : null;
                                if (!targetUrl) {
                                    callback();
                                    return;
                                }

                                targetUrl.searchParams.set(searchParam, query || '');
                                fetch(targetUrl.toString(), {
                                    headers: { Accept: 'application/json' }
                                })
                                    .then((response) => response.ok ? response.json() : [])
                                    .then((payload) => {
                                        const records = Array.isArray(payload)
                                            ? payload
                                            : (Array.isArray(payload?.items) ? payload.items : []);
                                        callback(records.map((record) => ({
                                            text: String(record?.[labelField] ?? record?.label ?? record?.[valueField] ?? ''),
                                            value: String(record?.[valueField] ?? record?.value ?? '')
                                        })));
                                    })
                                    .catch(() => callback());
                            }
                            : undefined,
                        onChange: (value) => {
                            if (controlId) {
                                this.onCanvasDefaultTextChanged(controlId, Array.isArray(value) ? (value[0] || '') : (value || ''));
                            }
                        }
                    });

                    this.tomSelectInstances.set(select, instance);
                });
            }
        },

        destroyDesignerWidgets() {
            if (this.flatpickrInstances) {
                this.flatpickrInstances.forEach((instance) => {
                    if (instance && instance.destroy) {
                        instance.destroy();
                    }
                });
                this.flatpickrInstances.clear();
            }

            if (this.tomSelectInstances) {
                this.tomSelectInstances.forEach((instance) => {
                    if (instance && instance.destroy) {
                        instance.destroy();
                    }
                });
                this.tomSelectInstances.clear();
            }
        },

        flashInvalidDrop(element) {
            if (!element || !element.classList) {
                return;
            }

            element.classList.remove('invalid-drop-flash');
            void element.offsetWidth;
            element.classList.add('invalid-drop-flash');

            window.setTimeout(() => {
                element.classList.remove('invalid-drop-flash');
            }, 280);
        }
    });

    windowAny.formDesignerInteractionsSortable = sortableInteractionsApi;
})();
