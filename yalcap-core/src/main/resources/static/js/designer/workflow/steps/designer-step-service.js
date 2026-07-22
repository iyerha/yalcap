(function registerServiceStepHook() {
    var register = window.yalcapRegisterWorkflowStepHook;
    if (typeof register !== 'function') {
        return;
    }

    function evaluateServiceRef(rawValue) {
        var value = String(rawValue || '').trim();
        if (!value) {
            return 'Service step: set serviceRef to a stable handler id or bean reference.';
        }

        if (value.indexOf(' ') >= 0) {
            return 'Service reference should not contain spaces.';
        }

        if (value.indexOf(':') > 0 || value.indexOf('.') > 0) {
            return 'Service reference looks structured and ready.';
        }

        return 'Consider using a namespaced ref like domain.service or bean:serviceHandler.';
    }

    register('service', {
        onSelect: function onSelect(context) {
            if (!context || !context.draft) {
                return;
            }

            var draft = context.draft;
            if (!draft.config || typeof draft.config !== 'object') {
                draft.config = {};
            }

            if (typeof context.setHint === 'function') {
                context.setHint(evaluateServiceRef(draft.config.serviceRef));
            }
        },

        afterSync: function afterSync(context) {
            if (!context || !context.step || !context.step.config) {
                return;
            }

            if (typeof context.setHint === 'function') {
                context.setHint(evaluateServiceRef(context.step.config.serviceRef));
            }
        }
    });
})();
