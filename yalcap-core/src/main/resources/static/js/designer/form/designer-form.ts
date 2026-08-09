import { formDesignerFactory } from './designer-form.module.js';
const windowAny = window as any;
windowAny.formDesigner = formDesignerFactory;