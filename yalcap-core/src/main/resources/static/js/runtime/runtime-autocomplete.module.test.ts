import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bindAll, init } from './runtime-autocomplete.module';

describe('runtime-autocomplete', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('init', () => {
    it('returns module with initialized flag and bindAll function', () => {
      const module = init();
      
      expect(module).toHaveProperty('initialized', true);
      expect(module).toHaveProperty('bindAll');
      expect(typeof module.bindAll).toBe('function');
    });
  });

describe('bindAll', () => {
  it('wires all autocomplete inputs in the document', () => {
    document.body.innerHTML = `
      <input 
        type="text"
        id="label1"
        data-autocomplete-list-id="datalist1"
        data-autocomplete-listbox-id="listbox1"
        data-autocomplete-value-id="value1"
        aria-controls="listbox1"
        role="combobox"
      />
      <input type="hidden" id="value1" />
      <datalist id="datalist1">
        <option value="Apple" data-submit-value="1">Apple</option>
        <option value="Banana" data-submit-value="2">Banana</option>
        <option value="Cherry" data-submit-value="3">Cherry</option>
        </datalist>
      <div id="listbox1" role="listbox"></div>
      <div data-autocomplete-menu-for="value1"></div>
    `;

    bindAll();

    const input = document.querySelector('[data-autocomplete-list-id]') as HTMLInputElement;
    expect(input?.dataset.autocompleteBound).toBe('true');
  });

    it('handles documents with no autocomplete inputs', () => {
      document.body.innerHTML = '<div>No inputs here</div>';
      
      expect(() => bindAll()).not.toThrow();
    });
  });

describe('autocomplete behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="resolved-control">
        <input 
          type="text" 
          id="label1"
          data-autocomplete-list-id="datalist1"
          data-autocomplete-listbox-id="listbox1"
          data-autocomplete-value-id="value1"
          aria-controls="listbox1"
          role="combobox"
        />
        <input type="hidden" id="value1" />
        <datalist id="datalist1">
            <option value="Apple" data-submit-value="1">Apple</option>
            <option value="Banana" data-submit-value="2">Banana</option>
            <option value="Cherry" data-submit-value="3">Cherry</option>
        </datalist>
        <div id="listbox1" role="listbox"></div>
        <div data-autocomplete-menu-for="value1"></div>
      </div>
    `;
    bindAll();
  });

    it('syncs hidden value when user selects from datalist', () => {
      const labelInput = document.getElementById('label1') as HTMLInputElement;
      const valueInput = document.getElementById('value1') as HTMLInputElement;

      labelInput.value = 'Apple';
      labelInput.dispatchEvent(new Event('input'));

      expect(valueInput.value).toBe('1');
    });

    it('clears hidden value when input is cleared', () => {
      const labelInput = document.getElementById('label1') as HTMLInputElement;
      const valueInput = document.getElementById('value1') as HTMLInputElement;

      valueInput.value = '2';
      labelInput.value = '';
      labelInput.dispatchEvent(new Event('input'));

      expect(valueInput.value).toBe('');
    });
  });
});

// Unit tests for internal helpers (requires exporting them)
// Uncomment if you export toItems, normalizeKey, parseInteger for testing
/*
import { toItems, normalizeKey, parseInteger } from './runtime-autocomplete.module';

describe('toItems', () => {
  it('converts array payload to items', () => {
    const result = toItems([{ name: 'John', id: '1' }], 'name', 'id');
    expect(result).toEqual([{ label: 'John', value: '1' }]);
  });

  it('handles nested items array', () => {
    const result = toItems({ items: [{ title: 'A', code: 'a' }] }, 'title', 'code');
    expect(result).toEqual([{ label: 'A', value: 'a' }]);
  });

  it('handles results array', () => {
    const result = toItems({ results: [{ name: 'Test' }] }, 'name', 'name');
    expect(result).toEqual([{ label: 'Test', value: 'Test' }]);
  });

  it('filters out null items', () => {
    const result = toItems([{ n: 'A', v: '1' }, null, { n: 'B', v: '2' }], 'n', 'v');
    expect(result).toEqual([{ label: 'A', value: '1' }, { label: 'B', value: '2' }]);
  });

  it('uses label as value when value is missing', () => {
    const result = toItems([{ name: 'Test' }], 'name', 'id');
    expect(result).toEqual([{ label: 'Test', value: 'Test' }]);
  });
});

describe('normalizeKey', () => {
  it('converts to lowercase trimmed string', () => {
    expect(normalizeKey('  Hello World  ')).toBe('hello world');
    expect(normalizeKey('TEST')).toBe('test');
    expect(normalizeKey(null)).toBe('');
    expect(normalizeKey(123)).toBe('123');
  });
});

describe('parseInteger', () => {
  it('parses valid integers', () => {
    expect(parseInteger('10', 5)).toBe(10);
    expect(parseInteger(25, 5)).toBe(25);
  });

  it('returns fallback for invalid values', () => {
    expect(parseInteger('invalid', 5)).toBe(5);
    expect(parseInteger(null, 10)).toBe(10);
    expect(parseInteger(0, 5)).toBe(5);
    expect(parseInteger(-5, 5)).toBe(5);
  });
});
*/
