package com.yalcap.definition.form.control;

import tools.jackson.databind.JsonNode;

public record ControlTypeDescriptor(
        String type,
        String displayName,
        String displayNameKey,
        JsonNode propertySchema,
        JsonNode defaultConfig,
        ControlTypeClientAssets clientAssets
) {
}
