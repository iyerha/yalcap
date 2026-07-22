package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class RadioControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public RadioControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("stateKey").put("type", "string");
        properties.putObject("required").put("type", "boolean");
        properties.putObject("options").put("type", "array");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "radio");
        defaultConfig.put("type", "string");
        defaultConfig.put("required", false);

        this.descriptor = new ControlTypeDescriptor(
                "radio",
                "Radio Group",
                "control.type.radio",
                propertySchema,
                defaultConfig,
                ControlTypeClientAssets.NONE
        );
    }

    @Override
    public String type() {
        return "radio";
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

        JsonNode options = context.control().path("options");
        if (!options.isArray() || options.isEmpty()) {
            context.errors().add(context.controlPath() + ".options is required for radio widget");
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("options", ControlOptionSupport.normalizeOptions(context.control().path("options")));

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/radio", model));
    }
}
