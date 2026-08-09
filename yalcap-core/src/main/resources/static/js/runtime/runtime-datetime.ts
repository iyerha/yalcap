(function () {
    const windowAny = window as any;

    import("./runtime-datetime.module.js")
        .then((mod) => {
            const api = mod.init();
            windowAny.runtimeDateTime = api;
        })
        .catch((error) => {
            console.error("Failed to load runtime-datetime module", error);
        });
})();