import { describe, it, expect, beforeEach } from 'vitest';
import { bindAll, init } from './runtime-sections.module';

describe('runtime-sections', () => {
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
    it('wires all section controls in the document', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-collapsible="true">
          <button data-section-toggle>Collapse</button>
          <div class="resolved-children">Content</div>
        </div>
      `;

      bindAll();

      const control = document.querySelector('.resolved-control.widget-section');
      expect(control?.getAttribute('data-section-bound')).toBe('true');
    });

    it('handles documents with no section controls', () => {
      document.body.innerHTML = '<div>No sections here</div>';
      
      expect(() => bindAll()).not.toThrow();
    });
  });

  describe('section control behavior', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-collapsible="true" data-section-collapsed="false">
          <button data-section-toggle>Collapse</button>
          <div class="resolved-children">Section content goes here</div>
        </div>
      `;
      bindAll();
    });

    it('expands section when initially not collapsed', () => {
      const children = document.querySelector('.resolved-children');
      const toggle = document.querySelector('[data-section-toggle]');
      
      expect(children?.hasAttribute('hidden')).toBe(false);
      expect(toggle?.getAttribute('aria-expanded')).toBe('true');
      expect(toggle?.textContent).toBe('Collapse');
    });

    it('collapses section when initially collapsed', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-collapsible="true" data-section-collapsed="true">
          <button data-section-toggle>Expand</button>
          <div class="resolved-children">Section content</div>
        </div>
      `;
      
      bindAll();
      
      const children = document.querySelector('.resolved-children');
      const toggle = document.querySelector('[data-section-toggle]');
      
      expect(children?.hasAttribute('hidden')).toBe(true);
      expect(toggle?.getAttribute('aria-expanded')).toBe('false');
      expect(toggle?.textContent).toBe('Expand');
    });

    it('toggles collapse state when toggle button is clicked', () => {
      const toggle = document.querySelector('[data-section-toggle]') as HTMLButtonElement;
      const children = document.querySelector('.resolved-children');
      const control = document.querySelector('.resolved-control.widget-section');
      
      expect(children?.hasAttribute('hidden')).toBe(false);
      
      toggle.click();
      
      expect(children?.hasAttribute('hidden')).toBe(true);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.textContent).toBe('Expand');
      expect(control?.getAttribute('data-section-collapsed')).toBe('true');
    });

    it('toggles back to expanded state on second click', () => {
      const toggle = document.querySelector('[data-section-toggle]') as HTMLButtonElement;
      const children = document.querySelector('.resolved-children');
      
      toggle.click();
      expect(children?.hasAttribute('hidden')).toBe(true);
      
      toggle.click();
      expect(children?.hasAttribute('hidden')).toBe(false);
      expect(toggle.textContent).toBe('Collapse');
    });

    it('updates aria-expanded attribute correctly', () => {
      const toggle = document.querySelector('[data-section-toggle]') as HTMLButtonElement;
      
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      
      toggle.click();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      
      toggle.click();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });

    it('sets data-section-collapsed attribute on control', () => {
      const control = document.querySelector('.resolved-control.widget-section');
      const toggle = document.querySelector('[data-section-toggle]') as HTMLButtonElement;
      
      expect(control?.getAttribute('data-section-collapsed')).toBe('false');
      
      toggle.click();
      expect(control?.getAttribute('data-section-collapsed')).toBe('true');
      
      toggle.click();
      expect(control?.getAttribute('data-section-collapsed')).toBe('false');
    });
  });

  describe('non-collapsible sections', () => {
    it('does not wire sections without collapsible flag', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-collapsible="false">
          <button data-section-toggle>Toggle</button>
          <div class="resolved-children">Content</div>
        </div>
      `;
      
      bindAll();
      
      const control = document.querySelector('.resolved-control.widget-section');
      const toggle = document.querySelector('[data-section-toggle]') as HTMLButtonElement;
      
      // Should be marked as bound but toggle click should have no effect
      expect(control?.getAttribute('data-section-bound')).toBe('true');
      
      const children = document.querySelector('.resolved-children');
      toggle.click();
      
      expect(children?.hasAttribute('hidden')).toBe(false);
    });

    it('marks as bound even without toggle button', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-collapsible="true">
          <div class="resolved-children">Content</div>
        </div>
      `;
      
      bindAll();
      
      const control = document.querySelector('.resolved-control.widget-section');
      expect(control?.getAttribute('data-section-bound')).toBe('true');
    });
  });

  describe('does not re-bind', () => {
    it('skips already bound sections', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-bound="true" data-section-collapsible="true">
          <button data-section-toggle>Toggle</button>
          <div class="resolved-children" hidden="hidden">Content</div>
        </div>
      `;
      
      bindAll();
      
      const toggle = document.querySelector('[data-section-toggle]') as HTMLButtonElement;
      const children = document.querySelector('.resolved-children');
      
      // Should remain hidden since already bound (not re-wired)
      expect(children?.hasAttribute('hidden')).toBe(true);
      
      toggle.click();
      
      // Still hidden because event listener wasn't added (already bound)
      expect(children?.hasAttribute('hidden')).toBe(true);
    });

    it('marks controls as bound after wiring', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-collapsible="true">
          <button data-section-toggle>Toggle</button>
          <div class="resolved-children">Content</div>
        </div>
      `;
      
      expect(document.querySelector('.resolved-control.widget-section')?.getAttribute('data-section-bound')).toBeNull();
      
      bindAll();
      
      expect(document.querySelector('.resolved-control.widget-section')?.getAttribute('data-section-bound')).toBe('true');
    });
  });

  describe('multiple sections', () => {
    it('handles multiple independent section controls', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" id="section1" data-section-collapsible="true" data-section-collapsed="false">
          <button data-section-toggle>Toggle 1</button>
          <div class="resolved-children">Content 1</div>
        </div>
        <div class="resolved-control widget-section" id="section2" data-section-collapsible="true" data-section-collapsed="true">
          <button data-section-toggle>Toggle 2</button>
          <div class="resolved-children">Content 2</div>
        </div>
      `;
      
      bindAll();
      
      const section1 = document.querySelector('#section1');
      const section2 = document.querySelector('#section2');
      const toggles = document.querySelectorAll('[data-section-toggle]');
      
      expect(section1?.querySelector('.resolved-children')?.hasAttribute('hidden')).toBe(false);
      expect(section2?.querySelector('.resolved-children')?.hasAttribute('hidden')).toBe(true);
      
      (toggles[0] as HTMLButtonElement).click();
      
      expect(section1?.querySelector('.resolved-children')?.hasAttribute('hidden')).toBe(true);
      expect(section2?.querySelector('.resolved-children')?.hasAttribute('hidden')).toBe(true);
      
      (toggles[1] as HTMLButtonElement).click();
      
      expect(section1?.querySelector('.resolved-children')?.hasAttribute('hidden')).toBe(true);
      expect(section2?.querySelector('.resolved-children')?.hasAttribute('hidden')).toBe(false);
    });

    it('maintains independent state for each section', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-collapsible="true" data-section-collapsed="false">
          <button data-section-toggle>Toggle A</button>
          <div class="resolved-children">Content A</div>
        </div>
        <div class="resolved-control widget-section" data-section-collapsible="true" data-section-collapsed="false">
          <button data-section-toggle>Toggle B</button>
          <div class="resolved-children">Content B</div>
        </div>
      `;
      
      bindAll();
      
      const toggles = document.querySelectorAll('[data-section-toggle]');
      const childrenDivs = document.querySelectorAll('.resolved-children');
      
      (toggles[0] as HTMLButtonElement).click();
      
      expect(childrenDivs[0].hasAttribute('hidden')).toBe(true);
      expect(childrenDivs[1].hasAttribute('hidden')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles null control gracefully', () => {
      document.body.innerHTML = '<div>Empty</div>';
      
      expect(() => bindAll()).not.toThrow();
    });

    it('handles section without children element', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-collapsible="true">
          <button data-section-toggle>Toggle</button>
        </div>
      `;
      
      expect(() => bindAll()).not.toThrow();
      
      const toggle = document.querySelector('[data-section-toggle]') as HTMLButtonElement;
      expect(() => toggle.click()).not.toThrow();
    });

    it('handles string "true"/"false" values correctly', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-collapsible="true" data-section-collapsed="true">
          <button data-section-toggle>Toggle</button>
          <div class="resolved-children">Content</div>
        </div>
      `;
      
      bindAll();
      
      const children = document.querySelector('.resolved-children');
      expect(children?.hasAttribute('hidden')).toBe(true);
    });

    it('handles case-insensitive attribute values', () => {
      document.body.innerHTML = `
        <div class="resolved-control widget-section" data-section-collapsible="TRUE" data-section-collapsed="FALSE">
          <button data-section-toggle>Toggle</button>
          <div class="resolved-children">Content</div>
        </div>
      `;
      
      bindAll();
      
      const children = document.querySelector('.resolved-children');
      expect(children?.hasAttribute('hidden')).toBe(false);
    });
  });
});