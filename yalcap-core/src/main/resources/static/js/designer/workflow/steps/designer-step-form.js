(function registerFormStepHook() {
    var register = window.yalcapRegisterWorkflowStepHook;
    if (typeof register !== 'function') {
        return;
    }

    function resolveHint(config) {
        var values = config && typeof config === 'object' ? config : {};
        var kind = String(values.assigneeKind || '').trim();
        var assigneeValue = String(values.assigneeValue || '').trim();

        if (!kind) {
            return 'Form step: choose an assignee kind.';
        }

        if (!assigneeValue) {
            return 'Form step: provide an assignee value for ' + kind + '.';
        }

        if (kind === 'EXTERNAL_EMAIL' && assigneeValue.indexOf('@') < 0) {
            return 'Form step: EXTERNAL_EMAIL usually contains an email or expression that resolves to one.';
        }

        return 'Form step assignment looks complete.';
    }

    register('form', {
        onSelect: function onSelect(context) {
            if (!context || !context.draft) {
                return;
            }

            var draft = context.draft;
            if (!draft.config || typeof draft.config !== 'object') {
                draft.config = {};
            }

            if (typeof context.setHint === 'function') {
                context.setHint(resolveHint(draft.config));
            }
        },

        afterSync: function afterSync(context) {
            if (!context || !context.step || !context.step.config) {
                return;
            }

            if (typeof context.setHint === 'function') {
                context.setHint(resolveHint(context.step.config));
            }
        }
    });
})();
