package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class AutocompleteControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public AutocompleteControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("stateKey").put("type", "string");
        properties.putObject("required").put("type", "boolean");
        properties.putObject("placeholder").put("type", "string");
        properties.putObject("autocompleteSourceType").put("type", "string");
        properties.putObject("autocompleteSourceUrl").put("type", "string");
        properties.putObject("autocompleteMinChars").put("type", "integer");
        properties.putObject("autocompleteMaxResults").put("type", "integer");
        properties.putObject("autocompleteAllowFreeText").put("type", "boolean");
        properties.putObject("options").put("type", "array");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "autocomplete");
        defaultConfig.put("type", "string");
        defaultConfig.put("required", false);
        defaultConfig.put("autocompleteSourceType", "static");
        defaultConfig.put("autocompleteMinChars", 2);
        defaultConfig.put("autocompleteMaxResults", 25);
        defaultConfig.put("autocompleteAllowFreeText", false);

        this.descriptor = new ControlTypeDescriptor(
                "autocomplete",
                "Autocomplete",
                "control.type.autocomplete",
                propertySchema,
                defaultConfig,
            new ControlTypeClientAssets(
                java.util.List.of("/js/designer/control/autocomplete/designer-autocomplete.js"),
                java.util.List.of("/js/runtime/runtime-autocomplete.js"),
                java.util.List.of(),
                java.util.List.of()
            )
        );
    }

    @Override
    public String type() {
        return "autocomplete";
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

        String sourceType = context.control().path("autocompleteSourceType").asString("static").trim().toLowerCase();
        JsonNode options = context.control().path("options");

        if ("remote".equals(sourceType)) {
            String sourceUrl = context.control().path("autocompleteSourceUrl").asString("").trim();
            if (sourceUrl.isEmpty()) {
                context.errors().add(context.controlPath() + ".autocompleteSourceUrl is required for remote autocomplete widget");
            }
        } else if (!options.isArray() || options.isEmpty()) {
            context.errors().add(context.controlPath() + ".options is required for autocomplete widget");
        }

        Integer minChars = parsePositiveInteger(context.control().get("autocompleteMinChars"));
        if (minChars != null && minChars < 1) {
            context.errors().add(context.controlPath() + ".autocompleteMinChars must be >= 1 when provided");
        }

        Integer maxResults = parsePositiveInteger(context.control().get("autocompleteMaxResults"));
        if (maxResults != null && maxResults < 1) {
            context.errors().add(context.controlPath() + ".autocompleteMaxResults must be >= 1 when provided");
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        String sourceType = context.control().path("autocompleteSourceType").asString("static").trim().toLowerCase();
        if (!"remote".equals(sourceType)) {
            sourceType = "static";
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("inputType", "text");
        model.put("sourceType", sourceType);
        model.put("placeholder", context.control().path("placeholder").asString("").trim());
        model.put("sourceUrl", context.control().path("autocompleteSourceUrl").asString("").trim());
        model.put("labelField", context.control().path("autocompleteLabelField").asString("label").trim());
        model.put("valueField", context.control().path("autocompleteValueField").asString("value").trim());
        model.put("searchParam", context.control().path("autocompleteSearchParam").asString("q").trim());
        model.put("minChars", positiveIntegerOrDefault(context.control().get("autocompleteMinChars"), 2));
        model.put("maxResults", positiveIntegerOrDefault(context.control().get("autocompleteMaxResults"), 25));
        model.put("allowFreeText", context.control().path("autocompleteAllowFreeText").asBoolean(false));
        model.put("options", ControlOptionSupport.normalizeOptions(context.control().path("options")));
        model.put("multiple", false);

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/autocomplete", model));
    }

    private Integer parsePositiveInteger(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (!node.canConvertToInt()) {
            return -1;
        }
        return node.asInt();
    }

    private int positiveIntegerOrDefault(JsonNode node, int fallback) {
        Integer parsed = parsePositiveInteger(node);
        if (parsed == null || parsed < 1) {
            return fallback;
        }
        return parsed;
    }
}
