package com.yalcap.security;

import org.jspecify.annotations.Nullable;

public record SubjectSearchResult(
        SubjectReference subject,
        String displayName,
        @Nullable String email
) {
}