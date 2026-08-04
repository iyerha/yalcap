// Runtime module type definitions


(function() {
    const windowAny = window as any;

/**
 * Register a workflow step hook for a specific step type
 */
windowAny.registerWorkflowStepHook = function registerWorkflowStepHook(type: string, hook: WorkflowStepHook): void {
    const key = String(type || '').trim().toLowerCase();
    if (!key || !hook || typeof hook !== 'object') {
        return;
    }

    if (!windowAny.workflowStepHooks || typeof windowAny.workflowStepHooks !== 'object') {
        windowAny.workflowStepHooks = {};
    }

    const existing = windowAny.workflowStepHooks[key] || {};
    windowAny.workflowStepHooks[key] = Object.assign({}, existing, hook);
};

/**
 * Factory function to create a workflow designer instance
 */
function workflowDesigner(): WorkflowDesigner {
    const designer: WorkflowDesigner = {
        definitionKey: 'example-review',
        workflowTitle: '',
        stepTypes: [],
        steps: [],
        selectedNodeId: null,
        definitionJson: '',
        runtimePreviewHtml: '',
        runtimePreviewError: '',
        runtimePreviewLoading: false,
        publishMessage: '',
        publishError: false,
        editor: null,
        paletteCollapsed: false,
        propertiesCollapsed: false,
        draggedPaletteType: null,
        armedPaletteType: null,
        pendingPaletteInsert: null,
        canvasElement: null,
        canvasCardElement: null,
        pointerDragState: null,
        useFallbackCanvas: false,
        canvasInteractionsBound: false,
        isHydratingGraph: false,

        /**
         * Get the hook object for a step type
         */
        getStepHook(type: string): WorkflowStepHook | null {
            const key = String(type || '').trim().toLowerCase();
            if (!key) {
                return null;
            }

            const hooks = windowAny.workflowStepHooks || {};
            const hook = hooks[key];
            return hook && typeof hook === 'object' ? hook : null;
        },

        /**
         * Invoke a hook callback for a step type
         */
        invokeStepHook(type: string, eventName: string, payload?: any): void {
            const hook = this.getStepHook(type);
            if (!hook) {
                return;
            }

            const callback = hook[eventName] as any;
            if (typeof callback !== 'function') {
                return;
            }

            try {
                callback(Object.assign({ designer: this }, payload || {}));
            } catch (error) {
                console.warn('Workflow step hook failed for', type, eventName, error);
            }
        },

        /**
         * Initialize workflow designer from page state
         */
        init(): void {
            this.definitionKey = windowAny.workflowDesignerInitialKey || this.definitionKey;
            this.stepTypes = Array.isArray(windowAny.workflowDesignerStepTypes) ? windowAny.workflowDesignerStepTypes : [];
            if (!this.stepTypes.length) {
                this.stepTypes = [{
                    type: 'form',
                    displayName: 'Form Step',
                    outputCount: 1,
                    configSchema: { type: 'object', properties: {} },
                    defaultConfig: {}
                }];
            }
            const initial = windowAny.workflowDesignerInitialDefinition;
            this.workflowTitle = initial && initial.title ? String(initial.title).trim() : '';
            if (initial && Array.isArray(initial.steps) && initial.steps.length > 0) {
                this.steps = initial.steps.map((s: any, idx: number) => this.normalizeStep(s, idx));
            } else {
                this.steps = [this.normalizeStep({ type: this.stepTypes[0].type }, 1)];
            }
            this.refreshSelectedStepView();
            this.bindPublishForm();
            this.bindPaletteDragSources();
            this.ensureCanvasInteractions();
            this.initEditorWhenReady(0);
            this.generate();
            this.refreshRuntimePreview();
        },

        /**
         * Refresh the runtime preview of the workflow
         */
        async refreshRuntimePreview(): Promise<void> {
            this.generate();
            this.runtimePreviewLoading = true;
            this.runtimePreviewError = '';

            try {
                const definitionKey = String(this.definitionKey || '').trim();
                if (!definitionKey) {
                    throw new Error('Definition key is required.');
                }
                
                const tenantId = windowAny.tenantId;
                const response = await fetch('/api/definitions/' + encodeURIComponent(definitionKey) + '/resolved/html', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Tenant-Id': tenantId || ''
                    },
                    body: JSON.stringify({ formInitialization: true })
                });

                const html = await response.text();
                if (!response.ok) {
                    throw new Error('Preview failed with status ' + response.status);
                }

                await this.loadRuntimeAssetsFromPreviewHtml(html);
                this.runtimePreviewHtml = html;
                windowAny.setTimeout(() => {
                    const autocompleteRuntime = windowAny.runtimeAutocomplete || windowAny.autocompleteRuntime;
                    if (autocompleteRuntime && typeof autocompleteRuntime.bindAll === 'function') {
                        autocompleteRuntime.bindAll();
                    }

                    if (windowAny.runtimeSections && typeof windowAny.runtimeSections.bindAll === 'function') {
                        windowAny.runtimeSections.bindAll();
                    }

                    if (windowAny.runtimeRepeats && typeof windowAny.runtimeRepeats.bindAll === 'function') {
                        windowAny.runtimeRepeats.bindAll();
                    }
                }, 0);
            } catch (error) {
                this.runtimePreviewHtml = '';
                this.runtimePreviewError = error instanceof Error ? error.message : String(error);
            } finally {
                this.runtimePreviewLoading = false;
            }
        },

        /**
         * Parse a comma-separated list of runtime assets
         */
        parseRuntimeAssetList(raw: string): string[] {
            return String(raw || '')
                .split(',')
                .map((item: string) => String(item || '').trim())
                .filter(Boolean);
        },

        /**
         * Normalize an asset path to absolute URL
         */
        normalizeAssetUrl(assetPath: string): string {
            try {
                return new URL(String(assetPath || '').trim(), windowAny.location.origin).href;
            } catch (_) {
                return '';
            }
        },

        /**
         * Ensure a CSS asset is loaded
         */
        ensureRuntimeCssAsset(assetPath: string): void {
            const normalized = this.normalizeAssetUrl(assetPath);
            if (!normalized) {
                return;
            }

            const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
            const alreadyLoaded = links.some((link) => link.href === normalized);
            if (alreadyLoaded) {
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = normalized;
            link.setAttribute('data-runtime-asset', 'css');
            document.head.appendChild(link);
        },

        /**
         * Ensure a JavaScript asset is loaded
         */
        ensureRuntimeJsAsset(assetPath: string): Promise<void> {
            const normalized = this.normalizeAssetUrl(assetPath);
            if (!normalized) {
                return Promise.resolve();
            }

            const existing = Array.from(document.querySelectorAll('script[src]')).find((script: Element) => {
                return (script as HTMLScriptElement).src === normalized;
            }) as HTMLScriptElement | undefined;

            if (existing) {
                if (existing.dataset && existing.dataset.loaded === 'true') {
                    return Promise.resolve();
                }
                return new Promise((resolve) => {
                    if (existing.dataset && existing.dataset.loading === 'true') {
                        existing.addEventListener('load', () => resolve(), { once: true });
                        existing.addEventListener('error', () => resolve(), { once: true });
                        return;
                    }
                    resolve();
                });
            }

            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = normalized;
                script.defer = true;
                script.dataset.runtimeAsset = 'js';
                script.dataset.loading = 'true';
                script.addEventListener('load', () => {
                    script.dataset.loading = 'false';
                    script.dataset.loaded = 'true';
                    resolve();
                }, { once: true });
                script.addEventListener('error', () => {
                    script.dataset.loading = 'false';
                    resolve();
                }, { once: true });
                document.head.appendChild(script);
            });
        },

        /**
         * Load runtime assets referenced in preview HTML
         */
        async loadRuntimeAssetsFromPreviewHtml(html: string): Promise<void> {
            const documentFragment = new DOMParser().parseFromString(String(html || ''), 'text/html');
            const host = documentFragment.querySelector('[data-runtime-js-assets], [data-runtime-css-assets]');
            if (!host) {
                return;
            }

            const cssAssets = this.parseRuntimeAssetList(host.getAttribute('data-runtime-css-assets') || '');
            const jsAssets = this.parseRuntimeAssetList(host.getAttribute('data-runtime-js-assets') || '');

            cssAssets.forEach((asset: string) => this.ensureRuntimeCssAsset(asset));
            if (jsAssets.length > 0) {
                await Promise.all(jsAssets.map((asset: string) => this.ensureRuntimeJsAsset(asset)));
            }
        },

        /**
         * Bind form submit handler for publishing workflow
         */
        bindPublishForm(): void {
            const form = document.querySelector('form[action], .json-card form') as HTMLFormElement | null;
            if (!form || form.dataset.workflowPublishBound === 'true') {
                return;
            }

            form.dataset.workflowPublishBound = 'true';
            form.addEventListener('submit', async (event: Event) => {
                event.preventDefault();
                this.generate();

                const formData = new FormData(form);
                formData.set('definitionKey', this.definitionKey || '');
                formData.set('definition', this.definitionJson || '');

                try {
                    const response = await fetch(form.action, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    const responseText = await response.text();
                    const documentFragment = new DOMParser().parseFromString(responseText, 'text/html');
                    const strongMessages = Array.from(documentFragment.querySelectorAll('strong'))
                        .map((element) => String(element.textContent || '').trim())
                        .filter(Boolean);
                    const errorText = strongMessages.find((message) => message !== 'Published successfully.');

                    if (!response.ok) {
                        throw new Error(errorText || ('Publish failed with status ' + response.status));
                    }

                    this.publishError = Boolean(errorText);
                    this.publishMessage = errorText || 'Published workflow successfully.';
                    this.refreshRuntimePreview();
                } catch (error) {
                    this.publishError = true;
                    this.publishMessage = error instanceof Error ? error.message : String(error);
                }
            });
        },

        // Placeholder methods - implemented by mixins
        generate(): void {},
        normalizeStep(step: any, index: number): WorkflowStep { return { nodeId: '' }; },
        refreshSelectedStepView(): void {},
        bindPaletteDragSources(): void {},
        ensureCanvasInteractions(): void {},
        initEditorWhenReady(attempt: number): void {}
    };

    // Apply mixins
    if (windowAny.workflowDesignerPaletteMixin) {
        windowAny.workflowDesignerPaletteMixin(designer);
    }
    if (windowAny.workflowDesignerPropertiesMixin) {
        windowAny.workflowDesignerPropertiesMixin(designer);
    }
    if (windowAny.workflowDesignerSchemaMixin) {
        windowAny.workflowDesignerSchemaMixin(designer);
    }
    if (windowAny.workflowDesignerCanvasMixin) {
        windowAny.workflowDesignerCanvasMixin(designer);
    }
    if (windowAny.workflowDesignerIndexConfigMixin) {
        windowAny.workflowDesignerIndexConfigMixin(designer);
    }

    return designer;
}

// Export to global scope
windowAny.workflowDesigner = workflowDesigner;
})();
