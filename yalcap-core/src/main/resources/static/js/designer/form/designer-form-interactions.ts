(function () {
    const windowAny = window as any;

    const implementation = windowAny.formDesignerInteractionsImpl || {};
    windowAny.formDesignerInteractions = {
        ...implementation
    };
})();
