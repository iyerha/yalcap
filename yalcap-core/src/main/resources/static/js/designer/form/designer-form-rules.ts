import { formDesignerRulesImpl } from './designer-form-rules-impl.module.js';

export const formDesignerRules = formDesignerRulesImpl;

(window as any).formDesignerRules = formDesignerRules;