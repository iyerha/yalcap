import { register } from './designer-repeat.module.js';

try {
    register((window as any).designerControlHooks);
} catch (error) {
    console.error('Failed to register repeat designer hooks', error);
}
