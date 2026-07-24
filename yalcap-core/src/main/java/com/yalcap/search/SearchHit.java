package com.yalcap.search;

import org.jspecify.annotations.Nullable;
import java.util.Map;
import java.util.Collections;
import java.util.LinkedHashMap;

public record SearchHit(
    String documentId,
    @Nullable Double score,
    Map<String, Object> fields
) {
    public SearchHit {
        documentId = requireNonBlank(documentId, "documentId");
        fields = fields == null
                ? Map.of()
                : Collections.unmodifiableMap(new LinkedHashMap<>(fields));
    }

    private static String requireNonBlank(String value, String field) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.trim();
    }
}