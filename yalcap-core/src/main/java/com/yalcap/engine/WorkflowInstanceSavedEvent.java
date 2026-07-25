package com.yalcap.engine;

import tools.jackson.databind.JsonNode;

public record WorkflowInstanceSavedEvent(
        String instanceId,
        String definitionId,
        String definitionKey,
        String tenantId,
        String stepId,
        Integer currentStep,
        String status,
        String assignee,
        JsonNode data
) {
}
