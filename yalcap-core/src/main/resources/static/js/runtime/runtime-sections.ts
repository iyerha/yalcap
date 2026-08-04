interface RuntimeClientModule {
    initialized: boolean;
    bindAll: () => void;
}

interface RuntimeSectionsModule extends RuntimeClientModule {}

function setCollapsed(control: HTMLElement | null, collapsed: boolean): void {
    if (!control) {
        return;
    }

    const children = control.querySelector(':scope > .resolved-children');
    const toggle = control.querySelector('[data-section-toggle]');
    const isCollapsed = Boolean(collapsed);

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

function wireSectionControl(control: HTMLElement): void {
    if (!control || control.dataset.sectionBound === 'true') {
        return;
    }

    const collapsible = (control.getAttribute('data-section-collapsible') || 'false').toLowerCase() === 'true';
    const collapsed = (control.getAttribute('data-section-collapsed') || 'false').toLowerCase() === 'true';
    const toggle = control.querySelector('[data-section-toggle]');

    if (!collapsible || !toggle) {
        control.dataset.sectionBound = 'true';
        return;
    }

    setCollapsed(control, collapsed);

    toggle.addEventListener('click', () => {
        const next = (control.getAttribute('data-section-collapsed') || 'false').toLowerCase() !== 'true';
        setCollapsed(control, next);
    });

    control.dataset.sectionBound = 'true';
}

function bindSectionsAll(): void {
    const sections = document.querySelectorAll('.resolved-control.widget-section');
    for (let i = 0; i < sections.length; i += 1) {
        wireSectionControl(sections[i] as HTMLElement);
    }
}

(window as any).runtimeSections = {
    initialized: true,
    bindAll: bindSectionsAll
} as RuntimeSectionsModule;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSectionsAll);
} else {
    bindSectionsAll();
}

document.addEventListener('htmx:afterSwap', bindSectionsAll);
