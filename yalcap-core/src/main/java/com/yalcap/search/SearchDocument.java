package com.yalcap.search;
import org.jspecify.annotations.Nullable;
import java.util.Map;
import java.util.Collections;
import java.util.LinkedHashMap;

public record SearchDocument(
        String indexName,
        String documentId,
        String tenantId,
        DocumentKind documentKind,
        @Nullable String parentDocumentId,
        @Nullable String groupKey,
        @Nullable String groupRowId,
        Map<String, Object> fields,
        @Nullable String schemaVersion
) {

    public enum DocumentKind {
        PARENT,
        GROUP_CHILD
    }

    public SearchDocument {
        indexName = requireNonBlank(indexName, "indexName");
        documentId = requireNonBlank(documentId, "documentId");
        tenantId = requireNonBlank(tenantId, "tenantId");
        documentKind = documentKind == null ? DocumentKind.PARENT : documentKind;

        fields = fields == null
                ? Map.of()
                : Collections.unmodifiableMap(new LinkedHashMap<>(fields));

        switch (documentKind) {
            case PARENT -> {
                if (parentDocumentId != null && !parentDocumentId.isBlank()) {
                    throw new IllegalArgumentException("parentDocumentId must be null/blank for PARENT documents");
                }
                if (groupKey != null && !groupKey.isBlank()) {
                    throw new IllegalArgumentException("groupKey must be null/blank for PARENT documents");
                }
                if (groupRowId != null && !groupRowId.isBlank()) {
                    throw new IllegalArgumentException("groupRowId must be null/blank for PARENT documents");
                }
                parentDocumentId = nullIfBlank(parentDocumentId);
                groupKey = nullIfBlank(groupKey);
                groupRowId = nullIfBlank(groupRowId);
            }
            case GROUP_CHILD -> {
                parentDocumentId = requireNonBlank(parentDocumentId, "parentDocumentId");
                groupKey = requireNonBlank(groupKey, "groupKey");
                groupRowId = requireNonBlank(groupRowId, "groupRowId");
            }
        }

        schemaVersion = nullIfBlank(schemaVersion);
    }

    public static SearchDocument parent(
            String indexName,
            String documentId,
            String tenantId,
            Map<String, Object> fields,
            @Nullable String schemaVersion
    ) {
        return new SearchDocument(
                indexName,
                documentId,
                tenantId,
                DocumentKind.PARENT,
                null,
                null,
                null,
                fields,
                schemaVersion
        );
    }

    public static SearchDocument groupChild(
            String indexName,
            String documentId,
            String tenantId,
            String parentDocumentId,
            String groupKey,
                String groupRowId,
            Map<String, Object> fields,
            @Nullable String schemaVersion
    ) {
        return new SearchDocument(
                indexName,
                documentId,
                tenantId,
                DocumentKind.GROUP_CHILD,
                parentDocumentId,
                groupKey,
                groupRowId,
                fields,
                schemaVersion
        );
    }

    public static String childDocumentId(String parentDocumentId, String groupKey, String groupRowId) {
        return requireNonBlank(parentDocumentId, "parentDocumentId")
                + ":" + requireNonBlank(groupKey, "groupKey")
                + ":" + requireNonBlank(groupRowId, "groupRowId");
    }

    private static String requireNonBlank(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return value.trim();
    }

    private static String nullIfBlank(@Nullable String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
