// @ts-check

interface WorkflowDesignerPaletteApi {
    paletteCollapsed: boolean;
    useFallbackCanvas: boolean;
    armedPaletteType: string | null;
    startPointerPaletteDrag: (type: string, event: PointerEvent) => void;
    bindPaletteDragSources: () => void;
    togglePaletteCollapsed: () => void;
}

(window as any).workflowDesignerPaletteMixin = function workflowDesignerPaletteMixin(target: any): void {
    Object.assign(target, {
        bindPaletteDragSources(this: any): void {
            const paletteList = document.querySelector('.palette-list') as HTMLElement | null;
            if (!paletteList || (paletteList as any).dataset.dragBound === 'true') {
                return;
            }

            (paletteList as any).dataset.dragBound = 'true';

            paletteList.addEventListener('pointerdown', (event: PointerEvent) => {
                const element = (event.target as HTMLElement)?.closest?.('.palette-item[data-step-type]') as HTMLElement | null;
                if (!element || event.button !== 0) {
                    return;
                }

                const type = ((element as any).dataset.stepType || '').trim();
                if (!type) {
                    return;
                }

                this.startPointerPaletteDrag(type, event);
            });

            paletteList.addEventListener('click', (event: MouseEvent) => {
                const element = (event.target as HTMLElement)?.closest?.('.palette-item[data-step-type]') as HTMLElement | null;
                if (!element || !this.useFallbackCanvas) {
                    return;
                }

                this.armedPaletteType = ((element as any).dataset.stepType || '').trim() || null;
            });
        },

        togglePaletteCollapsed(this: any): void {
            this.paletteCollapsed = !this.paletteCollapsed;
        }
    } as WorkflowDesignerPaletteApi);
};
