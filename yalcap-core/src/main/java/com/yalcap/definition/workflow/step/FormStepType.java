package com.yalcap.definition.workflow.step;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

import java.util.Set;

@Component
public class FormStepType implements StepType {

    private static final JsonNodeFactory JSON = JsonNodeFactory.instance;
    private static final Set<String> ALLOWED_ASSIGNEE_KINDS = Set.of("INTERNAL_USER", "INTERNAL_GROUP",
            "EXTERNAL_EMAIL");

    private static final StepTypeDescriptor DESCRIPTOR = new StepTypeDescriptor(
            "form",
            "Form Step",
            "workflow.step.form",
            1,
            createConfigSchema(),
            createDefaultConfig(),
            StepTypeClientAssets.designerAssets(
                    new String[] { "/js/designer/workflow/steps/form/designer-step-form.js" },
                    new String[] { "/css/designer/workflow/steps/form/designer-step-form.css" },
                    "/designer/workflow/steps/form/step-form.html"));

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
        JsonNode assignment = step.path("assignment");

        if (!step.has("assignment") || !assignment.isObject()) {
            context.errors().add(context.stepPath() + ".assignment is required and must be an object");
            return;
        }

        JsonNode kindNode = assignment.path("kind");
        if (kindNode.isMissingNode() || kindNode.isNull() || !kindNode.isString()) {
            context.errors().add(context.stepPath() + ".assignment.kind is required and must be a string");
        } else {
            String kind = kindNode.asString("").trim();
            if (kind.isEmpty()) {
                context.errors().add(context.stepPath() + ".assignment.kind is required and must be a string");
            } else if (!ALLOWED_ASSIGNEE_KINDS.contains(kind)) {
                context.errors().add(context.stepPath() + ".assignment.kind is invalid: " + kind);
            }
        }

        JsonNode valueNode = assignment.path("value");
        if (valueNode.isMissingNode() || valueNode.isNull() || !valueNode.isString()
                || valueNode.asString("").trim().isEmpty()) {
            context.errors().add(context.stepPath() + ".assignment.value is required and must be a non-empty string");
        }
    }

    private static ObjectNode createConfigSchema() {
        ObjectNode schema = JSON.objectNode();
        schema.put("type", "object");
        schema.putObject("properties");
        return schema;
    }

    private static ObjectNode createDefaultConfig() {
        return JSON.objectNode();
    }
}