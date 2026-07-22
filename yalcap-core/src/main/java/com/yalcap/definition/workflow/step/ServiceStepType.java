package com.yalcap.definition.workflow.step;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

@Component
public class ServiceStepType implements StepType {

    private static final JsonNodeFactory JSON = JsonNodeFactory.instance;

    private static final StepTypeDescriptor DESCRIPTOR = new StepTypeDescriptor(
            "service",
            "Service Step",
            "workflow.step.service",
            1,
            createConfigSchema(),
            createDefaultConfig(),
            StepTypeClientAssets.designerAssets(
                new String[]{"/js/designer/workflow/steps/designer-step-service.js"},
                new String[]{"/css/designer/workflow/steps/designer-step-service.css"}
            )
    );

    @Override
    public String type() {
        return DESCRIPTOR.type();
    }

    @Override
    public StepTypeDescriptor descriptor() {
        return DESCRIPTOR;
    }

    @Override
    public void validate(StepTypeValidationContext context) {
        JsonNode step = context.step();
        JsonNode config = step.path("config");
        if (step.has("config") && !config.isObject()) {
            context.errors().add(context.stepPath() + ".config must be an object when provided");
            return;
        }

        if (!config.isObject()) {
            return;
        }

        JsonNode serviceRefNode = config.path("serviceRef");
        if (!serviceRefNode.isMissingNode() && !serviceRefNode.isNull() && !serviceRefNode.isString()) {
            context.errors().add(context.stepPath() + ".config.serviceRef must be a string when provided");
        }
    }

    private static ObjectNode createConfigSchema() {
        ObjectNode schema = JSON.objectNode();
        schema.put("type", "object");

        ObjectNode properties = schema.putObject("properties");
        ObjectNode serviceRef = properties.putObject("serviceRef");
        serviceRef.put("type", "string");
        serviceRef.put("title", "Service reference");
        serviceRef.put("placeholder", "service id or bean reference");

        return schema;
    }

    private static ObjectNode createDefaultConfig() {
        ObjectNode defaults = JSON.objectNode();
        defaults.put("serviceRef", "");
        return defaults;
    }
}
