package com.yalcap.definition.workflow.step;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

import java.util.Set;

@Component
public class FormStepType implements StepType {

    private static final JsonNodeFactory JSON = JsonNodeFactory.instance;
    private static final Set<String> ALLOWED_ASSIGNEE_KINDS = Set.of("INTERNAL_USER", "INTERNAL_GROUP", "EXTERNAL_EMAIL");

    private static final StepTypeDescriptor DESCRIPTOR = new StepTypeDescriptor(
            "form",
            "Form Step",
            "workflow.step.form",
            1,
            createConfigSchema(),
            createDefaultConfig(),
            StepTypeClientAssets.designerAssets(
                new String[]{"/js/designer/workflow/steps/designer-step-form.js"},
                new String[]{"/css/designer/workflow/steps/designer-step-form.css"}
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

        String assigneeKind = "";
        if (config.isObject()) {
            JsonNode assigneeKindNode = config.path("assigneeKind");
            if (!assigneeKindNode.isMissingNode() && !assigneeKindNode.isNull() && !assigneeKindNode.isString()) {
                context.errors().add(context.stepPath() + ".config.assigneeKind must be a string when provided");
            }
            assigneeKind = assigneeKindNode.asString("").trim();
        }

        if (assigneeKind.isEmpty()) {
            JsonNode assigneeNode = step.path("assignee");
            if (assigneeNode.isObject()) {
                JsonNode assigneeKindNode = assigneeNode.path("kind");
                if (!assigneeKindNode.isMissingNode() && !assigneeKindNode.isNull() && !assigneeKindNode.isString()) {
                    context.errors().add(context.stepPath() + ".assignee.kind must be a string when provided");
                }
                assigneeKind = assigneeKindNode.asString("").trim();
            }
        }

        if (assigneeKind.isEmpty()) {
            context.errors().add(context.stepPath() + " assignee kind is required (config.assigneeKind or assignee.kind)");
        } else if (!ALLOWED_ASSIGNEE_KINDS.contains(assigneeKind)) {
            context.errors().add(context.stepPath() + " assignee kind is invalid: " + assigneeKind);
        }

        if (config.isObject()) {
            JsonNode assigneeValueNode = config.path("assigneeValue");
            if (!assigneeValueNode.isMissingNode() && !assigneeValueNode.isNull() && !assigneeValueNode.isString()) {
                context.errors().add(context.stepPath() + ".config.assigneeValue must be a string when provided");
            }
        }
    }

    private static ObjectNode createConfigSchema() {
        ObjectNode schema = JSON.objectNode();
        schema.put("type", "object");

        ObjectNode properties = schema.putObject("properties");

        ObjectNode assigneeKind = properties.putObject("assigneeKind");
        assigneeKind.put("type", "string");
        assigneeKind.put("title", "Assignee kind");
        ArrayNode allowedKinds = assigneeKind.putArray("enum");
        allowedKinds.add("INTERNAL_USER");
        allowedKinds.add("INTERNAL_GROUP");
        allowedKinds.add("EXTERNAL_EMAIL");

        ObjectNode assigneeValue = properties.putObject("assigneeValue");
        assigneeValue.put("type", "string");
        assigneeValue.put("title", "Assignee value");
        assigneeValue.put("placeholder", "user/group/email or expression");

        return schema;
    }

    private static ObjectNode createDefaultConfig() {
        ObjectNode defaults = JSON.objectNode();
        defaults.put("assigneeKind", "INTERNAL_USER");
        defaults.put("assigneeValue", "");
        return defaults;
    }
}
