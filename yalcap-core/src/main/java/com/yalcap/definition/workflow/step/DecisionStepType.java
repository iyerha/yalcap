package com.yalcap.definition.workflow.step;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

@Component
public class DecisionStepType implements StepType {

    private static final JsonNodeFactory JSON = JsonNodeFactory.instance;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final StepTypeDescriptor DESCRIPTOR = new StepTypeDescriptor(
            "decision",
            "Decision Step",
        "workflow.step.decision",
        2,
        createConfigSchema(),
            createDefaultConfig(),
            StepTypeClientAssets.designerAssets(
                new String[]{"/js/designer/workflow/steps/designer-step-decision.js"},
                new String[]{"/css/designer/workflow/steps/designer-step-decision.css"}
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

        JsonNode decisionCondition = step.path("condition");
        if (!decisionCondition.isMissingNode() && !decisionCondition.isNull() && !decisionCondition.isObject()) {
            context.errors().add(context.stepPath() + ".condition must be a JSON object when provided");
        }

        boolean hasValidCondition = decisionCondition.isObject();
        if (config.isObject()) {
            JsonNode conditionJsonNode = config.path("conditionJson");
            if (!conditionJsonNode.isMissingNode() && !conditionJsonNode.isNull() && !conditionJsonNode.isString()) {
                context.errors().add(context.stepPath() + ".config.conditionJson must be a string when provided");
            }

            String conditionText = conditionJsonNode.asString("").trim();
            if (!conditionText.isEmpty()) {
                try {
                    JsonNode parsed = OBJECT_MAPPER.readTree(conditionText);
                    if (!parsed.isObject()) {
                        context.errors().add(context.stepPath() + ".config.conditionJson must parse to a JSON object");
                    } else {
                        hasValidCondition = true;
                    }
                } catch (Exception ex) {
                    context.errors().add(context.stepPath() + ".config.conditionJson is invalid JSON");
                }
            }

            JsonNode action1Label = config.path("action1Label");
            if (!action1Label.isMissingNode() && !action1Label.isNull() && !action1Label.isString()) {
                context.errors().add(context.stepPath() + ".config.action1Label must be a string when provided");
            }

            JsonNode action2Label = config.path("action2Label");
            if (!action2Label.isMissingNode() && !action2Label.isNull() && !action2Label.isString()) {
                context.errors().add(context.stepPath() + ".config.action2Label must be a string when provided");
            }
        }

        if (!hasValidCondition) {
            context.errors().add(context.stepPath() + " condition is required (config.conditionJson or condition)");
        }
    }

    private static ObjectNode createConfigSchema() {
        ObjectNode schema = JSON.objectNode();
        schema.put("type", "object");

        ObjectNode properties = schema.putObject("properties");

        ObjectNode conditionJson = properties.putObject("conditionJson");
        conditionJson.put("type", "string");
        conditionJson.put("title", "Condition logic (JSON)");
        conditionJson.put("format", "json");
        conditionJson.put("placeholder", "{\"==\":[{\"var\":\"data.status\"},\"approved\"]}");

        ObjectNode action1Label = properties.putObject("action1Label");
        action1Label.put("type", "string");
        action1Label.put("title", "Action 1 label");
        action1Label.put("placeholder", "Approve");

        ObjectNode action2Label = properties.putObject("action2Label");
        action2Label.put("type", "string");
        action2Label.put("title", "Action 2 label");
        action2Label.put("placeholder", "Reject");

        return schema;
    }

    private static ObjectNode createDefaultConfig() {
        ObjectNode defaults = JSON.objectNode();
        defaults.put("conditionJson", "");
        defaults.put("action1Label", "Action 1");
        defaults.put("action2Label", "Action 2");
        return defaults;
    }
}
