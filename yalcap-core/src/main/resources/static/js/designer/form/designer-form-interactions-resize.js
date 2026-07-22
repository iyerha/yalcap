// @ts-check
(function () {
    const windowAny = /** @type {any} */ (window);

    const resizeInteractionsApi = /** @type {Record<string, any>} */ ({
        startResize(controlId, event) {
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
            this.resizeGridElement = event && event.target && event.target.closest
                ? event.target.closest('.canvas, .nested-grid')
                : null;

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

            const gridElement = this.resizeGridElement || (this.$root ? this.$root.querySelector('.canvas') : null);
            if (!gridElement) {
                return;
            }

            const colWidth = gridElement.clientWidth / 12;
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
            this.resizeGridElement = null;
            this.resizeMoveHandler = null;
            this.resizeUpHandler = null;
            this.resizeCancelHandler = null;
            this.resizeKeyHandler = null;
            this.resizeVisibilityHandler = null;
            document.body.classList.remove('is-resizing');
        }
    });

    windowAny.formDesignerInteractionsResize = resizeInteractionsApi;
})();
