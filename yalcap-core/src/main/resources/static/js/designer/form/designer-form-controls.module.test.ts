import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formDesignerControls } from './designer-form-controls.module.js';

describe('designer-form-controls.module', () => {
    beforeEach(() => {
        formDesignerControls.controls = [];
    });

    it('toIdentifier converts text to camelCase identifier', () => {
        expect(formDesignerControls.toIdentifier('First Name')).toBe('firstName');
        expect(formDesignerControls.toIdentifier('email address')).toBe('emailAddress');
        expect(formDesignerControls.toIdentifier('123invalid')).toBe('field123invalid');
    });

    it('slugify converts text to slug', () => {
        expect(formDesignerControls.slugify('First Name')).toBe('first_name');
        expect(formDesignerControls.slugify('Email Address!')).toBe('email_address');
    });

    it('normalizeControl sets defaults for text widget', () => {
        const control = { widget: 'text', label: 'Name' };
        const normalized = formDesignerControls.normalizeControl(control);
        
        expect(normalized.type).toBe('string');
        expect(normalized.name).toBe('name');
        expect(normalized.visible).toBe(true);
        expect(normalized.enabled).toBe(true);
    });

    it('normalizeControl handles checkbox with array type', () => {
        const control = { widget: 'checkbox', label: 'Options', options: [] };
        const normalized = formDesignerControls.normalizeControl(control);
        
        expect(normalized.type).toBe('array');
        expect(Array.isArray(normalized.defaultValue)).toBe(true);
    });

    it('validateControl returns errors for missing required fields', () => {
        const control = { widget: 'text', label: '', name: '' };
        const errors = formDesignerControls.validateControl(control);
        
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e: string) => e.includes('Label'))).toBe(true);
    });

    it('recomputeDerivedStateKeys generates state keys', () => {
        formDesignerControls.controls = [
            { widget: 'text', label: 'First Name', children: [] }
        ];
        
        formDesignerControls.recomputeDerivedStateKeys();
        
        expect(formDesignerControls.controls[0].stateKey).toBe('firstname');
    });
});