package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class DateControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public DateControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("stateKey").put("type", "string");
        properties.putObject("required").put("type", "boolean");
        properties.putObject("placeholder").put("type", "string");
        properties.putObject("minDate").put("type", "string");
        properties.putObject("maxDate").put("type", "string");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "date");
        defaultConfig.put("type", "string");
        defaultConfig.put("required", false);

        this.descriptor = new ControlTypeDescriptor(
                "date",
                "Date",
            "control.type.date",
                propertySchema,
                defaultConfig,
                ControlTypeClientAssets.NONE
        );
    }

    @Override
    public String type() {
        return "date";
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

        LocalDate minDate = parseLocalDate(context.control().get("minDate"), context.controlPath() + ".minDate", context.errors());
        LocalDate maxDate = parseLocalDate(context.control().get("maxDate"), context.controlPath() + ".maxDate", context.errors());
        if (minDate != null && maxDate != null && maxDate.isBefore(minDate)) {
            context.errors().add(context.controlPath() + ".maxDate must be greater than or equal to minDate");
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("inputType", "date");
        model.put("min", scalarText(context.control().get("minDate")));
        model.put("max", scalarText(context.control().get("maxDate")));
        model.put("placeholder", context.control().path("placeholder").asString("").trim());

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/date", model));
    }

    private LocalDate parseLocalDate(JsonNode node, String path, ControlTypeValidationErrors errors) {
        if (node == null || node.isNull() || !node.isString() || node.asString().trim().isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(node.asString().trim());
        } catch (RuntimeException ex) {
            errors.add(path + " must be an ISO date (YYYY-MM-DD)");
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
