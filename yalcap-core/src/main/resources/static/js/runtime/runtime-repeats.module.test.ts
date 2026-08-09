import { describe, it, expect, beforeEach } from 'vitest';
import { bindAll, init } from './runtime-repeats.module';

describe('runtime-repeats', () => {
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
        it('wires all repeat controls in the document', () => {
            document.body.innerHTML = `
        <div class="resolved-control widget-repeat">
          <div class="resolved-children" data-repeat-template>
            <input type="text" name="item" />
          </div>
          <button data-repeat-add>Add</button>
        </div>
      `;

            bindAll();

            const control = document.querySelector('.resolved-control.widget-repeat');
            expect(control?.getAttribute('data-repeat-bound')).toBe('true');
        });

        it('handles documents with no repeat controls', () => {
            document.body.innerHTML = '<div>No repeats here</div>';

            expect(() => bindAll()).not.toThrow();
        });
    });

    describe('repeat control behavior', () => {
        beforeEach(() => {
            document.body.innerHTML = `
        <div class="resolved-control widget-repeat" data-repeat-min-items="1" data-repeat-max-items="5">
          <div class="resolved-children" data-repeat-template>
            <input type="text" name="item" placeholder="Enter item" />
          </div>
          <button data-repeat-add>Add Item</button>
        </div>
      `;
            bindAll();
        });

        it('creates initial row from template', () => {
            const rows = document.querySelectorAll('.runtime-repeat-row');
            expect(rows.length).toBe(1);
        });

        it('creates rows with remove button', () => {
            const removeButton = document.querySelector('.runtime-repeat-remove');
            expect(removeButton).toBeTruthy();
            expect(removeButton?.textContent).toBe('Remove');
        });

        it('adds a new row when add button is clicked', () => {
            const addButton = document.querySelector('[data-repeat-add]') as HTMLButtonElement;

            expect(document.querySelectorAll('.runtime-repeat-row').length).toBe(1);

            addButton.click();

            expect(document.querySelectorAll('.runtime-repeat-row').length).toBe(2);
        });

        it('removes row when remove button is clicked', () => {
            const addButton = document.querySelector('[data-repeat-add]') as HTMLButtonElement;
            addButton.click();

            expect(document.querySelectorAll('.runtime-repeat-row').length).toBe(2);

            const removeButtons = document.querySelectorAll('.runtime-repeat-remove');
            (removeButtons[1] as HTMLButtonElement).click();

            expect(document.querySelectorAll('.runtime-repeat-row').length).toBe(1);
        });

        it('respects max items constraint', () => {
            const addButton = document.querySelector('[data-repeat-add]') as HTMLButtonElement;

            for (let i = 0; i < 10; i += 1) {
                addButton.click();
            }

            // Should only have 5 rows (max-items=5)
            expect(document.querySelectorAll('.runtime-repeat-row').length).toBe(5);
        });

        it('disables add button when max items reached', () => {
            const addButton = document.querySelector('[data-repeat-add]') as HTMLButtonElement;

            expect(addButton.disabled).toBe(false);

            for (let i = 0; i < 4; i += 1) {
                addButton.click();
            }

            expect(addButton.disabled).toBe(true);
        });

        it('disables remove button when min items reached', () => {
            const removeButtons = document.querySelectorAll('.runtime-repeat-remove');
            const firstRemoveButton = removeButtons[0] as HTMLButtonElement;

            // Only 1 row (min-items=1), so remove should be disabled
            expect(firstRemoveButton.disabled).toBe(true);
        });

        it('enables remove button when rows exceed min items', () => {
            const addButton = document.querySelector('[data-repeat-add]') as HTMLButtonElement;
            addButton.click();

            const removeButtons = document.querySelectorAll('.runtime-repeat-remove');
            const firstRemoveButton = removeButtons[0] as HTMLButtonElement;

            expect(firstRemoveButton.disabled).toBe(false);
        });

        it('dispenses repeat:rows-changed event when row is added', async () => {
            const rowsHost = document.querySelector('.runtime-repeat-rows')!;
            const addButton = document.querySelector('[data-repeat-add]') as HTMLButtonElement;

            const eventPromise = new Promise<void>((resolve) => {
                rowsHost.addEventListener('repeat:rows-changed', () => {
                    resolve();
                }, { once: true });
            });

            addButton.click();

            await eventPromise;
        });

        it('dispenses repeat:rows-changed event when row is removed', async () => {
            const addButton = document.querySelector('[data-repeat-add]') as HTMLButtonElement;
            addButton.click();

            const rowsHost = document.querySelector('.runtime-repeat-rows')!;
            const removeButtons = document.querySelectorAll('.runtime-repeat-remove');

            const eventPromise = new Promise<void>((resolve) => {
                rowsHost.addEventListener('repeat:rows-changed', () => {
                    resolve();
                }, { once: true });
            });

            (removeButtons[1] as HTMLButtonElement).click();

            await eventPromise;
        });

        it('preserves template content in new rows', () => {
            const addButton = document.querySelector('[data-repeat-add]') as HTMLButtonElement;
            addButton.click();

            const inputs = document.querySelectorAll('.runtime-repeat-row-body input[name="item"]');
            expect(inputs.length).toBe(2);

            for (let i = 0; i < inputs.length; i += 1) {
                expect((inputs[i] as HTMLInputElement).placeholder).toBe('Enter item');
            }
        });
    });

    describe('min/max items constraints', () => {
        it('creates multiple initial rows when min items > 1', () => {
            document.body.innerHTML = `
        <div class="resolved-control widget-repeat" data-repeat-min-items="3">
          <div class="resolved-children" data-repeat-template>
            <input type="text" />
          </div>
          <button data-repeat-add>Add</button>
        </div>
      `;

            bindAll();

            expect(document.querySelectorAll('.runtime-repeat-row').length).toBe(3);
        });

        it('creates at least 1 row when min items is 0', () => {
            document.body.innerHTML = `
        <div class="resolved-control widget-repeat" data-repeat-min-items="0">
          <div class="resolved-children" data-repeat-template>
            <input type="text" />
          </div>
          <button data-repeat-add>Add</button>
        </div>
      `;

            bindAll();

            expect(document.querySelectorAll('.runtime-repeat-row').length).toBe(1);
        });

        it('ensures max items >= min items', () => {
            document.body.innerHTML = `
        <div class="resolved-control widget-repeat" data-repeat-min-items="5" data-repeat-max-items="2">
          <div class="resolved-children" data-repeat-template>
            <input type="text" />
          </div>
          <button data-repeat-add>Add</button>
        </div>
      `;

            bindAll();

            const addButton = document.querySelector('[data-repeat-add]') as HTMLButtonElement;
            // Should be able to add up to 5 since max was adjusted to match min
            for (let i = 0; i < 10; i += 1) {
                addButton.click();
            }

            expect(document.querySelectorAll('.runtime-repeat-row').length).toBe(5);
        });
    });

    describe('multiple repeat controls', () => {
        it('handles multiple independent repeat controls', () => {
            document.body.innerHTML = `
        <div class="resolved-control widget-repeat" data-repeat-min-items="1" data-repeat-max-items="3" id="repeat1">
          <div class="resolved-children" data-repeat-template>
            <input type="text" placeholder="Type A" />
          </div>
          <button data-repeat-add>Add</button>
        </div>
        <div class="resolved-control widget-repeat" data-repeat-min-items="1" data-repeat-max-items="5" id="repeat2">
          <div class="resolved-children" data-repeat-template>
            <input type="text" placeholder="Type B" />
          </div>
          <button data-repeat-add>Add</button>
        </div>
      `;

            bindAll();

            const repeat1 = document.querySelector('#repeat1');
            const repeat2 = document.querySelector('#repeat2');
            const addButtons = document.querySelectorAll('[data-repeat-add]');

            // Add to first control
            (addButtons[0] as HTMLButtonElement).click();
            (addButtons[0] as HTMLButtonElement).click();

            // Add to second control
            (addButtons[1] as HTMLButtonElement).click();

            const rows1 = repeat1?.querySelectorAll('.runtime-repeat-row') || [];
            const rows2 = repeat2?.querySelectorAll('.runtime-repeat-row') || [];

            expect(rows1.length).toBe(3);
            expect(rows2.length).toBe(2);
        });
    });

    describe('does not re-bind', () => {
        it('skips already bound controls', () => {
            document.body.innerHTML = `
        <div class="resolved-control widget-repeat" data-repeat-bound="true">
          <div class="resolved-children" data-repeat-template>
            <input type="text" />
          </div>
          <button data-repeat-add>Add</button>
        </div>
      `;

            bindAll();

            // Should not create rows since already bound
            expect(document.querySelectorAll('.runtime-repeat-row').length).toBe(0);
        });

        it('marks controls as bound after wiring', () => {
            document.body.innerHTML = `
        <div class="resolved-control widget-repeat">
          <div class="resolved-children" data-repeat-template>
            <input type="text" />
          </div>
          <button data-repeat-add>Add</button>
        </div>
      `;

            expect(document.querySelector('.resolved-control.widget-repeat')?.getAttribute('data-repeat-bound')).toBeNull();

            bindAll();

            expect(document.querySelector('.resolved-control.widget-repeat')?.getAttribute('data-repeat-bound')).toBe('true');
        });
    });
});