package com.yalcap.search;

import java.util.LinkedHashMap;
import java.util.Map;

import org.jspecify.annotations.Nullable;

public class SearchDocumentFactory {

    private SearchDocumentFactory() {
    }

    public static SearchDocument createParent(
            String indexName,
            String documentId,
            String tenantId,
            Map<String, Object> fields,
            @Nullable String schemaVersion
    ) {
        return SearchDocument.parent(
                indexName,
                documentId,
                tenantId,
                immutableCopy(fields),
                schemaVersion
        );
    }

    public static SearchDocument createGroupChild(
            String indexName,
            String tenantId,
            String parentDocumentId,
            String groupKey,
            String groupRowId,
            Map<String, Object> fields,
            @Nullable String schemaVersion
    ) {
        String childId = SearchDocument.childDocumentId(parentDocumentId, groupKey, groupRowId);
        return SearchDocument.groupChild(
                indexName,
                childId,
                tenantId,
                parentDocumentId,
                groupKey,
                groupRowId,
                immutableCopy(fields),
                schemaVersion
        );
    }

    public static SearchDocument createGroupChild(
            String indexName,
            String childDocumentId,
            String tenantId,
            String parentDocumentId,
            String groupKey,
            String groupRowId,
            Map<String, Object> fields,
            @Nullable String schemaVersion
    ) {
        return SearchDocument.groupChild(
                indexName,
                childDocumentId,
                tenantId,
                parentDocumentId,
                groupKey,
                groupRowId,
                immutableCopy(fields),
                schemaVersion
        );
    }

    private static Map<String, Object> immutableCopy(Map<String, Object> fields) {
        if (fields == null || fields.isEmpty()) {
            return Map.of();
        }
        return Map.copyOf(new LinkedHashMap<>(fields));
    }
}
