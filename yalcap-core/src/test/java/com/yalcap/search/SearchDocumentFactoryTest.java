package com.yalcap.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

public class SearchDocumentFactoryTest {
    @Test
    void createParent_setsParentKindAndClearsChildLinkFields() {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("status", "OPEN");
        fields.put("priority", 2);

        SearchDocument document = SearchDocumentFactory.createParent(
                "workflow-tasks",
                "doc-1",
                "tenant-1",
                fields,
                "v1"
        );

        assertEquals("workflow-tasks", document.indexName());
        assertEquals("doc-1", document.documentId());
        assertEquals("tenant-1", document.tenantId());
        assertEquals(SearchDocument.DocumentKind.PARENT, document.documentKind());

        assertNull(document.parentDocumentId());
        assertNull(document.groupKey());
        assertNull(document.groupRowId());

        assertEquals("OPEN", document.fields().get("status"));
        assertEquals(2, document.fields().get("priority"));
        assertEquals("v1", document.schemaVersion());
    }

    @Test
    void createGroupChild_generatesDeterministicChildDocumentId() {
        Map<String, Object> fields = Map.of("lineTotal", 125.50);

        SearchDocument document = SearchDocumentFactory.createGroupChild(
                "workflow-tasks",
                "tenant-1",
                "parent-10",
                "lineItems",
                "3",
                fields,
                null
        );

        assertEquals("parent-10:lineItems:3", document.documentId());
        assertEquals(SearchDocument.DocumentKind.GROUP_CHILD, document.documentKind());
        assertEquals("parent-10", document.parentDocumentId());
        assertEquals("lineItems", document.groupKey());
        assertEquals("3", document.groupRowId());
        assertEquals(125.50, document.fields().get("lineTotal"));
    }

    @Test
    void createGroupChild_withExplicitDocumentId_preservesProvidedId() {
        SearchDocument document = SearchDocumentFactory.createGroupChild(
                "workflow-tasks",
                "child-custom-id",
                "tenant-1",
                "parent-10",
                "lineItems",
                "3",
                Map.of("sku", "ABC-123"),
                "v2"
        );

        assertEquals("child-custom-id", document.documentId());
        assertEquals(SearchDocument.DocumentKind.GROUP_CHILD, document.documentKind());
        assertEquals("parent-10", document.parentDocumentId());
        assertEquals("lineItems", document.groupKey());
        assertEquals("3", document.groupRowId());
        assertEquals("v2", document.schemaVersion());
    }

    @Test
    void createParent_withNullFields_defaultsToEmptyImmutableMap() {
        SearchDocument document = SearchDocumentFactory.createParent(
                "workflow-tasks",
                "doc-2",
                "tenant-1",
                null,
                null
        );

        assertNotNull(document.fields());
        assertTrue(document.fields().isEmpty());
        assertThrows(UnsupportedOperationException.class, () -> document.fields().put("x", "y"));
    }

    @Test
    void createGroupChild_withNullFields_defaultsToEmptyImmutableMap() {
        SearchDocument document = SearchDocumentFactory.createGroupChild(
                "workflow-tasks",
                "tenant-1",
                "parent-1",
                "groupA",
                "row-1",
                null,
                null
        );

        assertNotNull(document.fields());
        assertTrue(document.fields().isEmpty());
        assertThrows(UnsupportedOperationException.class, () -> document.fields().put("x", "y"));
    }

    @Test
    void childDocumentId_throwsForBlankInputs() {
        assertThrows(IllegalArgumentException.class, () ->
                SearchDocument.childDocumentId(" ", "groupA", "1"));

        assertThrows(IllegalArgumentException.class, () ->
                SearchDocument.childDocumentId("parent-1", "", "1"));

        assertThrows(IllegalArgumentException.class, () ->
                SearchDocument.childDocumentId("parent-1", "groupA", " "));
    }

    @Test
    void createParent_throwsForBlankRequiredInputs() {
        assertThrows(IllegalArgumentException.class, () ->
                SearchDocumentFactory.createParent(" ", "doc-1", "tenant-1", Map.of(), null));

        assertThrows(IllegalArgumentException.class, () ->
                SearchDocumentFactory.createParent("idx", "", "tenant-1", Map.of(), null));

        assertThrows(IllegalArgumentException.class, () ->
                SearchDocumentFactory.createParent("idx", "doc-1", " ", Map.of(), null));
    }

    @Test
    void createGroupChild_throwsForBlankRequiredInputs() {
        assertThrows(IllegalArgumentException.class, () ->
                SearchDocumentFactory.createGroupChild("idx", "tenant-1", " ", "groupA", "1", Map.of(), null));

        assertThrows(IllegalArgumentException.class, () ->
                SearchDocumentFactory.createGroupChild("idx", "tenant-1", "parent-1", "", "1", Map.of(), null));

        assertThrows(IllegalArgumentException.class, () ->
                SearchDocumentFactory.createGroupChild("idx", "tenant-1", "parent-1", "groupA", " ", Map.of(), null));
    }
}
