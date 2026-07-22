package com.yalcap.definition.form.control;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ControlTypeSemanticsTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void select_validate_rejectsMultipleWithoutArrayType() throws Exception {
        SelectControlType controlType = new SelectControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "select",
                  "type": "string",
                  "multiple": true,
                  "options": ["A", "B"]
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[0]", errors));

        assertEquals(1, errors.all().size());
        assertEquals("form.controlSchema.layout[0].type must be 'array' when select.multiple is enabled", errors.all().get(0));
    }

    @Test
    void select_render_setsMultipleAndNormalizesOptionsForArrayType() throws Exception {
        SelectControlType controlType = new SelectControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "select",
                  "type": "array",
                  "options": [
                    {"label": "One", "value": "1"},
                    "Two"
                  ]
                }
                """);

        ControlTypeRenderSpec spec = controlType.render(renderContext(control)).orElseThrow();

        assertEquals("runtime/controls/select", spec.fragmentName());
        assertEquals(true, spec.model().get("multiple"));
        assertEquals(List.of(
                Map.of("label", "One", "value", "1"),
                Map.of("label", "Two", "value", "Two")
        ), spec.model().get("options"));
    }

    @Test
    void checkbox_render_marksAsMultipleAndNormalizesOptions() throws Exception {
        CheckboxControlType controlType = new CheckboxControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "checkbox",
                  "options": [
                    {"label": "Alpha", "value": "A"},
                    "Beta"
                  ]
                }
                """);

        ControlTypeRenderSpec spec = controlType.render(renderContext(control)).orElseThrow();

        assertEquals("runtime/controls/checkbox", spec.fragmentName());
        assertEquals(true, spec.model().get("multiple"));
        assertEquals(List.of(
                Map.of("label", "Alpha", "value", "A"),
                Map.of("label", "Beta", "value", "Beta")
        ), spec.model().get("options"));
    }

    @Test
    void radio_validate_requiresOptions() throws Exception {
        RadioControlType controlType = new RadioControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "radio",
                  "options": []
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[2]", errors));

        assertEquals(List.of("form.controlSchema.layout[2].options is required for radio widget"), errors.all());
    }

    @Test
    void autocomplete_validate_remoteRequiresSourceUrlButNotStaticOptions() throws Exception {
        AutocompleteControlType controlType = new AutocompleteControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "autocomplete",
                  "autocompleteSourceType": "remote",
                  "options": []
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[1]", errors));

        assertEquals(List.of("form.controlSchema.layout[1].autocompleteSourceUrl is required for remote autocomplete widget"), errors.all());
    }

    @Test
    void autocomplete_render_defaultsToStaticAndMarksAsSingleValue() throws Exception {
        AutocompleteControlType controlType = new AutocompleteControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "autocomplete",
                  "autocompleteSourceType": "invalid-value",
                  "autocompleteLabelField": "text",
                  "autocompleteValueField": "id",
                  "autocompleteSearchParam": "term",
                  "options": ["A"]
                }
                """);

        ControlTypeRenderSpec spec = controlType.render(renderContext(control)).orElseThrow();

        assertEquals("runtime/controls/autocomplete", spec.fragmentName());
        assertEquals("static", spec.model().get("sourceType"));
        assertEquals(false, spec.model().get("multiple"));
        assertEquals("text", spec.model().get("labelField"));
        assertEquals("id", spec.model().get("valueField"));
        assertEquals("term", spec.model().get("searchParam"));
        assertEquals(2, spec.model().get("minChars"));
        assertEquals(25, spec.model().get("maxResults"));
        assertEquals(false, spec.model().get("allowFreeText"));

        ControlTypeClientAssets assets = controlType.descriptor().clientAssets();
        assertTrue(assets.runtimeJs().contains("/js/runtime/runtime-autocomplete.js"));
        assertTrue(assets.designerJs().contains("/js/designer/control/autocomplete/designer-autocomplete.js"));
          }

          @Test
          void autocomplete_validate_rejectsInvalidQueryGuardrails() throws Exception {
        AutocompleteControlType controlType = new AutocompleteControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
          {
            "widget": "autocomplete",
            "autocompleteSourceType": "remote",
            "autocompleteSourceUrl": "/api/lookups/cities",
            "autocompleteMinChars": 0,
            "autocompleteMaxResults": -1,
            "options": []
          }
          """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[4]", errors));

        assertEquals(List.of(
          "form.controlSchema.layout[4].autocompleteMinChars must be >= 1 when provided",
          "form.controlSchema.layout[4].autocompleteMaxResults must be >= 1 when provided"
        ), errors.all());
    }

    @Test
    void controlOptionSupport_skipsInvalidOptions() throws Exception {
        JsonNode options = objectMapper.readTree("""
                [
                  null,
                  {},
                  {"label": "", "value": ""},
                  {"label": "OnlyLabel"},
                  {"value": "OnlyValue"},
                  "Plain"
                ]
                """);

        List<Map<String, String>> normalized = ControlOptionSupport.normalizeOptions(options);

        assertEquals(List.of(
                Map.of("label", "OnlyLabel", "value", "OnlyLabel"),
                Map.of("label", "OnlyValue", "value", "OnlyValue"),
                Map.of("label", "Plain", "value", "Plain")
        ), normalized);
    }

    @Test
    void select_validate_acceptsArrayTypeWhenMultiple() throws Exception {
        SelectControlType controlType = new SelectControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "select",
                  "type": "array",
                  "multiple": true,
                  "options": ["A"]
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[0]", errors));

        assertFalse(errors.hasErrors());
    }

    @Test
    void checkbox_validate_requiresOptions() throws Exception {
        CheckboxControlType controlType = new CheckboxControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "checkbox",
                  "options": []
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[3]", errors));

        assertTrue(errors.hasErrors());
        assertEquals("form.controlSchema.layout[3].options is required for checkbox widget", errors.all().get(0));
    }

    @Test
    void section_validate_requiresChildren() throws Exception {
        SectionControlType controlType = new SectionControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "section",
                  "label": "Review Details",
                  "children": []
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[5]", errors));

        assertEquals(List.of("form.controlSchema.layout[5].children is required for section widget"), errors.all());
    }

    @Test
    void section_render_mapsDescriptionAndCollapseFlags() throws Exception {
        SectionControlType controlType = new SectionControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "section",
                  "sectionDescription": "Review and approve",
                  "sectionCollapsible": true,
                  "sectionDefaultExpanded": false,
                  "children": [{"widget":"text","stateKey":"notes"}]
                }
                """);

        ControlTypeRenderSpec spec = controlType.render(renderContext(control)).orElseThrow();

        assertEquals("runtime/controls/section", spec.fragmentName());
        assertEquals("Review and approve", spec.model().get("description"));
        assertEquals(true, spec.model().get("collapsible"));
        assertEquals(false, spec.model().get("defaultExpanded"));
    }

    @Test
    void group_validate_requiresNameAndChildren() throws Exception {
        GroupControlType controlType = new GroupControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "group",
                  "children": []
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[6]", errors));

        assertEquals(List.of(
                "form.controlSchema.layout[6].name is required for group widget",
                "form.controlSchema.layout[6].children is required for group widget"
        ), errors.all());
    }

    @Test
    void group_render_mapsNameAndDescription() throws Exception {
        GroupControlType controlType = new GroupControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "group",
                  "name": "address",
                  "groupDescription": "Address details",
                  "children": [{"widget":"text","stateKey":"street"}]
                }
                """);

        ControlTypeRenderSpec spec = controlType.render(renderContext(control)).orElseThrow();

        assertEquals("runtime/controls/group", spec.fragmentName());
        assertEquals("address", spec.model().get("name"));
        assertEquals("Address details", spec.model().get("description"));
    }

    @Test
    void repeat_render_mapsRendererAndBounds() throws Exception {
        RepeatControlType controlType = new RepeatControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "repeat",
                  "repeatRenderer": "cards",
                  "repeatMinItems": 2,
                  "repeatMaxItems": 5,
                  "children": [{"widget":"text", "stateKey":"name"}]
                }
                """);

        ControlTypeRenderSpec spec = controlType.render(renderContext(control)).orElseThrow();

        assertEquals("runtime/controls/repeat", spec.fragmentName());
        assertEquals("cards", spec.model().get("renderer"));
        assertEquals(2, spec.model().get("minItems"));
        assertEquals(5, spec.model().get("maxItems"));

        ControlTypeClientAssets assets = controlType.descriptor().clientAssets();
        assertTrue(assets.runtimeJs().contains("/js/runtime/runtime-repeats.js"));
        assertTrue(assets.designerJs().contains("/js/designer/control/repeat/designer-repeat.js"));
    }

    @Test
    void table_render_mapsBoundsAndDeclaresTableAssets() throws Exception {
        TableControlType controlType = new TableControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "table",
                  "tableColumns": [
                    {"key": "sku", "title": "SKU"}
                  ],
                  "tableMinItems": 1,
                  "tableMaxItems": 4
                }
                """);

        ControlTypeRenderSpec spec = controlType.render(renderContext(control)).orElseThrow();

        assertEquals("runtime/controls/repeat", spec.fragmentName());
        assertEquals("table", spec.model().get("renderer"));
        assertEquals(1, spec.model().get("minItems"));
        assertEquals(4, spec.model().get("maxItems"));

        ControlTypeClientAssets assets = controlType.descriptor().clientAssets();
        assertTrue(assets.runtimeJs().contains("/js/runtime/runtime-repeats.js"));
        assertTrue(assets.designerJs().contains("/js/designer/control/table/designer-table.js"));
    }

    @Test
    void table_validate_requiresColumns() throws Exception {
        TableControlType controlType = new TableControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "table",
                  "tableColumns": []
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[10]", errors));

        assertEquals(List.of("form.controlSchema.layout[10].columns is required for table widget"), errors.all());
    }

    @Test
    void repeat_validate_requiresChildrenOrColumns() throws Exception {
        RepeatControlType controlType = new RepeatControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "repeat",
                  "children": []
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[7]", errors));

        assertEquals(List.of("form.controlSchema.layout[7].children or .columns is required for repeat widget"), errors.all());
    }

    @Test
    void repeat_validate_rejectsMultipleChildren() throws Exception {
        RepeatControlType controlType = new RepeatControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "repeat",
                  "children": [
                    {"widget":"text", "stateKey":"a"},
                    {"widget":"text", "stateKey":"b"}
                  ]
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[8]", errors));

        assertEquals(List.of("form.controlSchema.layout[8].children must contain exactly one item for repeat widget"), errors.all());
    }

    @Test
    void repeat_validate_rejectsSectionAsChild() throws Exception {
        RepeatControlType controlType = new RepeatControlType(objectMapper);
        JsonNode control = objectMapper.readTree("""
                {
                  "widget": "repeat",
                  "children": [
                    {"widget":"section", "children":[{"widget":"text", "stateKey":"x"}]}
                  ]
                }
                """);

        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(validationContext(control, "form.controlSchema.layout[9]", errors));

        assertEquals(List.of("form.controlSchema.layout[9].children[0] must be a group or scalar control for repeat widget"), errors.all());
    }

    private ControlTypeValidationContext validationContext(JsonNode control, String controlPath, ControlTypeValidationErrors errors) {
        return new ControlTypeValidationContext(control, controlPath, errors, Locale.US, ControlTextDirection.LTR);
    }

    private ControlTypeRenderContext renderContext(JsonNode control) {
        return new ControlTypeRenderContext(control, null, null, Map.of(), Locale.US, ControlTextDirection.LTR);
    }
}