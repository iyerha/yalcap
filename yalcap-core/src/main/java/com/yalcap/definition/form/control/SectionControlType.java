package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class SectionControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public SectionControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("sectionDescription").put("type", "string");
        properties.putObject("sectionCollapsible").put("type", "boolean");
        properties.putObject("sectionDefaultExpanded").put("type", "boolean");
        properties.putObject("children").put("type", "array");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "section");
        defaultConfig.put("type", "object");
        defaultConfig.put("required", false);
        defaultConfig.put("sectionCollapsible", false);
        defaultConfig.put("sectionDefaultExpanded", true);

        this.descriptor = new ControlTypeDescriptor(
                "section",
                "Section",
                "control.type.section",
                propertySchema,
                defaultConfig,
            new ControlTypeClientAssets(
                java.util.List.of(),
                java.util.List.of("/js/runtime/runtime-sections.js"),
                java.util.List.of("/css/designer/control/container/designer-container.css"),
                java.util.List.of()
            )
        );
    }

    @Override
    public String type() {
        return "section";
    }

    @Override
    public ControlTypeDescriptor descriptor() {
        return descriptor;
    }

    @Override
    public void validate(ControlTypeValidationContext context) {
        if (context == null || context.control() == null || context.errors() == null) {
            return;
        }

        JsonNode children = context.control().path("children");
        if (!children.isArray() || children.isEmpty()) {
            context.errors().add(context.controlPath() + ".children is required for section widget");
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        Map<String, Object> model = new LinkedHashMap<>();
        boolean collapsible = context.control().path("sectionCollapsible").asBoolean(false);
        boolean defaultExpanded = context.control().path("sectionDefaultExpanded").asBoolean(true);
        boolean collapsed = context.control().path("collapsed").asBoolean(collapsible && !defaultExpanded);

        model.put("description", context.control().path("sectionDescription").asString("").trim());
        model.put("collapsible", collapsible);
        model.put("defaultExpanded", context.control().path("sectionDefaultExpanded").asBoolean(true));
        model.put("collapsed", collapsible && collapsed);

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/section", model));
    }
}
