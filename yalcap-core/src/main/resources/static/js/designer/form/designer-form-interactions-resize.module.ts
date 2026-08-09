interface ResizeInteractionsApi {
    resizingControlId: string | null;
    resizeStartX: number;
    resizeStartSpan: number;
    resizeGridElement: Element | null;
    resizeMoveHandler: ((event: MouseEvent) => void) | null;
    resizeUpHandler: (() => void) | null;
    resizeCancelHandler: (() => void) | null;
    resizeKeyHandler: ((event: KeyboardEvent) => void) | null;
    resizeVisibilityHandler: (() => void) | null;
    $root?: any;
    startResize(controlId: string, event: MouseEvent): void;
    onResizeMove(event: MouseEvent): void;
    stopResize(): void;
    [key: string]: any;
}
const windowAny = window as any;

const resizeInteractionsApi: ResizeInteractionsApi = {
    resizingControlId: null,
    resizeStartX: 0,
    resizeStartSpan: 0,
    resizeGridElement: null,
    resizeMoveHandler: null,
    resizeUpHandler: null,
    resizeCancelHandler: null,
    resizeKeyHandler: null,
    resizeVisibilityHandler: null,

    startResize(controlId: string, event: MouseEvent): void {
        const found = this.findControlByLocalId(controlId);
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
        this.resizeGridElement = event && event.target && (event.target as Element).closest
            ? (event.target as Element).closest('.canvas, .nested-grid')
            : null;

        this.resizeMoveHandler = (moveEvent: MouseEvent) => this.onResizeMove(moveEvent);
        this.resizeUpHandler = () => this.stopResize();
        this.resizeCancelHandler = () => this.stopResize();
        this.resizeKeyHandler = (keyEvent: KeyboardEvent) => {
            if (keyEvent.key === 'Escape') {
                this.stopResize();
            }
        };
        this.resizeVisibilityHandler = () => {
            if (document.hidden) {
                this.stopResize();
            }
        };

        window.addEventListener('mousemove', this.resizeMoveHandler as EventListener, true);
        window.addEventListener('mouseup', this.resizeUpHandler as EventListener, true);
        window.addEventListener('blur', this.resizeCancelHandler as EventListener);
        window.addEventListener('keydown', this.resizeKeyHandler as EventListener, true);
        document.addEventListener('visibilitychange', this.resizeVisibilityHandler);
        document.body.classList.add('is-resizing');
    },

    onResizeMove(event: MouseEvent): void {
        if (!this.resizingControlId) {
            return;
        }

        if (event.buttons === 0) {
            this.stopResize();
            return;
        }

        const gridElement = this.resizeGridElement || (this.$root ? this.$root.querySelector('.canvas') : null);
        if (!gridElement) {
            return;
        }

        const colWidth = (gridElement as HTMLElement).clientWidth / 12;
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

        this.updateCanvasControl(this.resizingControlId, (control: any) => {
            control.colSpan = nextSpan;
        });
    },

    stopResize(): void {
        if (this.resizeMoveHandler) {
            window.removeEventListener('mousemove', this.resizeMoveHandler as EventListener, true);
        }
        if (this.resizeUpHandler) {
            window.removeEventListener('mouseup', this.resizeUpHandler as EventListener, true);
        }
        if (this.resizeCancelHandler) {
            window.removeEventListener('blur', this.resizeCancelHandler as EventListener);
        }
        if (this.resizeKeyHandler) {
            window.removeEventListener('keydown', this.resizeKeyHandler as EventListener, true);
        }
        if (this.resizeVisibilityHandler) {
            document.removeEventListener('visibilitychange', this.resizeVisibilityHandler);
        }

        this.resizingControlId = null;
        this.resizeGridElement = null;
        this.resizeMoveHandler = null;
        this.resizeUpHandler = null;
        this.resizeCancelHandler = null;
        this.resizeKeyHandler = null;
        this.resizeVisibilityHandler = null;
        document.body.classList.remove('is-resizing');
    }
};

export const formDesignerInteractionsResize = resizeInteractionsApi;