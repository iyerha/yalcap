package com.yalcap.security;

import java.util.Map;

import org.jspecify.annotations.Nullable;

public record SubjectIdentity(
        SubjectReference subject,
        String displayName,
        @Nullable String email,
        @Nullable SubjectReference manager,
        Map<String, Object> attributes
) {
}