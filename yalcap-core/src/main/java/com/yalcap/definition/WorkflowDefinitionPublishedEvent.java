package com.yalcap.definition;

import tools.jackson.databind.JsonNode;

public record WorkflowDefinitionPublishedEvent(
        String definitionId,
        String definitionKey,
        Integer versionNumber,
        String tenantId,
        JsonNode definition,
        String createdBy,
        String changeMessage
) {
}
