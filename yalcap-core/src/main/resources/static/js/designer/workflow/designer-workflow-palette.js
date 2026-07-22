window.workflowDesignerPaletteMixin = function workflowDesignerPaletteMixin(target) {
    Object.assign(target, {
        bindPaletteDragSources() {
            const paletteList = document.querySelector('.palette-list');
            if (!paletteList || paletteList.dataset.dragBound === 'true') {
                return;
            }

            paletteList.dataset.dragBound = 'true';

            paletteList.addEventListener('pointerdown', (event) => {
                const element = event.target && event.target.closest
                    ? event.target.closest('.palette-item[data-step-type]')
                    : null;
                if (!element || event.button !== 0) {
                    return;
                }

                const type = (element.dataset.stepType || '').trim();
                if (!type) {
                    return;
                }

                this.startPointerPaletteDrag(type, event);
            });

            paletteList.addEventListener('click', (event) => {
                const element = event.target && event.target.closest
                    ? event.target.closest('.palette-item[data-step-type]')
                    : null;
                if (!element || !this.useFallbackCanvas) {
                    return;
                }

                this.armedPaletteType = (element.dataset.stepType || '').trim() || null;
            });
        },

        togglePaletteCollapsed() {
            this.paletteCollapsed = !this.paletteCollapsed;
        }
    });
};