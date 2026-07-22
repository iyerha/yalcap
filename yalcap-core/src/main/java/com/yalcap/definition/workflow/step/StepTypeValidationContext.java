package com.yalcap.definition.workflow.step;

import tools.jackson.databind.JsonNode;

public record StepTypeValidationContext(
        JsonNode step,
        String stepPath,
        StepTypeValidationErrors errors
) {
}
