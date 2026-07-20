package com.yalcap.engine;

public record TaskAssignmentIntent(
        TaskAssigneeKind kind,
        String value
) {
}