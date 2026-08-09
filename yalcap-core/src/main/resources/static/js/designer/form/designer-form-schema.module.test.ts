import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formDesignerSchemaApi } from './designer-form-schema.module.js';

describe('designer-form-schema.module', () => {
    let mockContext: any;
    let mockEmitter: any;

    beforeEach(() => {
        window.alert = vi.fn();
        mockEmitter = vi.fn().mockReturnValue(false);
        (window as any).formDesignerSchemaControls = {
            emitters: {
                custom: mockEmitter
            }
        };

        mockContext = {
            selectedControlLocalId: 'control-1',
            controls: [],
            validationErrors: [],
            validationDisplayMode: 'inline-summary',
            selectedTheme: 'default',
            customTheme: null,
            definitionKey: 'test-form',
            definitionJson: '',
            validateControl: vi.fn().mockReturnValue([]),
            normalizeControl: vi.fn((c) => c),
            selectControl: vi.fn(),
            newControlPersistentId: vi.fn(() => 'new-id')
        };
    });

    describe('generate', () => {
        it('validates all controls before generating', () => {
            mockContext.controls = [
                { id: '1', name: 'field1', label: 'Field 1', widget: 'text', type: 'string' }
            ];
            mockContext.validateControl.mockReturnValue(['error']);

            formDesignerSchemaApi.generate.call(mockContext);

            expect(mockContext.validationErrors).toEqual(['Field 1: error']);
        });

        it('returns early if validation errors exist', () => {
            mockContext.controls = [
                { id: '1', name: 'field1', label: 'Field 1', widget: 'text', type: 'string' }
            ];
            mockContext.validateControl.mockReturnValue(['error']);

            formDesignerSchemaApi.generate.call(mockContext);

            expect(window.alert).toHaveBeenCalledWith('Please fix validation issues before generating JSON.');
            expect(mockContext.selectControl).toHaveBeenCalledWith('control-1');
        });

        it('generates dataSchema with simple text control', () => {
            mockContext.controls = [
                { id: '1', name: 'firstName', label: 'First Name', widget: 'text', type: 'string', required: true }
            ];

            formDesignerSchemaApi.generate.call(mockContext);

            const definition = JSON.parse(mockContext.definitionJson);
            expect(definition.form.dataSchema.properties.firstName).toEqual({
                type: 'string',
                title: 'First Name'
            });
            expect(definition.form.dataSchema.required).toContain('firstName');
        });

        it('includes default value in dataSchema', () => {
            mockContext.controls = [
                { id: '1', name: 'status', label: 'Status', widget: 'text', type: 'string', defaultValue: 'active' }
            ];

            formDesignerSchemaApi.generate.call(mockContext);

            const definition = JSON.parse(mockContext.definitionJson);
            expect(definition.form.dataSchema.properties.status.default).toBe('active');
        });

        it('generates checkbox with array type and enum', () => {
            mockContext.controls = [
                {
                    id: '1',
                    name: 'permissions',
                    label: 'Permissions',
                    widget: 'checkbox',
                    type: 'string',
                    options: [
                        { label: 'Read', value: 'read' },
                        { label: 'Write', value: 'write' }
                    ],
                    defaultValue: ['read']
                }
            ];

            formDesignerSchemaApi.generate.call(mockContext);

            const definition = JSON.parse(mockContext.definitionJson);
            expect(definition.form.dataSchema.properties.permissions.type).toBe('array');
            expect(definition.form.dataSchema.properties.permissions.items.enum).toEqual(['read', 'write']);
            expect(definition.form.dataSchema.properties.permissions.default).toEqual(['read']);
        });

        it('generates select with enum values', () => {
            mockContext.controls = [
                {
                    id: '1',
                    name: 'country',
                    label: 'Country',
                    widget: 'select',
                    type: 'string',
                    options: [
                        { label: 'USA', value: 'us' },
                        { label: 'Canada', value: 'ca' }
                    ]
                }
            ];

            formDesignerSchemaApi.generate.call(mockContext);

            const definition = JSON.parse(mockContext.definitionJson);
            expect(definition.form.dataSchema.properties.country.enum).toEqual(['us', 'ca']);
        });

        it('converts number enum values to numbers', () => {
            mockContext.controls = [
                {
                    id: '1',
                    name: 'quantity',
                    label: 'Quantity',
                    widget: 'select',
                    type: 'number',
                    options: [
                        { label: 'One', value: '1' },
                        { label: 'Two', value: '2' }
                    ]
                }
            ];

            formDesignerSchemaApi.generate.call(mockContext);

            const definition = JSON.parse(mockContext.definitionJson);
            expect(definition.form.dataSchema.properties.quantity.enum).toEqual([1, 2]);
            expect(definition.form.dataSchema.properties.quantity.type).toBe('number');
        });

        it('sets format for date widget', () => {
            mockContext.controls = [
                { id: '1', name: 'birthDate', label: 'Birth Date', widget: 'date', type: 'string' }
            ];

            formDesignerSchemaApi.generate.call(mockContext);

            const definition = JSON.parse(mockContext.definitionJson);
            expect(definition.form.dataSchema.properties.birthDate.format).toBe('date');
        });

        it('sets format for datetime widget', () => {
            mockContext.controls = [
                { id: '1', name: 'createdAt', label: 'Created', widget: 'datetime', type: 'string' }
            ];

            formDesignerSchemaApi.generate.call(mockContext);

            const definition = JSON.parse(mockContext.definitionJson);
            expect(definition.form.dataSchema.properties.createdAt.format).toBe('date-time');
        });

        it('generates layout with all properties', () => {
            mockContext.controls = [
                {
                    id: '1',
                    name: 'email',
                    label: 'Email',
                    widget: 'text',
                    type: 'string',
                    required: true,
                    visible: true,
                    enabled: true,
                    colSpan: 6,
                    hint: 'Enter email',
                    help: 'Help text'
                }
            ];

            formDesignerSchemaApi.generate.call(mockContext);

            const definition = JSON.parse(mockContext.definitionJson);
            const layoutItem = definition.form.controlSchema.layout[0];
            expect(layoutItem).toMatchObject({
                id: '1',
                pointer: '#/properties/email',
                widget: 'text',
                label: 'Email',
                required: true,
                visible: true,
                enabled: true,
                colSpan: 6,
                hint: 'Enter email',
                help: 'Help text'
            });
        });

        it('excludes remote autocomplete options from schema', () => {
            mockContext.controls = [
                {
                    id: '1',
                    name: 'user',
                    label: 'User',
                    widget: 'autocomplete',
                    type: 'string',
                    autocompleteSourceType: 'remote',
                    autocompleteSourceUrl: '/api/users',
                    options: [{ label: 'Test', value: 'test' }]
                }
            ];

            formDesignerSchemaApi.generate.call(mockContext);

            const definition = JSON.parse(mockContext.definitionJson);
            expect(definition.form.dataSchema.properties.user.enum).toBeUndefined();
            expect(definition.form.controlSchema.layout[0].autocompleteSourceUrl).toBe('/api/users');
        });

        it('includes rules in definition if present', () => {
            mockContext.controls = [];
            mockContext.normalizedRulesPayload = () => [{ type: 'show', target: 'field1' }];

            formDesignerSchemaApi.generate.call(mockContext);

            const definition = JSON.parse(mockContext.definitionJson);
            expect(definition.rules).toEqual([{ type: 'show', target: 'field1' }]);
        });

        it('handles rules payload error', () => {
            mockContext.controls = [];
            mockContext.normalizedRulesPayload = () => {
                throw new Error('Rules error');
            };

            formDesignerSchemaApi.generate.call(mockContext);

            expect(mockContext.validationErrors[0]).toContain('Rules validation failed');
            expect(window.alert).toHaveBeenCalledWith('Please fix rules validation issues before generating JSON.');
        });

        it('preserves control selection after generation', () => {
            mockContext.controls = [
                { id: '1', name: 'field1', label: 'Field 1', widget: 'text', type: 'string' }
            ];

            formDesignerSchemaApi.generate.call(mockContext);

            expect(mockContext.selectControl).toHaveBeenCalledWith('control-1');
        });
    });
});