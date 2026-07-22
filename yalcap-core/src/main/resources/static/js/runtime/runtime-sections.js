(function () {
    if (window.runtimeSections && window.runtimeSections.initialized) {
        return;
    }

    function setCollapsed(control, collapsed) {
        if (!control) {
            return;
        }

        var children = control.querySelector(':scope > .resolved-children');
        var toggle = control.querySelector('[data-section-toggle]');
        var isCollapsed = Boolean(collapsed);

        control.setAttribute('data-section-collapsed', isCollapsed ? 'true' : 'false');

        if (children) {
            if (isCollapsed) {
                children.setAttribute('hidden', 'hidden');
            } else {
                children.removeAttribute('hidden');
            }
        }

        if (toggle) {
            toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            toggle.textContent = isCollapsed ? 'Expand' : 'Collapse';
        }
    }

    function wireSectionControl(control) {
        if (!control || control.dataset.sectionBound === 'true') {
            return;
        }

        var collapsible = (control.getAttribute('data-section-collapsible') || 'false').toLowerCase() === 'true';
        var collapsed = (control.getAttribute('data-section-collapsed') || 'false').toLowerCase() === 'true';
        var toggle = control.querySelector('[data-section-toggle]');

        if (!collapsible || !toggle) {
            control.dataset.sectionBound = 'true';
            return;
        }

        setCollapsed(control, collapsed);

        toggle.addEventListener('click', function () {
            var next = (control.getAttribute('data-section-collapsed') || 'false').toLowerCase() !== 'true';
            setCollapsed(control, next);
        });

        control.dataset.sectionBound = 'true';
    }

    function bindAll() {
        var sections = document.querySelectorAll('.resolved-control.widget-section');
        for (var i = 0; i < sections.length; i += 1) {
            wireSectionControl(sections[i]);
        }
    }

    window.runtimeSections = {
        initialized: true,
        bindAll: bindAll
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindAll);
    } else {
        bindAll();
    }

    document.addEventListener('htmx:afterSwap', bindAll);
})();
