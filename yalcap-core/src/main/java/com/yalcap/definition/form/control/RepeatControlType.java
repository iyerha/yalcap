package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class RepeatControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public RepeatControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("repeatRenderer").put("type", "string");
        properties.putObject("repeatMinItems").put("type", "integer");
        properties.putObject("repeatMaxItems").put("type", "integer");
        properties.putObject("children").put("type", "array");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "repeat");
        defaultConfig.put("type", "array");
        defaultConfig.put("required", false);
        defaultConfig.put("repeatRenderer", "table");
        defaultConfig.put("repeatMinItems", 0);
        defaultConfig.put("repeatMaxItems", 0);

        this.descriptor = new ControlTypeDescriptor(
                "repeat",
                "Repeat",
                "control.type.repeat",
                propertySchema,
                defaultConfig,
            new ControlTypeClientAssets(
                    java.util.List.of(
                        "/js/designer/control/repeat/designer-repeat.js"
                    ),
                java.util.List.of("/js/runtime/runtime-repeats.js"),
                java.util.List.of("/css/designer/control/container/designer-container.css"),
                java.util.List.of()
            )
        );
    }

    @Override
    public String type() {
        return "repeat";
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
        JsonNode columns = context.control().path("columns");
        JsonNode tableColumns = context.control().path("tableColumns");
        boolean hasChildren = children.isArray() && !children.isEmpty();
        boolean hasColumns = (columns.isArray() && !columns.isEmpty())
                || (tableColumns.isArray() && !tableColumns.isEmpty());
        if (!hasChildren && !hasColumns) {
            context.errors().add(context.controlPath() + ".children or .columns is required for repeat widget");
            return;
        }

        if (hasChildren) {
            if (children.size() != 1) {
                context.errors().add(context.controlPath() + ".children must contain exactly one item for repeat widget");
                return;
            }

            JsonNode onlyChild = children.get(0);
            String childWidget = onlyChild == null ? "" : onlyChild.path("widget").asString("").trim().toLowerCase();
            if ("repeat".equals(childWidget) || "section".equals(childWidget)) {
                context.errors().add(context.controlPath() + ".children[0] must be a group or scalar control for repeat widget");
            }
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        String renderer = context.control().path("repeatRenderer").asString("table").trim().toLowerCase();
        if (!"cards".equals(renderer)) {
            renderer = "table";
        }

        int minItems = positiveOrZero(context.control(), "repeatMinItems", positiveOrZero(context.control(), "minItems", 0));
        int maxItems = positiveOrZero(context.control(), "repeatMaxItems", positiveOrZero(context.control(), "maxItems", 0));
        if (maxItems > 0 && maxItems < minItems) {
            maxItems = minItems;
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("renderer", renderer);
        model.put("minItems", minItems);
        model.put("maxItems", maxItems);

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/repeat", model));
    }

    private int positiveOrZero(JsonNode control, String key, int fallback) {
        JsonNode node = control.get(key);
        if (node == null || node.isNull()) {
            return fallback;
        }
        if (!node.canConvertToInt()) {
            return fallback;
        }
        int value = node.asInt();
        return Math.max(0, value);
    }
}
