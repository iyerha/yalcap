import { register } from './designer-step-decision.module.js';

try {
    register();
} catch (error) {
    console.error('Failed to register decision step hook', error);
}
