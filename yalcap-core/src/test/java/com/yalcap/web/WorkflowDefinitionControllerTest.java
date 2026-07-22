package com.yalcap.web;

import com.yalcap.definition.form.control.CheckboxControlType;
import com.yalcap.definition.form.control.ControlTypeRegistry;
import com.yalcap.definition.form.control.GroupControlType;
import com.yalcap.definition.form.control.RepeatControlType;
import com.yalcap.definition.form.control.SectionControlType;
import com.yalcap.definition.form.control.SelectControlType;
import com.yalcap.definition.form.control.TableControlType;
import com.yalcap.definition.form.control.DateTimeControlType;
import com.yalcap.definition.form.control.TextControlType;
import com.yalcap.definition.workflow.WorkflowDefinitionService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.ui.Model;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.node.ObjectNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class WorkflowDefinitionControllerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void resolveDefinitionHtml_mapsPluginRenderFragmentAndModelForOptionControls() throws Exception {
        WorkflowDefinitionService service = Mockito.mock(WorkflowDefinitionService.class);
        ControlTypeRegistry registry = new ControlTypeRegistry(List.of(
                new SelectControlType(objectMapper),
                new CheckboxControlType(objectMapper)
        ));
        WorkflowDefinitionController controller = new WorkflowDefinitionController(service, registry);

        ObjectNode resolved = objectMapper.createObjectNode();
        ObjectNode definition = resolved.putObject("definition");
        ObjectNode controlSchema = definition.putObject("controlSchema");
        controlSchema.putArray("layout")
                .add(objectMapper.readTree("""
                        {
                          "widget": "select",
                          "stateKey": "country",
                          "label": "Country",
                          "type": "array",
                          "multiple": true,
                          "enabled": true,
                          "options": [
                            {"label": "US", "value": "us"},
                            "CA"
                          ]
                        }
                        """))
                .add(objectMapper.readTree("""
                        {
                          "widget": "checkbox",
                          "stateKey": "tags",
                          "label": "Tags",
                          "enabled": true,
                          "options": ["alpha", "beta"]
                        }
                        """));

        when(service.resolveDefinitionView(eq("sample-workflow"), any())).thenReturn(Optional.of(resolved));

        Model model = new ExtendedModelMap();
        String view = controller.resolveDefinitionHtml("sample-workflow", null, model);

        assertEquals("runtime/resolved-form :: content", view);

        Object controlsValue = model.asMap().get("controls");
        assertInstanceOf(List.class, controlsValue);

        @SuppressWarnings("unchecked")
        List<WorkflowDefinitionController.RenderedControl> controls =
                (List<WorkflowDefinitionController.RenderedControl>) controlsValue;

        assertEquals(2, controls.size());

        WorkflowDefinitionController.RenderedControl select = controls.get(0);
        assertEquals("runtime/controls/select", select.getRenderFragment());
        assertTrue((Boolean) select.getRenderModel().get("multiple"));
        assertEquals("country", select.getStateKey());
        assertEquals(List.of(
                Map.of("label", "US", "value", "us"),
                Map.of("label", "CA", "value", "CA")
        ), select.getRenderModel().get("options"));

        WorkflowDefinitionController.RenderedControl checkbox = controls.get(1);
        assertEquals("runtime/controls/checkbox", checkbox.getRenderFragment());
        assertTrue((Boolean) checkbox.getRenderModel().get("multiple"));
        assertEquals("tags", checkbox.getStateKey());
    }

    @Test
    void resolveDefinitionHtml_mapsMixedControlsWithPluginAndFallbackSemantics() throws Exception {
        WorkflowDefinitionService service = Mockito.mock(WorkflowDefinitionService.class);
        ControlTypeRegistry registry = new ControlTypeRegistry(List.of(
                new SelectControlType(objectMapper),
                new CheckboxControlType(objectMapper),
                new RepeatControlType(objectMapper),
                new TextControlType(objectMapper)
        ));
        WorkflowDefinitionController controller = new WorkflowDefinitionController(service, registry);

        ObjectNode resolved = objectMapper.createObjectNode();
        ObjectNode definition = resolved.putObject("definition");
        ObjectNode controlSchema = definition.putObject("controlSchema");
        controlSchema.putArray("layout")
                .add(objectMapper.readTree("""
                        {
                          "widget": "select",
                          "stateKey": "countries",
                          "label": "Countries",
                          "type": "array",
                          "multiple": true,
                          "enabled": true,
                          "options": ["US", "CA"]
                        }
                        """))
                .add(objectMapper.readTree("""
                        {
                          "widget": "checkbox",
                          "stateKey": "tags",
                          "label": "Tags",
                          "enabled": true,
                          "options": ["alpha", "beta"]
                        }
                        """))
                .add(objectMapper.readTree("""
                        {
                          "widget": "text",
                          "stateKey": "title",
                          "label": "Title",
                          "enabled": true,
                          "placeholder": "Enter title"
                        }
                        """));

        when(service.resolveDefinitionView(eq("sample-mixed-workflow"), any())).thenReturn(Optional.of(resolved));

        Model model = new ExtendedModelMap();
        String view = controller.resolveDefinitionHtml("sample-mixed-workflow", null, model);

        assertEquals("runtime/resolved-form :: content", view);

        @SuppressWarnings("unchecked")
        List<WorkflowDefinitionController.RenderedControl> controls =
                (List<WorkflowDefinitionController.RenderedControl>) model.asMap().get("controls");

        assertEquals(3, controls.size());

        WorkflowDefinitionController.RenderedControl select = controls.get(0);
        assertEquals("runtime/controls/select", select.getRenderFragment());
        assertTrue((Boolean) select.getRenderModel().get("multiple"));

        WorkflowDefinitionController.RenderedControl checkbox = controls.get(1);
        assertEquals("runtime/controls/checkbox", checkbox.getRenderFragment());
        assertTrue((Boolean) checkbox.getRenderModel().get("multiple"));

        WorkflowDefinitionController.RenderedControl text = controls.get(2);
        assertEquals("runtime/controls/text", text.getRenderFragment());
        assertEquals("text", text.getInputType());
        assertEquals("Enter title", text.getPlaceholder());
                                assertFalse(text.getRenderModel().containsKey("multiple"));
                }

    @Test
    void resolveDefinitionHtml_mapsRepeatFragment() throws Exception {
        WorkflowDefinitionService service = Mockito.mock(WorkflowDefinitionService.class);
        ControlTypeRegistry registry = new ControlTypeRegistry(List.of(
                new RepeatControlType(objectMapper),
                new TextControlType(objectMapper)
        ));
        WorkflowDefinitionController controller = new WorkflowDefinitionController(service, registry);

        ObjectNode resolved = objectMapper.createObjectNode();
        ObjectNode definition = resolved.putObject("definition");
        ObjectNode controlSchema = definition.putObject("controlSchema");
        controlSchema.putArray("layout")
                .add(objectMapper.readTree("""
                        {
                          "widget": "repeat",
                          "stateKey": "lineItems",
                          "label": "Line Items",
                          "repeatRenderer": "cards",
                          "repeatMinItems": 1,
                          "repeatMaxItems": 3,
                          "children": [
                            {"widget":"text", "stateKey":"sku", "label":"Sku"}
                          ]
                        }
                        """));

        when(service.resolveDefinitionView(eq("repeat-workflow"), any())).thenReturn(Optional.of(resolved));

        Model model = new ExtendedModelMap();
        controller.resolveDefinitionHtml("repeat-workflow", null, model);

        @SuppressWarnings("unchecked")
        List<WorkflowDefinitionController.RenderedControl> controls =
                (List<WorkflowDefinitionController.RenderedControl>) model.asMap().get("controls");

        assertEquals(1, controls.size());
        WorkflowDefinitionController.RenderedControl repeat = controls.get(0);
        assertEquals("runtime/controls/repeat", repeat.getRenderFragment());
        assertEquals("cards", repeat.getRenderModel().get("renderer"));
        assertEquals(1, repeat.getRenderModel().get("minItems"));
        assertEquals(3, repeat.getRenderModel().get("maxItems"));
        assertEquals(1, repeat.getChildren().size());

        Object runtimeJsAssetsValue = model.asMap().get("runtimeJsAssets");
        assertInstanceOf(List.class, runtimeJsAssetsValue);
        @SuppressWarnings("unchecked")
        List<String> runtimeJsAssets = (List<String>) runtimeJsAssetsValue;
        assertTrue(runtimeJsAssets.contains("/js/runtime/runtime-repeats.js"));
    }

    @Test
    void resolveDefinitionHtml_mapsTableFragmentAndCollectsRuntimeAssets() throws Exception {
        WorkflowDefinitionService service = Mockito.mock(WorkflowDefinitionService.class);
        ControlTypeRegistry registry = new ControlTypeRegistry(List.of(
                new TableControlType(objectMapper),
                new TextControlType(objectMapper)
        ));
        WorkflowDefinitionController controller = new WorkflowDefinitionController(service, registry);

        ObjectNode resolved = objectMapper.createObjectNode();
        ObjectNode definition = resolved.putObject("definition");
        ObjectNode controlSchema = definition.putObject("controlSchema");
        controlSchema.putArray("layout")
                .add(objectMapper.readTree("""
                        {
                          "widget": "table",
                          "stateKey": "lineItems",
                          "label": "Line Items",
                          "tableColumns": [
                            {"key":"sku","title":"SKU","type":"string"}
                          ],
                          "tableMinItems": 1,
                          "tableMaxItems": 3,
                          "enabled": true
                        }
                        """));

        when(service.resolveDefinitionView(eq("table-workflow"), any())).thenReturn(Optional.of(resolved));

        Model model = new ExtendedModelMap();
        controller.resolveDefinitionHtml("table-workflow", null, model);

        @SuppressWarnings("unchecked")
        List<WorkflowDefinitionController.RenderedControl> controls =
                (List<WorkflowDefinitionController.RenderedControl>) model.asMap().get("controls");

        assertEquals(1, controls.size());
        WorkflowDefinitionController.RenderedControl table = controls.get(0);
        assertEquals("runtime/controls/repeat", table.getRenderFragment());
        assertEquals("table", table.getRenderModel().get("renderer"));
        assertEquals(1, table.getRenderModel().get("minItems"));
        assertEquals(3, table.getRenderModel().get("maxItems"));

        Object runtimeJsAssetsValue = model.asMap().get("runtimeJsAssets");
        assertInstanceOf(List.class, runtimeJsAssetsValue);
        @SuppressWarnings("unchecked")
        List<String> runtimeJsAssets = (List<String>) runtimeJsAssetsValue;
        assertTrue(runtimeJsAssets.contains("/js/runtime/runtime-repeats.js"));

        Object runtimeCssAssetsValue = model.asMap().get("runtimeCssAssets");
        assertInstanceOf(List.class, runtimeCssAssetsValue);
        @SuppressWarnings("unchecked")
        List<String> runtimeCssAssets = (List<String>) runtimeCssAssetsValue;
        assertTrue(runtimeCssAssets.contains("/css/runtime/runtime-print.css"));
    }

    @Test
    void resolveDefinitionHtml_localizesDatetimeValueFromResolvedData() throws Exception {
        WorkflowDefinitionService service = Mockito.mock(WorkflowDefinitionService.class);
        ControlTypeRegistry registry = new ControlTypeRegistry(List.of(
                new DateTimeControlType(objectMapper)
        ));
        WorkflowDefinitionController controller = new WorkflowDefinitionController(service, registry);

        ObjectNode resolved = objectMapper.createObjectNode();
        ObjectNode definition = resolved.putObject("definition");
        ObjectNode controlSchema = definition.putObject("controlSchema");
        controlSchema.putArray("layout")
                .add(objectMapper.readTree("""
                        {
                          "widget": "datetime",
                          "stateKey": "scheduledAt",
                          "label": "Scheduled At",
                          "enabled": true
                        }
                        """));
        resolved.putObject("data").put("scheduledAt", "2026-07-22T12:00:00Z");

        when(service.resolveDefinitionView(eq("datetime-workflow"), any())).thenReturn(Optional.of(resolved));

        Model model = new ExtendedModelMap();
        controller.resolveDefinitionHtml("datetime-workflow", null, model);

        @SuppressWarnings("unchecked")
        List<WorkflowDefinitionController.RenderedControl> controls =
                (List<WorkflowDefinitionController.RenderedControl>) model.asMap().get("controls");

        assertEquals(1, controls.size());
        WorkflowDefinitionController.RenderedControl datetime = controls.get(0);
        assertEquals("runtime/controls/datetime", datetime.getRenderFragment());
        assertNotNull(datetime.getRenderModel().get("value"));
        assertTrue(String.valueOf(datetime.getRenderModel().get("value")).matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}"));
        assertFalse("2026-07-22T12:00:00Z".equals(String.valueOf(datetime.getRenderModel().get("value"))));
    }

    @Test
    void resolveDefinitionHtml_mapsSectionAndGroupFragments() throws Exception {
        WorkflowDefinitionService service = Mockito.mock(WorkflowDefinitionService.class);
        ControlTypeRegistry registry = new ControlTypeRegistry(List.of(
                new SectionControlType(objectMapper),
                new GroupControlType(objectMapper),
                new TextControlType(objectMapper)
        ));
        WorkflowDefinitionController controller = new WorkflowDefinitionController(service, registry);

        ObjectNode resolved = objectMapper.createObjectNode();
        ObjectNode definition = resolved.putObject("definition");
        ObjectNode controlSchema = definition.putObject("controlSchema");
        controlSchema.putArray("layout")
                .add(objectMapper.readTree("""
                        {
                          "widget": "section",
                          "stateKey": "reviewSection",
                          "label": "Review",
                          "sectionDescription": "Review details",
                          "sectionCollapsible": true,
                          "sectionDefaultExpanded": false,
                          "collapsed": true,
                          "children": [
                            {
                              "widget": "group",
                              "name": "address",
                              "label": "Address",
                              "groupDescription": "Address fields",
                              "children": [
                                {"widget":"text", "stateKey":"street", "label":"Street"}
                              ]
                            }
                          ]
                        }
                        """));

        when(service.resolveDefinitionView(eq("sample-layout-workflow"), any())).thenReturn(Optional.of(resolved));

        Model model = new ExtendedModelMap();
        controller.resolveDefinitionHtml("sample-layout-workflow", null, model);

        @SuppressWarnings("unchecked")
        List<WorkflowDefinitionController.RenderedControl> controls =
                (List<WorkflowDefinitionController.RenderedControl>) model.asMap().get("controls");

        assertEquals(1, controls.size());

        WorkflowDefinitionController.RenderedControl section = controls.get(0);
        assertEquals("runtime/controls/section", section.getRenderFragment());
        assertEquals("Review details", section.getRenderModel().get("description"));
        assertEquals(true, section.getRenderModel().get("collapsible"));
        assertEquals(false, section.getRenderModel().get("defaultExpanded"));
        assertEquals(true, section.getRenderModel().get("collapsed"));
        assertEquals(1, section.getChildren().size());

        WorkflowDefinitionController.RenderedControl group = section.getChildren().get(0);
        assertEquals("runtime/controls/group", group.getRenderFragment());
        assertEquals("address", group.getRenderModel().get("name"));
        assertEquals("Address fields", group.getRenderModel().get("description"));

        Object runtimeJsAssetsValue = model.asMap().get("runtimeJsAssets");
        assertInstanceOf(List.class, runtimeJsAssetsValue);
        @SuppressWarnings("unchecked")
        List<String> runtimeJsAssets = (List<String>) runtimeJsAssetsValue;
        assertTrue(runtimeJsAssets.contains("/js/runtime/runtime-sections.js"));
    }

    @Test
    void resolveDefinitionHtml_throwsNotFoundWhenDefinitionMissing() {
        WorkflowDefinitionService service = Mockito.mock(WorkflowDefinitionService.class);
        ControlTypeRegistry registry = new ControlTypeRegistry(List.of(
                new SelectControlType(objectMapper),
                new CheckboxControlType(objectMapper)
        ));
        WorkflowDefinitionController controller = new WorkflowDefinitionController(service, registry);

        when(service.resolveDefinitionView(eq("missing-workflow"), any())).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> controller.resolveDefinitionHtml("missing-workflow", null, new ExtendedModelMap())
        );

        assertEquals(404, ex.getStatusCode().value());
    }
}
