package com.yalcap.search;

import org.jspecify.annotations.Nullable;

public record DisplayFieldSpec(
    String key,
    String label,
    @Nullable String format
) {
    public DisplayFieldSpec {
        key = requireNonBlank(key, "key");
        label = requireNonBlank(label, "label");
    }

    private static String requireNonBlank(String value, String field) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.trim();
    }
}
