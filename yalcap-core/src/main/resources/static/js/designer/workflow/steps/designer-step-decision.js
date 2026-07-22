(function registerDecisionStepHook() {
    var register = window.yalcapRegisterWorkflowStepHook;
    if (typeof register !== 'function') {
        return;
    }

    register('decision', {
        onSelect: function onSelect(context) {
            if (!context || !context.draft) {
                return;
            }

            if (typeof context.setHint === 'function') {
                context.setHint('Decision steps route along output connectors. Provide a JSON object condition and optional action labels.');
            }

            var draft = context.draft;
            if (!draft.config || typeof draft.config !== 'object') {
                draft.config = {};
            }

            var changed = false;
            if (!String(draft.config.action1Label || '').trim()) {
                draft.config.action1Label = 'Approve';
                changed = true;
            }
            if (!String(draft.config.action2Label || '').trim()) {
                draft.config.action2Label = 'Reject';
                changed = true;
            }

            if (changed && typeof context.sync === 'function') {
                context.sync();
            }
        }
    });
})();
