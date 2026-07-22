package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

@Component
public class TextControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public TextControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("stateKey").put("type", "string");
        properties.putObject("required").put("type", "boolean");
        properties.putObject("placeholder").put("type", "string");
        properties.putObject("pattern").put("type", "string");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "text");
        defaultConfig.put("type", "string");
        defaultConfig.put("required", false);

        this.descriptor = new ControlTypeDescriptor(
                "text",
                "Text Input",
            "control.type.text",
                propertySchema,
                defaultConfig,
                ControlTypeClientAssets.NONE
        );
    }

    @Override
    public String type() {
        return "text";
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

        String pattern = context.control().path("pattern").asString("").trim();
        if (pattern.isEmpty()) {
            return;
        }

        try {
            Pattern.compile(pattern);
        } catch (PatternSyntaxException ex) {
            context.errors().add(context.controlPath() + ".pattern is not a valid regex: " + ex.getDescription());
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("inputType", "text");
        model.put("placeholder", context.control().path("placeholder").asString("").trim());
        model.put("pattern", context.control().path("pattern").asString("").trim());

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/text", model));
    }
}
