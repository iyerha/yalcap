// @ts-check
(function registerRepeatDesignerHooks(windowAny) {
    const host = /** @type {any} */ (windowAny);
    if (!host.designerControlHooks || typeof host.designerControlHooks !== 'object') {
        host.designerControlHooks = {};
    }

    /** @type {DesignerControlHooksApi} */
    const hooks = {
        /**
         * Repeat accepts exactly one direct child. That child may be a group or scalar control,
         * but may not be another repeat or section.
         * @param {DesignerControlHookContext} context
         */
        canInsertIntoSource(context) {
            const container = context?.container;
            const control = context?.control;
            const controlId = String(context?.controlId || '');
            if (!container || !control) {
                return false;
            }

            if (!Array.isArray(container.children)) {
                container.children = [];
            }

            const existingChildren = container.children.filter((/** @type {any} */ child) => child && child.id !== controlId);
            if (existingChildren.length >= 1) {
                return false;
            }

            return isValidRepeatChild(control);
        }
    };

    host.designerControlHooks.repeat = hooks;

    /** @param {DesignerControl | undefined} control */
    function isValidRepeatChild(control) {
        if (!control) {
            return false;
        }

        const widget = String(control.widget || '').trim().toLowerCase();
        if (!widget) {
            return false;
        }

        if (widget === 'group') {
            return true;
        }

        return widget !== 'repeat' && widget !== 'section';
    }
}(window));
