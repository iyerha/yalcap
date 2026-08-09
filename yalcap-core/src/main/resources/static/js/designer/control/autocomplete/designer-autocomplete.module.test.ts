import { describe, it, expect, beforeEach } from 'vitest';
import { autocompleteHooks, register } from './designer-autocomplete.module';

describe('designer-autocomplete.module', () => {
  describe('autocompleteHooks.normalize', () => {
    it('sets default source type to static', () => {
      const control = { widget: 'autocomplete', label: 'Test' } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(result.autocompleteSourceType).toBe('static');
    });

    it('preserves provided source type', () => {
      const control = { widget: 'autocomplete', label: 'Test', autocompleteSourceType: 'remote' } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(result.autocompleteSourceType).toBe('remote');
    });

    it('sets default label field to "label"', () => {
      const control = { widget: 'autocomplete', label: 'Test' } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(result.autocompleteLabelField).toBe('label');
    });

    it('sets default value field to "value"', () => {
      const control = { widget: 'autocomplete', label: 'Test' } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(result.autocompleteValueField).toBe('value');
    });

    it('sets default search param to "q"', () => {
      const control = { widget: 'autocomplete', label: 'Test' } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(result.autocompleteSearchParam).toBe('q');
    });

    it('clears options for remote source type', () => {
      const control = {
        widget: 'autocomplete',
        label: 'Test',
        autocompleteSourceType: 'remote',
        options: [{ label: 'A', value: '1' }]
      } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(result.options).toEqual([]);
    });

    it('converts null default value to empty string', () => {
      const control = { widget: 'autocomplete', label: 'Test', defaultValue: null } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(result.defaultValue).toBe('');
    });

    it('converts undefined default value to empty string', () => {
      const control = { widget: 'autocomplete', label: 'Test', defaultValue: undefined } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(result.defaultValue).toBe('');
    });

    it('converts non-null default value to string', () => {
      const control = { widget: 'autocomplete', label: 'Test', defaultValue: 42 } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(result.defaultValue).toBe('42');
    });

    it('ensures options is an array', () => {
      const control = { widget: 'autocomplete', label: 'Test', options: null } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(Array.isArray(result.options)).toBe(true);
      expect(result.options.length).toBe(0);
    });

    it('creates default options via API for static source with no options', () => {
      const defaultOptions = [{ label: 'A', value: '1' }];
      const api = {
        createDefaultOptions: () => defaultOptions
      } as any;
      
      const control = {
        widget: 'autocomplete',
        label: 'Test',
        autocompleteSourceType: 'static',
        options: []
      } as any;
      const result = autocompleteHooks.normalize(control, api);
      
      expect(result.options).toEqual(defaultOptions);
    });

    it('does not create default options for remote source', () => {
      const api = {
        createDefaultOptions: () => [{ label: 'A', value: '1' }]
      } as any;
      
      const control = {
        widget: 'autocomplete',
        label: 'Test',
        autocompleteSourceType: 'remote',
        options: []
      } as any;
      const result = autocompleteHooks.normalize(control, api);
      
      expect(result.options).toEqual([]);
    });

    it('does not create default options if options already exist', () => {
      const api = {
        createDefaultOptions: () => [{ label: 'X', value: 'x' }]
      } as any;
      
      const control = {
        widget: 'autocomplete',
        label: 'Test',
        autocompleteSourceType: 'static',
        options: [{ label: 'A', value: '1' }]
      } as any;
      const result = autocompleteHooks.normalize(control, api);
      
      expect(result.options).toEqual([{ label: 'A', value: '1' }]);
    });

    it('trims whitespace from string fields', () => {
      const control = {
        widget: 'autocomplete',
        label: 'Test',
        autocompleteSourceType: '  remote  ',
        autocompleteLabelField: '  name  ',
        autocompleteValueField: '  id  ',
        autocompleteSearchParam: '  search  '
      } as any;
      const result = autocompleteHooks.normalize(control, {});
      
      expect(result.autocompleteSourceType).toBe('remote');
      expect(result.autocompleteLabelField).toBe('name');
      expect(result.autocompleteValueField).toBe('id');
      expect(result.autocompleteSearchParam).toBe('search');
    });

    it('handles null control gracefully', () => {
      const result = autocompleteHooks.normalize(null as any, {});
      
      expect(result.autocompleteSourceType).toBe('static');
      expect(Array.isArray(result.options)).toBe(true);
    });

    it('does not mutate original control', () => {
      const original = { widget: 'autocomplete', label: 'Test', options: [] };
      const control = { ...original };
      
      autocompleteHooks.normalize(control, {});
      
      expect(control).toEqual(original);
    });
  });

  describe('autocompleteHooks.validate', () => {
    it('does not add errors for static source', () => {
      const control = {
        autocompleteSourceType: 'static'
      } as any;
      const errors: string[] = [];
      
      autocompleteHooks.validate(control, errors);
      
      expect(errors).toEqual([]);
    });

    it('adds error for missing source URL in remote source', () => {
      const control = {
        autocompleteSourceType: 'remote',
        autocompleteSourceUrl: ''
      } as any;
      const errors: string[] = [];
      
      autocompleteHooks.validate(control, errors);
      
      expect(errors).toContain('Autocomplete remote source requires a source URL.');
    });

    it('adds error for missing label field in remote source', () => {
      const control = {
        autocompleteSourceType: 'remote',
        autocompleteSourceUrl: 'https://api.example.com',
        autocompleteLabelField: ''
      } as any;
      const errors: string[] = [];
      
      autocompleteHooks.validate(control, errors);
      
      expect(errors).toContain('Autocomplete remote source requires a label field.');
    });

    it('adds error for missing value field in remote source', () => {
      const control = {
        autocompleteSourceType: 'remote',
        autocompleteSourceUrl: 'https://api.example.com',
        autocompleteLabelField: 'name',
        autocompleteValueField: ''
      } as any;
      const errors: string[] = [];
      
      autocompleteHooks.validate(control, errors);
      
      expect(errors).toContain('Autocomplete remote source requires a value field.');
    });

    it('passes validation for complete remote source', () => {
      const control = {
        autocompleteSourceType: 'remote',
        autocompleteSourceUrl: 'https://api.example.com',
        autocompleteLabelField: 'name',
        autocompleteValueField: 'id'
      } as any;
      const errors: string[] = [];
      
      autocompleteHooks.validate(control, errors);
      
      expect(errors).toEqual([]);
    });

    it('handles null control gracefully', () => {
      const errors: string[] = [];
      
      expect(() => autocompleteHooks.validate(null as any, errors)).not.toThrow();
      expect(errors).toEqual([]);
    });

    it('handles non-array errors gracefully', () => {
      const control = { autocompleteSourceType: 'remote' } as any;
      
      expect(() => autocompleteHooks.validate(control, null as any)).not.toThrow();
    });

    it('adds all validation errors at once', () => {
      const control = {
        autocompleteSourceType: 'remote',
        autocompleteSourceUrl: '',
        autocompleteLabelField: '',
        autocompleteValueField: ''
      } as any;
      const errors: string[] = [];
      
      autocompleteHooks.validate(control, errors);
      
      expect(errors.length).toBe(3);
      expect(errors).toContain('Autocomplete remote source requires a source URL.');
      expect(errors).toContain('Autocomplete remote source requires a label field.');
      expect(errors).toContain('Autocomplete remote source requires a value field.');
    });
  });

  describe('register', () => {
    it('registers hooks to provided object', () => {
      const hooks = {} as any;
      
      register(hooks);
      
      expect(hooks.autocomplete).toBe(autocompleteHooks);
    });

    it('registers hooks to window.designerControlHooks if no object provided', () => {
      const originalHooks = (window as any).designerControlHooks;
      delete (window as any).designerControlHooks;
      
      register();
      
      expect((window as any).designerControlHooks?.autocomplete).toBe(autocompleteHooks);
      
      // Restore
      (window as any).designerControlHooks = originalHooks;
    });

    it('does not overwrite existing autocomplete hooks', () => {
      const existingHooks = { normalize: () => ({}) };
      const hooks = { autocomplete: existingHooks } as any;
      
      register(hooks);
      
      expect(hooks.autocomplete).toBe(existingHooks);
    });

    it('creates designerControlHooks on window if it does not exist', () => {
      const originalHooks = (window as any).designerControlHooks;
      delete (window as any).designerControlHooks;
      
      register();
      
      expect((window as any).designerControlHooks).toBeDefined();
      
      // Restore
      (window as any).designerControlHooks = originalHooks;
    });

    it('preserves other hooks when registering', () => {
      const existingHooks = {
        table: { validate: () => {} },
        upload: { normalize: () => ({}) }
      } as any;
      
      register(existingHooks);
      
      expect(existingHooks.table).toBeDefined();
      expect(existingHooks.upload).toBeDefined();
      expect(existingHooks.autocomplete).toBe(autocompleteHooks);
    });
  });
});