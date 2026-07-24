package com.yalcap.search;

import org.jspecify.annotations.Nullable;

public record IndexFieldSpec(        
    String key,
    String sourcePath,
    String label,
    IndexFieldType type,
    boolean multiValued,
    boolean sortable,
    boolean facetable,
    @Nullable String analyzer) {

    public IndexFieldSpec {
        key = requireNonBlank(key, "key");
        sourcePath = requireNonBlank(sourcePath, "sourcePath");
        label = requireNonBlank(label, "label");
        type = type == null ? IndexFieldType.KEYWORD : type;
    }

    private static String requireNonBlank(String value, String field) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.trim();
    }

    public enum IndexFieldType {
        TEXT,
        KEYWORD,
        NUMBER,
        DATE,
        BOOLEAN
    }
}
