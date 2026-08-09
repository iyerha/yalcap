import { register } from './designer-step-service.module.js';

try {
    register();
} catch (error) {
    console.error('Failed to register service step hook', error);
}