package com.yalcap.search;

public record SearchSort(
    String field,
    SearchSortDirection direction
) {
    public enum SearchSortDirection {
        ASC,
        DESC
    }

    public SearchSort {
        field = requireNonBlank(field, "field");
        direction = direction == null ? SearchSortDirection.ASC : direction;
    }

    private static String requireNonBlank(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return value.trim();
    }
}
