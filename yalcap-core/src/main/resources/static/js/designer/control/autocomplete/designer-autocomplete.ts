import { register } from './designer-autocomplete.module.js';

try {
    register((window as any).designerControlHooks);
} catch (error) {
    console.error('Failed to register autocomplete designer hooks', error);
}