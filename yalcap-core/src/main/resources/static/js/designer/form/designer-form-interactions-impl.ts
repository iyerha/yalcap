(function () {
    const windowAny = window as any;

    windowAny.formDesignerInteractionsImpl = {
        ...(windowAny.formDesignerInteractionsCore || {}),
        ...(windowAny.formDesignerInteractionsSortable || {}),
        ...(windowAny.formDesignerInteractionsResize || {})
    };
})();
