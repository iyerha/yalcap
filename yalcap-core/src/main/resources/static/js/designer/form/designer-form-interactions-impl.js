// @ts-check
(function () {
    const windowAny = /** @type {any} */ (window);

    windowAny.formDesignerInteractionsImpl = {
        ...(windowAny.formDesignerInteractionsCore || {}),
        ...(windowAny.formDesignerInteractionsSortable || {}),
        ...(windowAny.formDesignerInteractionsResize || {})
    };
})();
