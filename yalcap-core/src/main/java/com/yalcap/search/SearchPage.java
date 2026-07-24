package com.yalcap.search;

import org.jspecify.annotations.Nullable;

import java.util.List;

public record SearchPage(        
    List<SearchHit> hits,
    @Nullable String nextCursor,
    long total
) {
    public SearchPage {
        hits = hits == null ? List.of() : List.copyOf(hits);
        if (total < 0) {
            total = 0;
        }
    }
}
