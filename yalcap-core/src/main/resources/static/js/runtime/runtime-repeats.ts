(function () {
    const windowAny = window as any;

    import('./runtime-repeats.module.js')
        .then((mod) => {
            windowAny.runtimeRepeats = mod.init();
        })
        .catch((error) => {
            console.error('Failed to load runtime-repeats module', error);
        });
})();