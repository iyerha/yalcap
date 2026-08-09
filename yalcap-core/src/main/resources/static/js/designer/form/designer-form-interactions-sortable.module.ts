interface SortableOptions {
    group?: any;
    sort?: boolean;
    animation?: number;
    ghostClass?: string;
    chosenClass?: string;
    draggable?: string;
    fallbackTolerance?: number;
    swapThreshold?: number;
    invertSwap?: boolean;
    invertedSwapThreshold?: number;
    filter?: string;
    preventOnFilter?: boolean;
    onClone?: (evt: any) => void;
    onAdd?: (evt: any) => void;
    onUpdate?: (evt: any) => void;
    load?: (query: string, callback: (items: any[]) => void) => void;
    preload?: boolean | string;
    create?: boolean;
    allowEmptyOption?: boolean;
    maxOptions?: number | null;
    searchField?: string[];
    maxItems?: number;
    onChange?: (value: any) => void;
}

interface SortableInstance {
    destroy(): void;
}

interface SortableEvent {
    item: HTMLElement;
    newIndex?: number;
    oldIndex?: number;
    from: HTMLElement;
    to: HTMLElement;
    clone?: HTMLElement;
}

interface FlatpickrInstance {
    destroy(): void;
}

interface TomSelectInstance {
    destroy(): void;
}

interface SortableInteractionsApi {
    paletteSortable: SortableInstance | null;
    canvasSortable: SortableInstance | null;
    nestedSortables: Map<string, SortableInstance> | null;
    sortableObserver: MutationObserver | null;
    sortableCleanupBound: (() => void) | null;
    flatpickrInstances: Map<HTMLElement, FlatpickrInstance> | null;
    tomSelectInstances: Map<HTMLElement, TomSelectInstance> | null;
    $root?: any;
    $nextTick?: (callback: () => void) => void;
    initSortable(): void;
    destroySortable(): void;
    setupNestedSortables(): void;
    handleSortableAdd(evt: SortableEvent, targetSourceId: string): void;
    handleSortableReorder(evt: SortableEvent, sourceId: string): void;
    getControlListBySource(sourceId: string): any[] | null;
    insertControlIntoSource(sourceId: string, control: any, index: number): boolean;
    getControlDesignerHooks(widget: string): any;
    canInsertIntoSource(sourceId: string, control: any, controlId?: string): boolean;
    syncSortableDom(): void;
    preparePaletteClone(evt: any): void;
    stripAlpineAttrs(root: Element | null): void;
    initDesignerWidgets(): void;
    destroyDesignerWidgets(): void;
    flashInvalidDrop(element: Element | null): void;
    [key: string]: any;
}

const windowAny = window as any;

const sortableInteractionsApi: SortableInteractionsApi = {
    paletteSortable: null,
    canvasSortable: null,
    nestedSortables: null,
    sortableObserver: null,
    sortableCleanupBound: null,
    flatpickrInstances: null,
    tomSelectInstances: null,

    initSortable(): void {
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
                onClone: (evt: any) => this.preparePaletteClone(evt)
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
                onAdd: (evt: any) => this.handleSortableAdd(evt, '__root__'),
                onUpdate: (evt: any) => this.handleSortableReorder(evt, '__root__')
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

    destroySortable(): void {
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
            this.nestedSortables.forEach((sortable: SortableInstance) => {
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

    setupNestedSortables(): void {
        if (!windowAny.Sortable || !this.$root) {
            return;
        }

        if (!this.nestedSortables) {
            this.nestedSortables = new Map();
        }

        const seenSources = new Set<string>();
        const nestedZones = this.$root.querySelectorAll('.nested-dropzone[data-sortable-source]');
        nestedZones.forEach((zone: Element) => {
            const sourceId = (zone.getAttribute('data-sortable-source') || '').trim();
            if (!sourceId) {
                return;
            }

            seenSources.add(sourceId);
            if (this.nestedSortables!.has(sourceId)) {
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
                onAdd: (evt: any) => this.handleSortableAdd(evt, sourceId),
                onUpdate: (evt: any) => this.handleSortableReorder(evt, sourceId)
            });

            this.nestedSortables.set(sourceId, sortable);
        });

        this.nestedSortables.forEach((sortable: SortableInstance, sourceId: string) => {
            if (seenSources.has(sourceId)) {
                return;
            }
            sortable.destroy();
            this.nestedSortables!.delete(sourceId);
        });
    },

    handleSortableAdd(evt: SortableEvent, targetSourceId: string): void {
        if (!evt || !evt.item) {
            return;
        }

        const rawIndex = Number(evt.newIndex);
        const paletteIndex = Number((evt.item as any).dataset.paletteIndex);
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

        const controlId = ((evt.item as any).dataset.controlId || '').trim();
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

    handleSortableReorder(evt: SortableEvent, sourceId: string): void {
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

    getControlListBySource(sourceId: string): any[] | null {
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

    insertControlIntoSource(sourceId: string, control: any, index: number): boolean {
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

    getControlDesignerHooks(widget: string): any {
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

    canInsertIntoSource(sourceId: string, control: any, controlId: string = ''): boolean {
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

    syncSortableDom(): void {
        this.recomputeDerivedStateKeys();
        this.controls = [...this.controls];
        if (this.$nextTick) {
            this.$nextTick(() => {
                this.setupNestedSortables();
                this.initDesignerWidgets();
            });
        }
    },

    preparePaletteClone(evt: any): void {
        if (!evt || !evt.clone) {
            return;
        }

        const clone = evt.clone as HTMLElement;
        clone.setAttribute('x-ignore', '');
        this.stripAlpineAttrs(clone);
    },

    stripAlpineAttrs(root: Element | null): void {
        if (!root || !root.querySelectorAll) {
            return;
        }

        const nodes: Element[] = [root, ...Array.from(root.querySelectorAll('*'))];
        nodes.forEach((node: Element) => {
            const attrs = Array.from(node.attributes || []);
            attrs.forEach((attr: Attr) => {
                const name = String(attr.name || '');
                if (name.startsWith('x-') || name.startsWith(':') || name.startsWith('@')) {
                    node.removeAttribute(name);
                }
            });
        });
    },

    initDesignerWidgets(): void {
        if (!this.$root) {
            return;
        }

        if (!this.flatpickrInstances) {
            this.flatpickrInstances = new Map();
        }
        if (!this.tomSelectInstances) {
            this.tomSelectInstances = new Map();
        }

        this.flatpickrInstances.forEach((instance: FlatpickrInstance, element: HTMLElement) => {
            if (this.$root.contains(element)) {
                return;
            }
            if (instance && instance.destroy) {
                instance.destroy();
            }
            this.flatpickrInstances!.delete(element);
        });

        this.tomSelectInstances.forEach((instance: TomSelectInstance, element: HTMLElement) => {
            if (this.$root.contains(element)) {
                return;
            }
            if (instance && instance.destroy) {
                instance.destroy();
            }
            this.tomSelectInstances!.delete(element);
        });

        if (windowAny.flatpickr) {
            const inputs = this.$root.querySelectorAll('input[data-flatpickr]');
            inputs.forEach((input: HTMLInputElement) => {
                if (this.flatpickrInstances!.has(input)) {
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
                    onChange: (selectedDates: Date[], dateStr: string) => {
                        if (controlId) {
                            this.onCanvasDefaultTextChanged(controlId, dateStr || '');
                        }
                    }
                });

                this.flatpickrInstances!.set(input, instance);
            });
        }

        if (windowAny.TomSelect) {
            const selects = this.$root.querySelectorAll('select[data-tom-select]');
            selects.forEach((select: HTMLSelectElement) => {
                if (this.tomSelectInstances!.has(select)) {
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
                        ? (query: string, callback: (items: any[]) => void) => {
                            const targetUrl = sourceUrl ? new URL(sourceUrl, window.location.origin) : null;
                            if (!targetUrl) {
                                callback([]);
                                return;
                            }

                            targetUrl.searchParams.set(searchParam, query || '');
                            fetch(targetUrl.toString(), {
                                headers: { Accept: 'application/json' }
                            })
                                .then((response: Response) => response.ok ? response.json() : [])
                                .then((payload: any) => {
                                    const records = Array.isArray(payload)
                                        ? payload
                                        : (Array.isArray(payload?.items) ? payload.items : []);
                                    callback(records.map((record: any) => ({
                                        text: String(record?.[labelField] ?? record?.label ?? record?.[valueField] ?? ''),
                                        value: String(record?.[valueField] ?? record?.value ?? '')
                                    })));
                                })
                                .catch(() => callback([]));
                        }
                        : undefined,
                    onChange: (value: any) => {
                        if (controlId) {
                            this.onCanvasDefaultTextChanged(controlId, Array.isArray(value) ? (value[0] || '') : (value || ''));
                        }
                    }
                });

                this.tomSelectInstances!.set(select, instance);
            });
        }
    },

    destroyDesignerWidgets(): void {
        if (this.flatpickrInstances) {
            this.flatpickrInstances.forEach((instance: FlatpickrInstance) => {
                if (instance && instance.destroy) {
                    instance.destroy();
                }
            });
            this.flatpickrInstances.clear();
        }

        if (this.tomSelectInstances) {
            this.tomSelectInstances.forEach((instance: TomSelectInstance) => {
                if (instance && instance.destroy) {
                    instance.destroy();
                }
            });
            this.tomSelectInstances.clear();
        }
    },

    flashInvalidDrop(element: Element | null): void {
        if (!element || !element.classList) {
            return;
        }

        element.classList.remove('invalid-drop-flash');
        void (element as HTMLElement).offsetWidth;
        element.classList.add('invalid-drop-flash');

        window.setTimeout(() => {
            element.classList.remove('invalid-drop-flash');
        }, 280);
    }
};

export const formDesignerInteractionsSortable = sortableInteractionsApi;