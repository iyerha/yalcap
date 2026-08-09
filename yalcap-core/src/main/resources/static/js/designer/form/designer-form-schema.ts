import { formDesignerSchemaApi } from './designer-form-schema.module.js';

const windowAny = (window as unknown) as Record<string, unknown>;
windowAny.formDesignerSchema = formDesignerSchemaApi;
