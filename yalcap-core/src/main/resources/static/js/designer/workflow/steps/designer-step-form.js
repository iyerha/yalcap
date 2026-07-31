(function registerFormStepHook() {
    var register = window.yalcapRegisterWorkflowStepHook;
    if (typeof register !== 'function') {
        return;
    }

    function resolveHint(assignment) {
        var values = assignment && typeof assignment === 'object' ? assignment : {};
        var kind = String(values.kind || '').trim();
        var value = String(values.value || '').trim();

        if (!kind) {
            return 'Form step: choose an assignment kind.';
        }

        if (!value) {
            return 'Form step: provide an assignment value for ' + kind + '.';
        }

        if (kind === 'EXTERNAL_EMAIL' && value.indexOf('@') < 0) {
            return 'Form step: EXTERNAL_EMAIL usually contains an email or expression that resolves to one.';
        }

        return 'Form step assignment looks complete.';
    }

    function ensureAssignmentObject(step) {
        if (!step || typeof step !== 'object') {
            return;
        }

        if (!step.assignment || typeof step.assignment !== 'object') {
            step.assignment = {};
        }
    }

    register('form', {
        assignmentFields: [
            { key: 'kind', title: 'Assignment Kind', type: 'select', enumValues: ['INTERNAL_USER', 'INTERNAL_GROUP', 'EXTERNAL_EMAIL'] },
            { key: 'value', title: 'Value', type: 'text', placeholder: 'user ID, group name, or email' },
            { key: 'mode', title: 'Mode', type: 'select', enumValues: ['first-wins', 'parallel', 'sequential'] }
        ],
        onSelect: function onSelect(context) {
            if (!context || !context.draft) {
                return;
            }

            var draft = context.draft;
            ensureAssignmentObject(draft);

            if (typeof context.setHint === 'function') {
                context.setHint(resolveHint(draft.assignment));
            }
        },

        afterSync: function afterSync(context) {
            if (!context || !context.step) {
                return;
            }

            ensureAssignmentObject(context.step);

            if (typeof context.setHint === 'function') {
                context.setHint(resolveHint(context.step.assignment));
            }
        }
    });
})();
