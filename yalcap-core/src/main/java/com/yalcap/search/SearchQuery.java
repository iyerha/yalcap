package com.yalcap.search;
import org.jspecify.annotations.Nullable;
import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.LinkedHashMap;

public record SearchQuery( 
    String indexName,
    String tenantId,
    @Nullable String text,
    List<SearchFilter> filters,
    List<SearchSort> sort,
    int limit,
    @Nullable String cursor,
    Map<String, Object> options
) {
    public SearchQuery {
        indexName = requireNonBlank(indexName, "indexName");
        tenantId = requireNonBlank(tenantId, "tenantId");

        filters = filters == null ? List.of() : List.copyOf(filters);
        sort = sort == null ? List.of() : List.copyOf(sort);

        if (limit < 1) {
            limit = 20;
        }
        if (limit > 200) {
            limit = 200;
        }

        options = options == null
                ? Map.of()
                : Collections.unmodifiableMap(new LinkedHashMap<>(options));
    }

    private static String requireNonBlank(String value, String field) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.trim();
    }
}
