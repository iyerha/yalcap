window.workflowDesignerPaletteMixin = function workflowDesignerPaletteMixin(target) {
    Object.assign(target, {
        bindPaletteDragSources() {
            const sources = document.querySelectorAll('.palette-item[data-step-type]');
            sources.forEach((element) => {
                if (element.dataset.dragBound === 'true') {
                    return;
                }
                element.dataset.dragBound = 'true';

                element.addEventListener('pointerdown', (event) => {
                    if (event.button !== 0) {
                        return;
                    }
                    const type = (element.dataset.stepType || '').trim();
                    if (!type) {
                        return;
                    }
                    this.startPointerPaletteDrag(type, event);
                });

                element.addEventListener('click', () => {
                    if (!this.useFallbackCanvas) {
                        return;
                    }
                    this.armedPaletteType = (element.dataset.stepType || '').trim() || null;
                });
            });
        },

        togglePaletteCollapsed() {
            this.paletteCollapsed = !this.paletteCollapsed;
        }
    });
};