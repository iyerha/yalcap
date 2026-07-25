package com.yalcap.definition;

import org.jspecify.annotations.Nullable;
import tools.jackson.databind.JsonNode;

public interface WorkflowSearchSchemaReader {

    @Nullable
    WorkflowSearchSchemaSnapshot findActiveByDefinitionKey(String definitionKey);

    public record WorkflowSearchSchemaSnapshot(
            String definitionKey,
            Integer versionNumber,
            JsonNode workflowDefinition
    ) {
    }
}
