// designer-form-interactions-impl.module.ts
import { formDesignerInteractionsCore } from './designer-form-interactions-core.module.js';
import { formDesignerInteractionsSortable } from './designer-form-interactions-sortable.module.js';
import { formDesignerInteractionsResize } from './designer-form-interactions-resize.module.js';

export const formDesignerInteractionsImpl = {
    ...formDesignerInteractionsCore,
    ...formDesignerInteractionsSortable,
    ...formDesignerInteractionsResize
};
