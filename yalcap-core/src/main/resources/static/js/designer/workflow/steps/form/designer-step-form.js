(function registerFormStepHook() {
    var register = window.registerWorkflowStepHook;
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

    function ensureAssignmentObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return;
        }
        if (!obj.assignment || typeof obj.assignment !== 'object') {
            obj.assignment = {
                kind: 'INTERNAL_USER',
                value: '',
                mode: 'first-wins',
                multiInstance: false
            };
        } else {
        // assignment exists - ensure all fields are present
            if (!('kind' in obj.assignment)) obj.assignment.kind = 'INTERNAL_USER';
            if (!('value' in obj.assignment)) obj.assignment.value = '';
            if (!('mode' in obj.assignment)) obj.assignment.mode = 'first-wins';
            if (!('multiInstance' in obj.assignment)) obj.assignment.multiInstance = false;
        }
    }

    function ensureAccessObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return;
        }
        if (!obj.access || typeof obj.access !== 'object') {
            obj.access = { groups: [], users: [] };
        } else {
            // access exists - ensure all fields are present
            if (!Array.isArray(obj.access.groups)) obj.access.groups = [];
            if (!Array.isArray(obj.access.users)) obj.access.users = [];
        }
    }

    function ensureUiObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return;
        }
        if (!obj.ui || typeof obj.ui !== 'object') {
            obj.ui = { pointer: '', designer: { position: { x: 0, y: 0 } } };
        } else if (!obj.ui.pointer) {
            // ui exists but pointer doesn't - add it
            obj.ui.pointer = '';
        }
    }

    register('form', {
        customFields: [
            {section: 'assignment', key:'kind', title:'Assignment Kind', type:'select', enumValues:[
                {label:'Internal User', value:'INTERNAL_USER'},
                {label:'Internal Group', value:'INTERNAL_GROUP'},
                {label:'External Email', value:'EXTERNAL_EMAIL'}
            ]},
            {section: 'assignment', key:'value', title:'Assignment Value', type:'text', placeholder:'User ID, group, or email'},
            {section: 'assignment', key:'mode', title:'Assignment Mode', type:'select', enumValues:['SINGLE', 'ALL']},
            {section: 'assignment', key:'multiInstance', title:'Multi Instance', type:'checkbox'},
            {section: 'access', key:'groups', title:'Allowed Groups', type:'text', placeholder:'Comma-separated group IDs'},
            {section: 'access', key:'users', title:'Allowed Users', type:'text', placeholder:'Comma-separated user IDs'},
            {section: 'ui', key:'pointer', title:'Form Reference', type:'autocomplete', placeholder:'Search forms...'}
        ],
        formSearchQuery: '',
        formSearchResults: [],
        formSearchOpen: false,

        async searchForms(query) {
            this.formSearchQuery = String(query || '').trim();
            
            if (!this.formSearchQuery) {
                this.formSearchResults = [];
                this.formSearchOpen = false;
                return;
            }
            
            try {
                const tenantId = window.tenantId;
                const response = await fetch(`/api/definitions?type=form&search=${encodeURIComponent(this.formSearchQuery)}`, {
                    method: 'GET',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Tenant-Id': tenantId
                    }
                });
                
                if (!response.ok) {
                    this.formSearchResults = [];
                    return;
                }
                
                const data = await response.json();
                this.formSearchResults = Array.isArray(data.definitions) 
                    ? data.definitions.map(def => ({key: String(def.key || def.id), title: String(def.title || def.key)}))
                    : [];
                this.formSearchOpen = this.formSearchResults.length > 0;
            } catch (error) {
                console.warn('Failed to search forms', error);
                this.formSearchResults = [];
            }
        },

        selectFormReference(formKey) {
            this.updateFieldValue('ui', 'pointer', formKey);
            this.formSearchOpen = false;
            this.formSearchQuery = '';
            this.formSearchResults = [];
        },

        onSelect: function onSelect(context) {
            if (!context || !context.draft) {
                return;
            }

            var draft = context.draft;
            var sourceStep = context.step;

            // Ensure form step-specific properties exist
            ensureAssignmentObject(draft);
            ensureAccessObject(draft);
            ensureUiObject(draft);

            // Copy from source step if available
            if (sourceStep) {
                if (sourceStep.assignment && typeof sourceStep.assignment === 'object') {
                    draft.assignment = JSON.parse(JSON.stringify(sourceStep.assignment));
                }
                if (sourceStep.access && typeof sourceStep.access === 'object') {
                    draft.access = JSON.parse(JSON.stringify(sourceStep.access));
                }
                if (sourceStep.ui && typeof sourceStep.ui === 'object' && sourceStep.ui.pointer) {
                    if (!draft.ui) {
                        draft.ui = {};
                    }
                    draft.ui.pointer = String(sourceStep.ui.pointer || '');
                }
            }

            if (typeof context.setHint === 'function') {
                context.setHint(resolveHint(draft.assignment));
            }
        },

        afterSync: function afterSync(context) {
            if (!context || !context.step) {
                return;
            }

            var step = context.step;
            ensureAssignmentObject(step);
            ensureAccessObject(step);
            ensureUiObject(step);

            if (typeof context.setHint === 'function') {
                context.setHint(resolveHint(step.assignment));
            }
        }
    });
})();
