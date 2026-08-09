export interface RepeatHooks extends DesignerControlHooksApi {
    canInsertIntoSource(context: DesignerControlHookContext): boolean;
}

function isValidRepeatChild(control: DesignerControl | undefined): boolean {
    if (!control) {
        return false;
    }

    const widget = String(control.widget || '').trim().toLowerCase();
    if (!widget) {
        return false;
    }

    if (widget === 'group') {
        return true;
    }

    return widget !== 'repeat' && widget !== 'section';
}

export const repeatHooks: RepeatHooks = {
    /**
     * Repeat accepts exactly one direct child. That child may be a group or scalar control,
     * but may not be another repeat or section.
     */
    canInsertIntoSource(context: DesignerControlHookContext): boolean {
        const container = context?.container;
        const control = context?.control;
        const controlId = String(context?.controlId || '');
        if (!container || !control) {
            return false;
        }

        if (!Array.isArray(container.children)) {
            container.children = [];
        }

        const existingChildren = container.children.filter((child: any) => child && child.localId !== controlId);
        if (existingChildren.length >= 1) {
            return false;
        }

        return isValidRepeatChild(control);
    }
};

export function register(hooks?: Record<string, DesignerControlHooksApi>): void {
    const target = hooks || ((window as any).designerControlHooks ||= {}) as Record<string, DesignerControlHooksApi>;
    
    if (!target.repeat) {
        target.repeat = repeatHooks;
    }
}