package com.yalcap.security;

import org.jspecify.annotations.Nullable;

import java.util.UUID;

public record SubjectRequestContext(
        @Nullable UUID tenantId
) {
}