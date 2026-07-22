package com.yalcap.definition.workflow.step;

import tools.jackson.databind.JsonNode;

public record StepTypeDescriptor(
        String type,
        String displayName,
        String displayNameKey,
        int outputCount,
        JsonNode configSchema,
        JsonNode defaultConfig,
        StepTypeClientAssets clientAssets
) {
}
