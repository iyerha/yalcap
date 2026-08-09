import { register } from './designer-step-form.module.js';

try {
    register();
} catch (error) {
    console.error('Failed to register form step hook', error);
}