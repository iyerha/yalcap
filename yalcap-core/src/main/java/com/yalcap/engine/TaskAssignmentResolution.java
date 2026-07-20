package com.yalcap.engine;

import org.jspecify.annotations.Nullable;

public record TaskAssignmentResolution(
        AssigneeType assigneeType,
        String assigneeId,
        @Nullable String deliveryEmail
) {
}