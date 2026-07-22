package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class SelectControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public SelectControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("stateKey").put("type", "string");
        properties.putObject("required").put("type", "boolean");
        properties.putObject("placeholder").put("type", "string");
        properties.putObject("options").put("type", "array");
        properties.putObject("multiple").put("type", "boolean");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "select");
        defaultConfig.put("type", "string");
        defaultConfig.put("required", false);

        this.descriptor = new ControlTypeDescriptor(
                "select",
                "Select",
                "control.type.select",
                propertySchema,
                defaultConfig,
                ControlTypeClientAssets.NONE
        );
    }

    @Override
    public String type() {
        return "select";
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
            context.errors().add(context.controlPath() + ".options is required for select widget");
        }

        boolean multiple = isMultiple(context.control());
        String type = context.control().path("type").asString("").trim().toLowerCase();
        if (multiple && !"array".equals(type)) {
            context.errors().add(context.controlPath() + ".type must be 'array' when select.multiple is enabled");
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        boolean multiple = isMultiple(context.control());

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("options", ControlOptionSupport.normalizeOptions(context.control().path("options")));
        model.put("placeholder", context.control().path("placeholder").asString("").trim());
        model.put("multiple", multiple);

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/select", model));
    }

    private boolean isMultiple(JsonNode control) {
        if (control == null || control.isNull()) {
            return false;
        }
        if (control.path("multiple").asBoolean(false)) {
            return true;
        }
        String type = control.path("type").asString("").trim().toLowerCase();
        return "array".equals(type);
    }
}
