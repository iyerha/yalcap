interface RulesApi {
    [key: string]: any;
}

(function initFormDesignerRules(windowAny: Window & typeof globalThis): void {
    const host = windowAny as any;
    const tableApi = host.formDesignerRulesTable || {};
    const utilsApi = host.formDesignerRulesUtils || {};
    const compileApi = host.formDesignerRulesCompile || {};

    host.formDesignerRules = {
        ...tableApi,
        ...utilsApi,
        ...compileApi
    };
})(window);
