// @ts-check
(function initFormDesignerRules(windowAny) {
    const host = /** @type {any} */ (windowAny);
    const tableApi = host.formDesignerRulesTable || {};
    const utilsApi = host.formDesignerRulesUtils || {};
    const compileApi = host.formDesignerRulesCompile || {};

    host.formDesignerRules = {
        ...tableApi,
        ...utilsApi,
        ...compileApi
    };
}(window));
