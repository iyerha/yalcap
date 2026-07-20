function workflowDesigner() {
    const designer = {
        definitionKey: 'example-review',
        steps: [],
        selectedNodeId: null,
        definitionJson: '',
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

        init() {
            this.definitionKey = window.workflowDesignerInitialKey || this.definitionKey;
            const initial = window.workflowDesignerInitialDefinition;
            if (initial && Array.isArray(initial.steps) && initial.steps.length > 0) {
                this.steps = initial.steps.map((s, idx) => this.normalizeStep(s, idx));
            } else {
                this.steps = [this.normalizeStep({ type: 'form' }, 1)];
            }
            this.refreshSelectedStepView();
            this.bindPublishForm();
            this.bindPaletteDragSources();
            this.ensureCanvasInteractions();
            this.initEditorWhenReady(0);
            this.generate();
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
