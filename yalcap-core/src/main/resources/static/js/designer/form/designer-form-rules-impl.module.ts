// designer-form-rules-impl.module.ts
import { formDesignerRulesTable } from './designer-form-rules-table.module.js';
import { formDesignerRulesUtils } from './designer-form-rules-utils.module.js';
import { formDesignerRulesCompile } from './designer-form-rules-compile.module.js';

export const formDesignerRulesImpl = {
    ...formDesignerRulesTable,
    ...formDesignerRulesUtils,
    ...formDesignerRulesCompile
};