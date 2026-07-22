package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class DateTimeControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public DateTimeControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("stateKey").put("type", "string");
        properties.putObject("required").put("type", "boolean");
        properties.putObject("placeholder").put("type", "string");
        properties.putObject("minDateTime").put("type", "string");
        properties.putObject("maxDateTime").put("type", "string");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "datetime");
        defaultConfig.put("type", "string");
        defaultConfig.put("required", false);

        this.descriptor = new ControlTypeDescriptor(
                "datetime",
                "Date Time",
            "control.type.datetime",
                propertySchema,
                defaultConfig,
                ControlTypeClientAssets.NONE
        );
    }

    @Override
    public String type() {
        return "datetime";
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

        LocalDateTime minDateTime = parseLocalDateTime(
                context.control().get("minDateTime"),
                context.controlPath() + ".minDateTime",
                context.errors()
        );
        LocalDateTime maxDateTime = parseLocalDateTime(
                context.control().get("maxDateTime"),
                context.controlPath() + ".maxDateTime",
                context.errors()
        );

        if (minDateTime != null && maxDateTime != null && maxDateTime.isBefore(minDateTime)) {
            context.errors().add(context.controlPath() + ".maxDateTime must be greater than or equal to minDateTime");
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("inputType", "datetime-local");
        model.put("min", scalarText(context.control().get("minDateTime")));
        model.put("max", scalarText(context.control().get("maxDateTime")));
        model.put("placeholder", context.control().path("placeholder").asString("").trim());

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/datetime", model));
    }

    private LocalDateTime parseLocalDateTime(JsonNode node, String path, ControlTypeValidationErrors errors) {
        if (node == null || node.isNull() || !node.isString() || node.asString().trim().isEmpty()) {
            return null;
        }
        try {
            return LocalDateTime.parse(node.asString().trim());
        } catch (RuntimeException ex) {
            errors.add(path + " must be an ISO local datetime");
            return null;
        }
    }

    private String scalarText(JsonNode node) {
        if (node == null || node.isNull()) {
            return "";
        }
        if (node.isString()) {
            return node.asString("").trim();
        }
        if (node.isNumber()) {
            return node.numberValue().toString();
        }
        if (node.isBoolean()) {
            return String.valueOf(node.asBoolean());
        }
        return "";
    }
}
