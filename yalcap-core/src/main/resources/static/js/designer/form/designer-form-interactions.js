// @ts-check
(function () {
    const windowAny = /** @type {any} */ (window);

    const implementation = windowAny.formDesignerInteractionsImpl || {};
    windowAny.formDesignerInteractions = {
        ...implementation
    };
})();
