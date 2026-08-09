(function () {
    const windowAny = window as any;

    import('./runtime-autocomplete.module.js')
        .then((mod) => {
            const api = mod.init();
            windowAny.runtimeAutocomplete = api;
            windowAny.autocompleteRuntime = api;
        })
        .catch((error) => {
            console.error('Failed to load runtime-autocomplete module', error);
        });
})();