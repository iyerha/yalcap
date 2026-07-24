package com.yalcap.search;

import java.util.List;

public record SearchFilter(
        String field,
        SearchFilterOperator operator,
        List<String> values
) {
    public enum SearchFilterOperator {
        EQ,
        IN,
        PREFIX,
        CONTAINS,
        GT,
        GTE,
        LT,
        LTE,
        EXISTS
    }

    public SearchFilter {
        field = requireNonBlank(field, "field");
        operator = operator == null ? SearchFilterOperator.EQ : operator;
        values = values == null ? List.of() : List.copyOf(values);
    }

    private static String requireNonBlank(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return value.trim();
    }
}
