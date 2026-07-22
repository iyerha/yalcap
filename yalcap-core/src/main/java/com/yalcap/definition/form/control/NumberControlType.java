package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class NumberControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public NumberControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("stateKey").put("type", "string");
        properties.putObject("required").put("type", "boolean");
        properties.putObject("placeholder").put("type", "string");
        properties.putObject("numberKind").put("type", "string");
        properties.putObject("min").put("type", "number");
        properties.putObject("max").put("type", "number");
        properties.putObject("step").put("type", "number");
        properties.putObject("precision").put("type", "integer");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "number");
        defaultConfig.put("type", "number");
        defaultConfig.put("numberKind", "decimal");
        defaultConfig.put("required", false);

        this.descriptor = new ControlTypeDescriptor(
                "number",
                "Number",
                "control.type.number",
                propertySchema,
                defaultConfig,
                ControlTypeClientAssets.NONE
        );
    }

    @Override
    public String type() {
        return "number";
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

        String kind = resolveNumberKind(context.control());
        BigDecimal min = parseDecimal(context.control().get("min"), context.controlPath() + ".min", context.errors());
        BigDecimal max = parseDecimal(context.control().get("max"), context.controlPath() + ".max", context.errors());
        BigDecimal step = parseDecimal(context.control().get("step"), context.controlPath() + ".step", context.errors());
        Integer precision = parseNonNegativeInt(context.control().get("precision"), context.controlPath() + ".precision", context.errors());

        if (min != null && max != null && max.compareTo(min) < 0) {
            context.errors().add(context.controlPath() + ".max must be greater than or equal to min");
        }

        if (step != null && step.compareTo(BigDecimal.ZERO) <= 0) {
            context.errors().add(context.controlPath() + ".step must be greater than 0");
        }

        if ("integer".equals(kind)) {
            validateIntegerLike(min, context.controlPath() + ".min", context.errors());
            validateIntegerLike(max, context.controlPath() + ".max", context.errors());
            validateIntegerLike(step, context.controlPath() + ".step", context.errors());
            if (precision != null && precision != 0) {
                context.errors().add(context.controlPath() + ".precision must be 0 for integer numberKind");
            }
        }

        if (precision != null && step != null && scale(step) > precision) {
            context.errors().add(context.controlPath() + ".step scale must be <= precision");
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("inputType", "number");
        model.put("min", scalarText(context.control().get("min")));
        model.put("max", scalarText(context.control().get("max")));

        String step = scalarText(context.control().get("step"));
        if (step.isEmpty() && "integer".equals(resolveNumberKind(context.control()))) {
            step = "1";
        }
        model.put("step", step);

        String placeholder = context.control().path("placeholder").asString("").trim();
        model.put("placeholder", placeholder);

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/number", model));
    }

    private String resolveNumberKind(JsonNode control) {
        String explicit = control.path("numberKind").asString("").trim().toLowerCase();
        if ("integer".equals(explicit) || "decimal".equals(explicit)) {
            return explicit;
        }

        String type = control.path("type").asString("").trim().toLowerCase();
        if ("integer".equals(type)) {
            return "integer";
        }
        return "decimal";
    }

    private BigDecimal parseDecimal(JsonNode node, String path, ControlTypeValidationErrors errors) {
        if (node == null || node.isNull()) {
            return null;
        }

        String text;
        if (node.isNumber()) {
            text = node.numberValue().toString();
        } else if (node.isString()) {
            text = node.asString().trim();
            if (text.isEmpty()) {
                return null;
            }
        } else {
            errors.add(path + " must be numeric when provided");
            return null;
        }

        try {
            return new BigDecimal(text);
        } catch (RuntimeException ex) {
            errors.add(path + " must be numeric when provided");
            return null;
        }
    }

    private Integer parseNonNegativeInt(JsonNode node, String path, ControlTypeValidationErrors errors) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (!node.canConvertToInt()) {
            errors.add(path + " must be an integer when provided");
            return null;
        }
        int value = node.asInt();
        if (value < 0) {
            errors.add(path + " must be >= 0 when provided");
            return null;
        }
        return value;
    }

    private void validateIntegerLike(BigDecimal value, String path, ControlTypeValidationErrors errors) {
        if (value == null) {
            return;
        }
        if (scale(value) > 0) {
            errors.add(path + " must be an integer for integer numberKind");
        }
    }

    private int scale(BigDecimal value) {
        return Math.max(0, value.stripTrailingZeros().scale());
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
