window.yalcapWorkflowStepHooks = window.yalcapWorkflowStepHooks || {};
window.yalcapRegisterWorkflowStepHook = function yalcapRegisterWorkflowStepHook(type, hook) {
    const key = String(type || '').trim().toLowerCase();
    if (!key || !hook || typeof hook !== 'object') {
        return;
    }

    const existing = window.yalcapWorkflowStepHooks[key] || {};
    window.yalcapWorkflowStepHooks[key] = Object.assign({}, existing, hook);
};

function workflowDesigner() {
    const designer = {
        definitionKey: 'example-review',
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

        getStepHook(type) {
            const key = String(type || '').trim().toLowerCase();
            if (!key) {
                return null;
            }

            const hooks = window.yalcapWorkflowStepHooks || {};
            const hook = hooks[key];
            return hook && typeof hook === 'object' ? hook : null;
        },

        invokeStepHook(type, eventName, payload) {
            const hook = this.getStepHook(type);
            if (!hook) {
                return;
            }

            const callback = hook[eventName];
            if (typeof callback !== 'function') {
                return;
            }

            try {
                callback(Object.assign({ designer: this }, payload || {}));
            } catch (error) {
                console.warn('Workflow step hook failed for', type, eventName, error);
            }
        },

        init() {
            this.definitionKey = window.workflowDesignerInitialKey || this.definitionKey;
            this.stepTypes = Array.isArray(window.workflowDesignerStepTypes) ? window.workflowDesignerStepTypes : [];
            if (!this.stepTypes.length) {
                this.stepTypes = [{
                    type: 'form',
                    displayName: 'Form Step',
                    outputCount: 1,
                    configSchema: { type: 'object', properties: {} },
                    defaultConfig: {}
                }];
            }
            const initial = window.workflowDesignerInitialDefinition;
            if (initial && Array.isArray(initial.steps) && initial.steps.length > 0) {
                this.steps = initial.steps.map((s, idx) => this.normalizeStep(s, idx));
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

        async refreshRuntimePreview() {
            this.generate();
            this.runtimePreviewLoading = true;
            this.runtimePreviewError = '';

            try {
                const definitionKey = String(this.definitionKey || '').trim();
                if (!definitionKey) {
                    throw new Error('Definition key is required.');
                }

                const response = await fetch('/api/definitions/' + encodeURIComponent(definitionKey) + '/resolved/html', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({ formInitialization: true })
                });

                const html = await response.text();
                if (!response.ok) {
                    throw new Error('Preview failed with status ' + response.status);
                }

                await this.loadRuntimeAssetsFromPreviewHtml(html);
                this.runtimePreviewHtml = html;
                window.setTimeout(function () {
                    var autocompleteRuntime = window.runtimeAutocomplete || window.autocompleteRuntime;
                    if (autocompleteRuntime && typeof autocompleteRuntime.bindAll === 'function') {
                        autocompleteRuntime.bindAll();
                    }

                    if (window.runtimeSections && typeof window.runtimeSections.bindAll === 'function') {
                        window.runtimeSections.bindAll();
                    }

                    if (window.runtimeRepeats && typeof window.runtimeRepeats.bindAll === 'function') {
                        window.runtimeRepeats.bindAll();
                    }
                }, 0);
            } catch (error) {
                this.runtimePreviewHtml = '';
                this.runtimePreviewError = error instanceof Error ? error.message : String(error);
            } finally {
                this.runtimePreviewLoading = false;
            }
        },

        parseRuntimeAssetList(raw) {
            return String(raw || '')
                .split(',')
                .map(function (item) { return String(item || '').trim(); })
                .filter(Boolean);
        },

        normalizeAssetUrl(assetPath) {
            try {
                return new URL(String(assetPath || '').trim(), window.location.origin).href;
            } catch (_) {
                return '';
            }
        },

        ensureRuntimeCssAsset(assetPath) {
            var normalized = this.normalizeAssetUrl(assetPath);
            if (!normalized) {
                return;
            }

            var links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            var alreadyLoaded = links.some(function (link) {
                return link.href === normalized;
            });
            if (alreadyLoaded) {
                return;
            }

            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = normalized;
            link.setAttribute('data-runtime-asset', 'css');
            document.head.appendChild(link);
        },

        ensureRuntimeJsAsset(assetPath) {
            var normalized = this.normalizeAssetUrl(assetPath);
            if (!normalized) {
                return Promise.resolve();
            }

            var existing = Array.from(document.querySelectorAll('script[src]')).find(function (script) {
                return script.src === normalized;
            });
            if (existing) {
                if (existing.dataset && existing.dataset.loaded === 'true') {
                    return Promise.resolve();
                }
                return new Promise(function (resolve) {
                    if (existing.dataset && existing.dataset.loading === 'true') {
                        existing.addEventListener('load', function () { resolve(); }, { once: true });
                        existing.addEventListener('error', function () { resolve(); }, { once: true });
                        return;
                    }
                    resolve();
                });
            }

            return new Promise(function (resolve) {
                var script = document.createElement('script');
                script.src = normalized;
                script.defer = true;
                script.dataset.runtimeAsset = 'js';
                script.dataset.loading = 'true';
                script.addEventListener('load', function () {
                    script.dataset.loading = 'false';
                    script.dataset.loaded = 'true';
                    resolve();
                }, { once: true });
                script.addEventListener('error', function () {
                    script.dataset.loading = 'false';
                    resolve();
                }, { once: true });
                document.head.appendChild(script);
            });
        },

        async loadRuntimeAssetsFromPreviewHtml(html) {
            var documentFragment = new DOMParser().parseFromString(String(html || ''), 'text/html');
            var host = documentFragment.querySelector('[data-runtime-js-assets], [data-runtime-css-assets]');
            if (!host) {
                return;
            }

            var cssAssets = this.parseRuntimeAssetList(host.getAttribute('data-runtime-css-assets'));
            var jsAssets = this.parseRuntimeAssetList(host.getAttribute('data-runtime-js-assets'));

            cssAssets.forEach((asset) => this.ensureRuntimeCssAsset(asset));
            if (jsAssets.length > 0) {
                await Promise.all(jsAssets.map((asset) => this.ensureRuntimeJsAsset(asset)));
            }
        },

        bindPublishForm() {
            const form = document.querySelector('form[action], .json-card form');
            if (!form || form.dataset.workflowPublishBound === 'true') {
                return;
            }

            form.dataset.workflowPublishBound = 'true';
            form.addEventListener('submit', async (event) => {
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
        }
    };

    if (window.workflowDesignerPaletteMixin) {
        window.workflowDesignerPaletteMixin(designer);
    }
    if (window.workflowDesignerPropertiesMixin) {
        window.workflowDesignerPropertiesMixin(designer);
    }
    if (window.workflowDesignerSchemaMixin) {
        window.workflowDesignerSchemaMixin(designer);
    }
    if (window.workflowDesignerCanvasMixin) {
        window.workflowDesignerCanvasMixin(designer);
    }

    return designer;
}

window.workflowDesigner = workflowDesigner;
