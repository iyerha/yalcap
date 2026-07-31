package com.yalcap.definition.form;

import tools.jackson.databind.JsonNode;

public record FormDefinition(String controlSchema, JsonNode dataSchema) {
    
    public FormDefinition {
        if (controlSchema == null || controlSchema.isBlank()) {
            throw new IllegalArgumentException("controlSchema cannot be null or blank");
        }
        if (dataSchema == null || dataSchema.isNull()) {
            throw new IllegalArgumentException("dataSchema cannot be null");
        }
    }
}
