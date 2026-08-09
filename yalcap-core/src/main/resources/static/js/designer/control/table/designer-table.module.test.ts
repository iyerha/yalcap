import { describe, it, expect, beforeEach } from 'vitest';
import { tableHooks, register } from './designer-table.module';

describe('designer-table.module', () => {
  describe('tableHooks.normalize', () => {
    it('sets type to array', () => {
      const control = { widget: 'table', label: 'Table' } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.type).toBe('array');
    });

    it('clears placeholder, options, and defaultValue', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        placeholder: 'Enter data',
        options: [{ label: 'A', value: '1' }],
        defaultValue: 'test'
      } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.placeholder).toBe('');
      expect(result.options).toEqual([]);
      expect(result.defaultValue).toBeNull();
    });

    it('creates default columns if none provided', () => {
      const control = { widget: 'table', label: 'Table', tableColumns: [] } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableColumns).toHaveLength(2);
      expect(result.tableColumns[0].key).toBe('column1');
      expect(result.tableColumns[1].key).toBe('column2');
    });

    it('preserves existing columns', () => {
      const columns = [{ key: 'name', title: 'Name', type: 'string' }];
      const control = { widget: 'table', label: 'Table', tableColumns: columns } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableColumns).toHaveLength(1);
      expect(result.tableColumns[0].key).toBe('name');
      expect(result.tableColumns[0].title).toBe('Name');
    });

    it('normalizes column keys with toIdentifier API', () => {
      const api = {
        toIdentifier: (v: any) => String(v || '').replace(/[^A-Za-z0-9_]/g, '_').toLowerCase()
      };
      const control = {
        widget: 'table',
        label: 'Table',
        tableColumns: [{ key: 'User-Name', title: 'User Name' }]
      } as any;
      const result = tableHooks.normalize(control, api);

      expect(result.tableColumns[0].key).toBe('user_name');
    });

    it('uses default toIdentifier if API not provided', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        tableColumns: [{ key: 'user@email', title: 'Email' }]
      } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableColumns[0].key).toBe('useremail');
    });

    it('trims column titles', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        tableColumns: [{ key: 'name', title: '  User Name  ' }]
      } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableColumns[0].title).toBe('User Name');
    });

    it('generates default column title if missing', () => {
    const control = {
        widget: 'table',
        label: 'Table',
        tableColumns: [{ key: 'col1' }]
    } as any;
    const result = tableHooks.normalize(control, {});

    expect(result.tableColumns[0].title).toBe('col1');
    });

    it('normalizes column type', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        tableColumns: [{ key: 'age', title: 'Age', type: '  number  ' }]
      } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableColumns[0].type).toBe('number');
    });

    it('normalizes tableMinItems to non-negative number', () => {
      const control = { widget: 'table', label: 'Table', tableMinItems: -5, tableColumns: [] } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableMinItems).toBe(0);
    });

    it('normalizes tableMaxItems to non-negative number', () => {
      const control = { widget: 'table', label: 'Table', tableMaxItems: -10, tableColumns: [] } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableMaxItems).toBe(0);
    });

    it('sets tableAllowAdd default to true', () => {
      const control = { widget: 'table', label: 'Table', tableColumns: [] } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableAllowAdd).toBe(true);
    });

    it('respects tableAllowAdd false', () => {
      const control = { widget: 'table', label: 'Table', tableAllowAdd: false, tableColumns: [] } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableAllowAdd).toBe(false);
    });

    it('sets tableAllowDelete default to true', () => {
      const control = { widget: 'table', label: 'Table', tableColumns: [] } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableAllowDelete).toBe(true);
    });

    it('sets tableAllowReorder to true only if explicitly true', () => {
      const control1 = { widget: 'table', label: 'Table', tableColumns: [] } as any;
      const result1 = tableHooks.normalize(control1, {});
      expect(result1.tableAllowReorder).toBe(false);

      const control2 = { widget: 'table', label: 'Table', tableAllowReorder: true, tableColumns: [] } as any;
      const result2 = tableHooks.normalize(control2, {});
      expect(result2.tableAllowReorder).toBe(true);
    });

    it('maps table properties to repeat semantics', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        tableMinItems: 1,
        tableMaxItems: 10,
        tableAllowAdd: true,
        tableAllowDelete: false,
        tableAllowReorder: true,
        tableColumns: []
      } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.repeatMinItems).toBe(1);
      expect(result.repeatMaxItems).toBe(10);
      expect(result.repeatAllowAdd).toBe(true);
      expect(result.repeatAllowDelete).toBe(false);
      expect(result.repeatAllowReorder).toBe(true);
      expect(result.repeatRenderer).toBe('table');
    });

    it('does not mutate original control', () => {
      const original = { widget: 'table', label: 'Table', tableColumns: [] };
      const control = { ...original };

      tableHooks.normalize(control, {});

      expect(control).toEqual(original);
    });

    it('handles null control gracefully', () => {
      const result = tableHooks.normalize(null as any, {});

      expect(result.type).toBe('array');
      expect(Array.isArray(result.tableColumns)).toBe(true);
    });

    it('generates missing column keys', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        tableColumns: [{ title: 'Name' }, { title: 'Age' }]
      } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableColumns[0].key).toBe('column1');
      expect(result.tableColumns[1].key).toBe('column2');
    });

    it('sets column required flag from boolean', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        tableColumns: [
          { key: 'name', title: 'Name', required: true },
          { key: 'email', title: 'Email', required: false }
        ]
      } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableColumns[0].required).toBe(true);
      expect(result.tableColumns[1].required).toBe(false);
    });

    it('sets column visible flag (defaults to true)', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        tableColumns: [
          { key: 'name', title: 'Name', visible: true },
          { key: 'internal', title: 'Internal', visible: false },
          { key: 'default', title: 'Default' }
        ]
      } as any;
      const result = tableHooks.normalize(control, {});

      expect(result.tableColumns[0].visible).toBe(true);
      expect(result.tableColumns[1].visible).toBe(false);
      expect(result.tableColumns[2].visible).toBe(true);
    });
  });

  describe('tableHooks.validate', () => {
    it('requires field name', () => {
      const control = { widget: 'table', label: 'Table', name: '' } as any;
      const errors: string[] = [];

      tableHooks.validate(control, errors, {});

      expect(errors).toContain('Table control requires a field name for array data binding.');
    });

    it('requires at least one column', () => {
      const control = { widget: 'table', label: 'Table', name: 'items', tableColumns: [] } as any;
      const errors: string[] = [];

      tableHooks.validate(control, errors, {});

      expect(errors).toContain('Table control requires at least one column.');
    });

    it('validates column keys are JS-safe identifiers', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        name: 'items',
        tableColumns: [{ key: '123invalid', title: 'Invalid' }]
      } as any;
      const errors: string[] = [];

      tableHooks.validate(control, errors, {});

      expect(errors).toContain('Each table column key must be a JS-safe identifier.');
    });

    it('validates column titles are not empty', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        name: 'items',
        tableColumns: [{ key: 'name', title: '   ' }]
      } as any;
      const errors: string[] = [];

      tableHooks.validate(control, errors, {});

      expect(errors).toContain('Each table column requires a title.');
    });

    it('validates column keys are unique', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        name: 'items',
        tableColumns: [
          { key: 'name', title: 'Name' },
          { key: 'name', title: 'Name Again' }
        ]
      } as any;
      const errors: string[] = [];

      tableHooks.validate(control, errors, {});

      expect(errors).toContain('Table column keys must be unique.');
    });

    it('validates max items >= min items', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        name: 'items',
        tableMinItems: 5,
        tableMaxItems: 2,
        tableColumns: [{ key: 'name', title: 'Name' }]
      } as any;
      const errors: string[] = [];

      tableHooks.validate(control, errors, {});

      expect(errors).toContain('Table max rows must be greater than or equal to min rows.');
    });

    it('passes validation for valid table', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        name: 'items',
        tableMinItems: 1,
        tableMaxItems: 10,
        tableColumns: [
          { key: 'name', title: 'Name' },
          { key: 'email', title: 'Email' }
        ]
      } as any;
      const errors: string[] = [];

      tableHooks.validate(control, errors, {});

      expect(errors).toEqual([]);
    });

    it('uses provided isJsSafeIdentifier API', () => {
      const api = {
        isJsSafeIdentifier: (v: any) => /^[a-z]+$/.test(String(v).trim())
      };
      const control = {
        widget: 'table',
        label: 'Table',
        name: 'items',
        tableColumns: [{ key: 'name123', title: 'Name' }]
      } as any;
      const errors: string[] = [];

      tableHooks.validate(control, errors, api);

      expect(errors).toContain('Each table column key must be a JS-safe identifier.');
    });

    it('handles null control gracefully', () => {
      const errors: string[] = [];

      expect(() => tableHooks.validate(null as any, errors, {})).not.toThrow();
      expect(errors).toEqual([]);
    });

    it('handles non-array errors gracefully', () => {
      const control = { widget: 'table', name: 'items', tableColumns: [] } as any;

      expect(() => tableHooks.validate(control, null as any, {})).not.toThrow();
    });

    it('collects multiple validation errors', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        name: '',
        tableMinItems: 10,
        tableMaxItems: 5,
        tableColumns: [
          { key: '123', title: '  ' },
          { key: 'name', title: 'Name' },
          { key: 'name', title: 'Name Again' }
        ]
      } as any;
      const errors: string[] = [];

      tableHooks.validate(control, errors, {});

      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain('Table control requires a field name for array data binding.');
      expect(errors).toContain('Each table column key must be a JS-safe identifier.');
      expect(errors).toContain('Table column keys must be unique.');
    });

    it('allows maxItems of 0 (unlimited)', () => {
      const control = {
        widget: 'table',
        label: 'Table',
        name: 'items',
        tableMinItems: 0,
        tableMaxItems: 0,
        tableColumns: [{ key: 'name', title: 'Name' }]
      } as any;
      const errors: string[] = [];

      tableHooks.validate(control, errors, {});

      expect(errors).toEqual([]);
    });
  });

  describe('register', () => {
    it('registers hooks to provided object', () => {
      const hooks = {} as any;

      register(hooks);

      expect(hooks.table).toBe(tableHooks);
    });

    it('registers hooks to window.designerControlHooks if no object provided', () => {
      const originalHooks = (window as any).designerControlHooks;
      delete (window as any).designerControlHooks;

      register();

      expect((window as any).designerControlHooks?.table).toBe(tableHooks);

      // Restore
      (window as any).designerControlHooks = originalHooks;
    });

    it('does not overwrite existing table hooks', () => {
      const existingHooks = { normalize: () => ({}) };
      const hooks = { table: existingHooks } as any;

      register(hooks);

      expect(hooks.table).toBe(existingHooks);
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
        autocomplete: { validate: () => {} },
        repeat: { canInsertIntoSource: () => false }
      } as any;

      register(existingHooks);

      expect(existingHooks.autocomplete).toBeDefined();
      expect(existingHooks.repeat).toBeDefined();
      expect(existingHooks.table).toBe(tableHooks);
    });
  });
});