package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class CheckboxControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public CheckboxControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("stateKey").put("type", "string");
        properties.putObject("required").put("type", "boolean");
        properties.putObject("options").put("type", "array");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "checkbox");
        defaultConfig.put("type", "array");
        defaultConfig.put("required", false);

        this.descriptor = new ControlTypeDescriptor(
                "checkbox",
                "Checkbox Group",
                "control.type.checkbox",
                propertySchema,
                defaultConfig,
                ControlTypeClientAssets.NONE
        );
    }

    @Override
    public String type() {
        return "checkbox";
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
            context.errors().add(context.controlPath() + ".options is required for checkbox widget");
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("options", ControlOptionSupport.normalizeOptions(context.control().path("options")));
        model.put("multiple", true);

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/checkbox", model));
    }
}
