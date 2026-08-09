import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formDesignerSchemaControls } from './designer-form-schema-controls.module.js';

describe('designer-form-schema-controls.module', () => {
    let mockContext: any;

    beforeEach(() => {
        mockContext = {
            control: {},
            schemaProperties: {},
            schemaRequired: [],
            layoutTarget: [],
            pointerBase: '/properties',
            newControlId: vi.fn(() => 'new-id'),
            processControls: vi.fn()
        };
    });

    describe('emitters', () => {
        it('exports emitters object', () => {
            expect(formDesignerSchemaControls.emitters).toBeDefined();
            expect(typeof formDesignerSchemaControls.emitters).toBe('object');
        });

        it('section emitter creates section layout with children', () => {
            mockContext.control = {
                id: 'section-1',
                widget: 'section',
                name: 'personalInfo',
                label: 'Personal Information',
                sectionCollapsible: true,
                children: []
            };

            const result = formDesignerSchemaControls.emitters.section(mockContext);

            expect(result).toBe(true);
            expect(mockContext.layoutTarget).toHaveLength(1);
            expect(mockContext.layoutTarget[0].widget).toBe('section');
            expect(mockContext.layoutTarget[0].collapsible).toBe(true);
            expect(mockContext.processControls).toHaveBeenCalled();
        });

        it('group emitter creates object schema and layout', () => {
            mockContext.control = {
                id: 'group-1',
                widget: 'group',
                name: 'address',
                label: 'Address',
                required: true,
                children: []
            };

            const result = formDesignerSchemaControls.emitters.group(mockContext);

            expect(result).toBe(true);
            expect(mockContext.schemaProperties.address).toBeDefined();
            expect(mockContext.schemaProperties.address.type).toBe('object');
            expect(mockContext.schemaRequired).toContain('address');
            expect(mockContext.layoutTarget[0].widget).toBe('group');
        });

        it('repeat emitter creates array schema with items', () => {
            mockContext.control = {
                id: 'repeat-1',
                widget: 'repeat',
                name: 'items',
                label: 'Items',
                required: true,
                children: []
            };

            const result = formDesignerSchemaControls.emitters.repeat(mockContext);

            expect(result).toBe(true);
            expect(mockContext.schemaProperties.items).toBeDefined();
            expect(mockContext.schemaProperties.items.type).toBe('array');
            expect(mockContext.schemaRequired).toContain('items');
        });

        it('table emitter creates array with columns', () => {
            mockContext.control = {
                id: 'table-1',
                widget: 'table',
                name: 'records',
                label: 'Records',
                tableColumns: [
                    { key: 'col1', title: 'Column 1', type: 'string', required: true }
                ]
            };

            const result = formDesignerSchemaControls.emitters.table(mockContext);

            expect(result).toBe(true);
            expect(mockContext.schemaProperties.records.type).toBe('array');
            expect(mockContext.layoutTarget[0].renderer).toBe('table');
        });

        it('upload emitter handles single file', () => {
            mockContext.control = {
                id: 'upload-1',
                widget: 'upload',
                name: 'document',
                label: 'Document',
                uploadAllowMultiple: false
            };

            const result = formDesignerSchemaControls.emitters.upload(mockContext);

            expect(result).toBe(true);
            expect(mockContext.schemaProperties.document.type).toBe('string');
            expect(mockContext.layoutTarget[0].widget).toBe('upload');
            expect(mockContext.layoutTarget[0].multiple).toBe(false);
        });

        it('message emitter creates message layout', () => {
            mockContext.control = {
                id: 'msg-1',
                widget: 'message',
                label: 'Info',
                messageTone: 'warning',
                messageBody: 'Important notice'
            };

            const result = formDesignerSchemaControls.emitters.message(mockContext);

            expect(result).toBe(true);
            expect(mockContext.layoutTarget[0].widget).toBe('message');
            expect(mockContext.layoutTarget[0].tone).toBe('warning');
        });
    });
});