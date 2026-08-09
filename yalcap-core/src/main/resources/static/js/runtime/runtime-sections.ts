(function () {
    const windowAny = window as any;

    import('./runtime-sections.module.js')
        .then((mod) => {
            windowAny.runtimeSections = mod.init();
        })
        .catch((error) => {
            console.error('Failed to load runtime-sections module', error);
        });
})();