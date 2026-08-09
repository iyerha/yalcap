import { register } from './designer-table.module.js';

try {
    register((window as any).designerControlHooks);
} catch (error) {
    console.error('Failed to register table designer hooks', error);
}
