package com.yalcap.definition.form.load;

import org.jspecify.annotations.Nullable;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.UUID;

public record FormLoadDataContext(
        String definitionKey,
        String stepId,
        String userId,
        List<String> userGroups,
        @Nullable UUID tenantId,
        ObjectNode data,
        FormLoadDataPhase phase
) {
    public FormLoadDataContext(
            String definitionKey,
            String stepId,
            String userId,
            List<String> userGroups,
            @Nullable UUID tenantId,
            ObjectNode data
    ) {
        this(definitionKey, stepId, userId, userGroups, tenantId, data, FormLoadDataPhase.FORM_OPEN);
    }
}
