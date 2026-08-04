package com.yalcap.definition;

public record FormDefinitionPublishedEvent(
        String formId,
        String formKey,
        String title,
        Integer versionNumber,
        String tenantId,
        String createdBy,
        String changeMessage
) {
}
