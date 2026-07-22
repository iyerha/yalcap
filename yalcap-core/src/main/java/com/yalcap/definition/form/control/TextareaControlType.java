package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class TextareaControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public TextareaControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("stateKey").put("type", "string");
        properties.putObject("required").put("type", "boolean");
        properties.putObject("placeholder").put("type", "string");
        properties.putObject("rows").put("type", "integer");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "textarea");
        defaultConfig.put("type", "string");
        defaultConfig.put("required", false);

        this.descriptor = new ControlTypeDescriptor(
                "textarea",
                "Textarea",
                "control.type.textarea",
                propertySchema,
                defaultConfig,
                ControlTypeClientAssets.NONE
        );
    }

    @Override
    public String type() {
        return "textarea";
    }

    @Override
    public ControlTypeDescriptor descriptor() {
        return descriptor;
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        int rows = context.control().path("rows").asInt(3);
        if (rows < 1) {
            rows = 3;
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("placeholder", context.control().path("placeholder").asString("").trim());
        model.put("rows", rows);

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/textarea", model));
    }
}
