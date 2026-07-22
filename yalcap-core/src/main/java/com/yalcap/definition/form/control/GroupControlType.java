package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class GroupControlType implements ControlType {

    private final ControlTypeDescriptor descriptor;

    public GroupControlType(ObjectMapper objectMapper) {
        ObjectNode propertySchema = objectMapper.createObjectNode();
        propertySchema.put("type", "object");
        ObjectNode properties = propertySchema.putObject("properties");
        properties.putObject("label").put("type", "string");
        properties.putObject("name").put("type", "string");
        properties.putObject("groupDescription").put("type", "string");
        properties.putObject("children").put("type", "array");

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("widget", "group");
        defaultConfig.put("type", "object");
        defaultConfig.put("required", false);

        this.descriptor = new ControlTypeDescriptor(
                "group",
                "Group",
                "control.type.group",
                propertySchema,
                defaultConfig,
            ControlTypeClientAssets.designerCssOnly("/css/designer/control/container/designer-container.css")
        );
    }

    @Override
    public String type() {
        return "group";
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

        String name = context.control().path("name").asString("").trim();
        if (name.isEmpty()) {
            context.errors().add(context.controlPath() + ".name is required for group widget");
        }

        JsonNode children = context.control().path("children");
        if (!children.isArray() || children.isEmpty()) {
            context.errors().add(context.controlPath() + ".children is required for group widget");
        }
    }

    @Override
    public Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        if (context == null || context.control() == null || context.control().isNull()) {
            return Optional.empty();
        }

        Map<String, Object> model = new LinkedHashMap<>();
        model.put("name", context.control().path("name").asString("").trim());
        model.put("description", context.control().path("groupDescription").asString("").trim());

        return Optional.of(new ControlTypeRenderSpec("runtime/controls/group", model));
    }
}
