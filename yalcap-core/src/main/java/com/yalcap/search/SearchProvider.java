package com.yalcap.search;
import java.util.List;

public interface SearchProvider {
    void upsert(SearchDocument document);

    void bulkUpsert(List<SearchDocument> documents);

    void deleteById(String indexName, String documentId, String tenantId);

    SearchPage search(SearchQuery query);
}
