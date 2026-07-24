package com.yalcap.security;

import org.jspecify.annotations.Nullable;

public record SubjectValidationResult(
        SubjectReference subject,
        boolean valid,
        @Nullable String message
) {
}