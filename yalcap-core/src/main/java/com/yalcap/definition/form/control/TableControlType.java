package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class TableControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public TableControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("stateKey").put("type", "string");
        properties.putObject("columns").put("type", "array");
        properties.putObject("tableColumns").put("type", "array");
        properties.putObject("minItems").put("type", "integer");
        properties.putObject("maxItems").put("type", "integer");
        properties.putObject("tableMinItems").put("type", "integer");
        properties.putObject("tableMaxItems").put("type", "integer");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "table");
        defaultConfig.put("type", "array");
        defaultConfig.put("required", false);
        defaultConfig.put("tableMinItems", 0);
        defaultConfig.put("tableMaxItems", 0);
        defaultConfig.put("tableAllowAdd", true);
        defaultConfig.put("tableAllowDelete", true);
        defaultConfig.put("tableAllowReorder", false);

        this.descriptor = new ControlTypeDescriptor(
                "table",
                "Table",
                "control.type.table",
                propertySchema,
                defaultConfig,
                new ControlTypeClientAssets(
                        java.util.List.of("/js/designer/control/table/designer-table.js"),
                        java.util.List.of("/js/runtime/runtime-repeats.js"),
                    java.util.List.of("/css/designer/control/table/designer-table.css"),
                        java.util.List.of()
                )
        );
    }

    @Override
    public String type() {
        return "table";
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

        JsonNode columns = context.control().path("columns");
        JsonNode legacyColumns = context.control().path("tableColumns");
        boolean hasColumns = (columns.isArray() && !columns.isEmpty())
                || (legacyColumns.isArray() && !legacyColumns.isEmpty());
        if (!hasColumns) {
            context.errors().add(context.controlPath() + ".columns is required for table widget");
        }

        validateMinMaxBounds(context.control(), context.controlPath(), "minItems", "maxItems", context.errors());
        validateMinMaxBounds(context.control(), context.controlPath(), "tableMinItems", "tableMaxItems", context.errors());
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        int minItems = positiveOrZero(context.control(), "tableMinItems", positiveOrZero(context.control(), "minItems", 0));
        int maxItems = positiveOrZero(context.control(), "tableMaxItems", positiveOrZero(context.control(), "maxItems", 0));
        if (maxItems > 0 && maxItems < minItems) {
            maxItems = minItems;
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("renderer", "table");
        model.put("minItems", minItems);
        model.put("maxItems", maxItems);

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/repeat", model));
    }

    private void validateMinMaxBounds(JsonNode control,
                                      String controlPath,
                                      String minKey,
                                      String maxKey,
                                      ControlTypeValidationErrors errors) {
        Integer min = parseNonNegativeInteger(control.get(minKey));
        if (min != null && min < 0) {
            errors.add(controlPath + "." + minKey + " must be >= 0 when provided");
        }

        Integer max = parseNonNegativeInteger(control.get(maxKey));
        if (max != null && max < 0) {
            errors.add(controlPath + "." + maxKey + " must be >= 0 when provided");
        }

        if (min != null && max != null && max > 0 && max < min) {
            errors.add(controlPath + "." + maxKey + " must be greater than or equal to " + minKey);
        }
    }

    private Integer parseNonNegativeInteger(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (!node.canConvertToInt()) {
            return -1;
        }
        return node.asInt();
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