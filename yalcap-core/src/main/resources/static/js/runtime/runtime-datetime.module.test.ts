import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wireDateTimeInputs, wireAll, init } from './runtime-datetime.module';

describe('runtime-datetime', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('init', () => {
    it('returns module with wireAll function', () => {
      const module = init();
      
      expect(module).toHaveProperty('wireAll');
      expect(typeof module.wireAll).toBe('function');
    });
  });

  describe('wireDateTimeInputs', () => {
    it('converts UTC datetime to local datetime format', () => {
      document.body.innerHTML = `
        <input 
          type="datetime-local" 
          id="dt1"
          data-datetime-value="2024-03-15T14:30:00Z"
        />
      `;

      wireDateTimeInputs(document);

      const input = document.getElementById('dt1') as HTMLInputElement;
      expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(input.dataset.runtimeDatetimeBound).toBe('true');
    });

    it('converts datetime with timezone offset to local format', () => {
      document.body.innerHTML = `
        <input 
          type="datetime-local" 
          id="dt2"
          data-datetime-value="2024-03-15T14:30:00+05:30"
        />
      `;

      wireDateTimeInputs(document);

      const input = document.getElementById('dt2') as HTMLInputElement;
      expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('handles local datetime strings without timezone', () => {
      document.body.innerHTML = `
        <input 
          type="datetime-local" 
          id="dt3"
          data-datetime-value="2024-03-15T14:30:00"
        />
      `;

      wireDateTimeInputs(document);

      const input = document.getElementById('dt3') as HTMLInputElement;
      expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('handles empty datetime value', () => {
      document.body.innerHTML = `
        <input 
          type="datetime-local" 
          id="dt4"
          data-datetime-value=""
        />
      `;

      wireDateTimeInputs(document);

      const input = document.getElementById('dt4') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('does not re-bind already bound inputs', () => {
      document.body.innerHTML = `
        <input 
          type="datetime-local" 
          id="dt5"
          data-datetime-value="2024-03-15T14:30:00Z"
          data-runtime-datetime-bound="true"
          value="2024-01-01T10:00"
        />
      `;

      wireDateTimeInputs(document);

      const input = document.getElementById('dt5') as HTMLInputElement;
      // Value should remain unchanged because it's already bound
      expect(input.value).toBe('2024-01-01T10:00');
    });

    it('wires multiple datetime inputs', () => {
      document.body.innerHTML = `
        <input 
          type="datetime-local" 
          id="dt6"
          data-datetime-value="2024-03-15T14:30:00Z"
        />
        <input 
          type="datetime-local" 
          id="dt7"
          data-datetime-value="2024-06-20T09:15:00Z"
        />
      `;

      wireDateTimeInputs(document);

      const input1 = document.getElementById('dt6') as HTMLInputElement;
      const input2 = document.getElementById('dt7') as HTMLInputElement;
      
      expect(input1.dataset.runtimeDatetimeBound).toBe('true');
      expect(input2.dataset.runtimeDatetimeBound).toBe('true');
      expect(input1.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(input2.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('works with a specific root element', () => {
      document.body.innerHTML = `
        <div id="container1">
          <input 
            type="datetime-local" 
            id="dt8"
            data-datetime-value="2024-03-15T14:30:00Z"
          />
        </div>
        <div id="container2">
          <input 
            type="datetime-local" 
            id="dt9"
            data-datetime-value="2024-06-20T09:15:00Z"
          />
        </div>
      `;

      const container1 = document.getElementById('container1');
      wireDateTimeInputs(container1);

      const input1 = document.getElementById('dt8') as HTMLInputElement;
      const input2 = document.getElementById('dt9') as HTMLInputElement;
      
      expect(input1.dataset.runtimeDatetimeBound).toBe('true');
      expect(input2.dataset.runtimeDatetimeBound).toBeUndefined();
    });

    it('ignores inputs without data-datetime-value attribute', () => {
      document.body.innerHTML = `
        <input 
          type="datetime-local" 
          id="dt10"
        />
      `;

      wireDateTimeInputs(document);

      const input = document.getElementById('dt10') as HTMLInputElement;
      expect(input.dataset.runtimeDatetimeBound).toBeUndefined();
    });

    it('handles invalid datetime values gracefully', () => {
      document.body.innerHTML = `
        <input 
          type="datetime-local" 
          id="dt11"
          data-datetime-value="not-a-valid-date"
        />
      `;

      wireDateTimeInputs(document);

      const input = document.getElementById('dt11') as HTMLInputElement;
      // Should set the raw value if it can't be parsed
      expect(input.value).toBe('');
      expect(input.dataset.runtimeDatetimeBound).toBe('true');
    });
  });

  describe('wireAll', () => {
    it('wires all datetime inputs in the document', () => {
      document.body.innerHTML = `
        <input 
          type="datetime-local" 
          id="dt12"
          data-datetime-value="2024-03-15T14:30:00Z"
        />
        <input 
          type="datetime-local" 
          id="dt13"
          data-datetime-value="2024-06-20T09:15:00Z"
        />
      `;

      wireAll();

      const input1 = document.getElementById('dt12') as HTMLInputElement;
      const input2 = document.getElementById('dt13') as HTMLInputElement;
      
      expect(input1.dataset.runtimeDatetimeBound).toBe('true');
      expect(input2.dataset.runtimeDatetimeBound).toBe('true');
    });

    it('handles documents with no datetime inputs', () => {
      document.body.innerHTML = '<div>No datetime inputs here</div>';
      
      expect(() => wireAll()).not.toThrow();
    });
  });
});