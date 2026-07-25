package com.yalcap.search.adapter;

import java.util.List;

import org.springframework.stereotype.Component;

import com.yalcap.search.SearchDocument;
import com.yalcap.search.SearchPage;
import com.yalcap.search.SearchProvider;
import com.yalcap.search.SearchQuery;

@Component
public class NoOpSearchProvider implements SearchProvider {

    @Override
    public void upsert(SearchDocument document) {
    }

    @Override
    public void bulkUpsert(List<SearchDocument> documents) {
    }

    @Override
    public void deleteById(String indexName, String documentId, String tenantId) {
    }

    @Override
    public SearchPage search(SearchQuery query) {
        return new SearchPage(List.of(), null, 0);
    }
}
