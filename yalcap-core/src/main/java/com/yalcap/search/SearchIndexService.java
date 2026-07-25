package com.yalcap.search;

import com.yalcap.definition.WorkflowDefinitionPublishedEvent;
import com.yalcap.definition.WorkflowSearchSchemaReader;
import com.yalcap.engine.WorkflowInstanceSavedEvent;

import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class SearchIndexService {

    private static final UUID DEFAULT_TENANT_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");
    private static final String DEFAULT_INDEX_NAME = "yalcap-records";

    private final SearchProvider searchProvider;
    private final WorkflowSearchSchemaReader workflowSearchSchemaReader;
    private final boolean enabled;
    private final ObjectMapper objectMapper;

    public SearchIndexService(SearchProvider searchProvider,
                              WorkflowSearchSchemaReader workflowSearchSchemaReader,
                              @Value("${search.indexing.enabled:false}") boolean enabled,
                              ObjectMapper objectMapper) {
        this.searchProvider = searchProvider;
        this.workflowSearchSchemaReader = workflowSearchSchemaReader;
        this.enabled = enabled;
        this.objectMapper = objectMapper;
    }

    public void indexWorkflowDefinitionEvent(WorkflowDefinitionPublishedEvent event) {
        if (!enabled || event == null) {
            return;
        }

        IndexingSpec spec = resolveSpec(event.definition());
        String tenantId = tenantAsString(event.tenantId());
        String parentId = "wfdef:" + event.definitionKey() + ":v" + event.versionNumber();
        String indexName = chooseIndexName(spec.indexName());

        Map<String, Object> parentFields = new LinkedHashMap<>();
        parentFields.put("recordType", "DEFINITION");
        parentFields.put("definitionKey", event.definitionKey());
        parentFields.put("versionNumber", event.versionNumber());
        parentFields.put("createdBy", event.createdBy());
        parentFields.put("changeMessage", event.changeMessage());

        buildRootFields(parentFields, spec.rootFields(), event.definition());

        List<SearchDocument> docs = new ArrayList<>();
        docs.add(SearchDocumentFactory.createParent(indexName, parentId, tenantId, parentFields, spec.schemaVersion()));
        docs.addAll(buildGroupChildren(indexName, tenantId, parentId, spec.groupFields(), event.definition(), "DEFINITION"));

        searchProvider.bulkUpsert(docs);
    }

    public void indexWorkflowInstanceEvent(WorkflowInstanceSavedEvent event) {
        if (!enabled || event == null) {
            return;
        }

        WorkflowSearchSchemaReader.WorkflowSearchSchemaSnapshot snapshot =
                workflowSearchSchemaReader.findActiveByDefinitionKey(event.definitionKey());

        IndexingSpec spec = snapshot == null
                ? IndexingSpec.empty()
                : resolveSpec(snapshot.workflowDefinition());

        String tenantId = tenantAsString(event.tenantId());
        String parentId = "wfinst:" + event.instanceId();
        String indexName = chooseIndexName(spec.indexName());

        Map<String, Object> parentFields = new LinkedHashMap<>();
        parentFields.put("recordType", "INSTANCE");
        parentFields.put("instanceId", event.instanceId());
        parentFields.put("definitionId", event.definitionId());
        parentFields.put("definitionKey", event.definitionKey());
        parentFields.put("currentStep", event.currentStep());
        parentFields.put("status", event.status());
        parentFields.put("assignee", event.assignee());
        parentFields.put("stepId", event.stepId());

        buildRootFields(parentFields, spec.rootFields(), event.data());

        List<SearchDocument> documents = new ArrayList<>();
        documents.add(SearchDocumentFactory.createParent(
                indexName,
                parentId,
                tenantId,
                parentFields,
                spec.schemaVersion()
        ));

        documents.addAll(buildGroupChildren(
                indexName,
                tenantId,
                parentId,
                spec.groupFields(),
                event.data(),
                "INSTANCE"
        ));

        searchProvider.bulkUpsert(documents);
    }

    private List<SearchDocument> buildGroupChildren(String indexName,
                                                    String tenantId,
                                                    String parentId,
                                                    Map<String, List<FieldSelector>> groupFields,
                                                    @Nullable JsonNode source,
                                                    String recordType) {
        if (source == null || source.isNull() || !source.isObject() || groupFields.isEmpty()) {
            return List.of();
        }

        List<SearchDocument> children = new ArrayList<>();

        for (Map.Entry<String, List<FieldSelector>> entry : groupFields.entrySet()) {
            String groupKey = entry.getKey();
            List<FieldSelector> selectors = entry.getValue();

            JsonNode candidate = source.path(groupKey);
            if (!(candidate instanceof ArrayNode rows)) {
                continue;
            }

            for (int i = 0; i < rows.size(); i++) {
                JsonNode row = rows.get(i);
                String rowId = resolveRowId(row, i);

                Map<String, Object> childFields = new LinkedHashMap<>();
                childFields.put("recordType", recordType);

                for (FieldSelector selector : selectors) {
                    Object value = extractFieldValue(row, selector.path());
                    if (value != null) {
                        childFields.put(selector.target(), value);
                    }
                }

                if (childFields.size() == 1) {
                    continue;
                }

                children.add(SearchDocumentFactory.createGroupChild(
                        indexName,
                        tenantId,
                        parentId,
                        groupKey,
                        rowId,
                        childFields,
                        null
                ));
            }
        }

        return children;
    }

    private void buildRootFields(Map<String, Object> target,
                                 List<FieldSelector> selectors,
                                 @Nullable JsonNode source) {
        if (source == null || source.isNull() || !source.isObject() || selectors.isEmpty()) {
            return;
        }

        for (FieldSelector selector : selectors) {
            Object value = extractFieldValue(source, selector.path());
            if (value != null) {
                target.put(selector.target(), value);
            }
        }
    }

    private Object extractFieldValue(JsonNode base, String path) {
        if (path == null || path.isBlank()) {
            return jsonToObject(base);
        }

        JsonNode cursor = base;
        String[] parts = path.split("\\.");
        for (String raw : parts) {
            String key = raw == null ? "" : raw.trim();
            if (key.isEmpty()) {
                continue;
            }
            if (cursor == null || cursor.isNull()) {
                return null;
            }
            cursor = cursor.path(key);
        }

        if (cursor == null || cursor.isMissingNode() || cursor.isNull()) {
            return null;
        }
        return jsonToObject(cursor);
    }

    private Object jsonToObject(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isString()) {
            return node.asString();
        }
        if (node.isBoolean()) {
            return node.asBoolean();
        }
        if (node.isIntegralNumber()) {
            return node.asLong();
        }
        if (node.isFloatingPointNumber()) {
            return node.asDouble();
        }
        return objectMapper.convertValue(node, Object.class);
    }

    private String resolveRowId(JsonNode row, int index) {
        if (row != null && row.isObject()) {
            String id = row.path("id").asString("").trim();
            if (!id.isEmpty()) {
                return id;
            }
        }
        return Integer.toString(index);
    }

    private IndexingSpec resolveSpec(@Nullable JsonNode workflowDefinitionJson) {
        if (workflowDefinitionJson == null || workflowDefinitionJson.isNull() || !workflowDefinitionJson.isObject()) {
            return IndexingSpec.empty();
        }

        JsonNode indexingNode = workflowDefinitionJson.path("search").path("indexing");
        if (indexingNode.isMissingNode() || indexingNode.isNull() || !indexingNode.isObject()) {
            return IndexingSpec.empty();
        }

        String indexName = trimToNull(indexingNode.path("indexName").asString(null));
        String schemaVersion = trimToNull(indexingNode.path("schemaVersion").asString(null));

        List<FieldSelector> all = new ArrayList<>();
        collectFieldSelectors(all, indexingNode.path("searchableFields"));
        collectFieldSelectors(all, indexingNode.path("displayFields"));

        List<FieldSelector> deduped = dedupe(all);

        List<FieldSelector> root = new ArrayList<>();
        Map<String, List<FieldSelector>> groups = new LinkedHashMap<>();

        for (FieldSelector selector : deduped) {
            if (selector.groupKey() == null) {
                root.add(selector);
                continue;
            }
            groups.computeIfAbsent(selector.groupKey(), key -> new ArrayList<>())
                    .add(new FieldSelector(selector.path(), selector.target(), null));
        }

        return new IndexingSpec(indexName, schemaVersion, root, groups);
    }

    private void collectFieldSelectors(List<FieldSelector> target, JsonNode arrayNode) {
        if (!(arrayNode instanceof ArrayNode array)) {
            return;
        }

        for (JsonNode node : array) {
            if (node == null || node.isNull()) {
                continue;
            }

            if (node.isString()) {
                String path = normalizePath(node.asString(null));
                if (path == null) {
                    continue;
                }
                GroupParse parsed = parseGroupPath(path, null);
                target.add(new FieldSelector(parsed.relativePath(), inferTargetName(parsed.relativePath()), parsed.groupKey()));
                continue;
            }

            if (!node.isObject()) {
                continue;
            }

            String path = normalizePath(node.path("path").asString(null));
            if (path == null) {
                continue;
            }

            String explicitGroup = trimToNull(node.path("groupKey").asString(null));
            GroupParse parsed = parseGroupPath(path, explicitGroup);

            String explicitTarget = trimToNull(node.path("target").asString(null));
            String targetName = explicitTarget != null ? explicitTarget : inferTargetName(parsed.relativePath());

            target.add(new FieldSelector(parsed.relativePath(), targetName, parsed.groupKey()));
        }
    }

    private List<FieldSelector> dedupe(List<FieldSelector> selectors) {
        Set<String> seen = new LinkedHashSet<>();
        List<FieldSelector> result = new ArrayList<>();
        for (FieldSelector selector : selectors) {
            String key = (selector.groupKey() == null ? "root" : selector.groupKey())
                    + "|" + selector.path()
                    + "|" + selector.target();
            if (seen.add(key)) {
                result.add(selector);
            }
        }
        return result;
    }

    private GroupParse parseGroupPath(String path, @Nullable String explicitGroupKey) {
        if (explicitGroupKey != null && !explicitGroupKey.isBlank()) {
            String relative = path;
            String marker = explicitGroupKey + "[]";
            int markerIndex = path.indexOf(marker);
            if (markerIndex >= 0) {
                relative = path.substring(markerIndex + marker.length());
                if (relative.startsWith(".")) {
                    relative = relative.substring(1);
                }
            }
            return new GroupParse(explicitGroupKey, normalizePath(relative));
        }

        int marker = path.indexOf("[]");
        if (marker < 0) {
            return new GroupParse(null, path);
        }

        String groupKey = path.substring(0, marker);
        String relative = path.substring(marker + 2);
        if (relative.startsWith(".")) {
            relative = relative.substring(1);
        }

        return new GroupParse(trimToNull(groupKey), normalizePath(relative));
    }

    private String inferTargetName(String path) {
        if (path == null || path.isBlank()) {
            return "value";
        }
        int idx = path.lastIndexOf('.');
        if (idx >= 0 && idx < path.length() - 1) {
            return path.substring(idx + 1);
        }
        return path;
    }

    private String tenantAsString(@Nullable String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return DEFAULT_TENANT_ID.toString();
        }
        return tenantId.trim();
    }

    private String chooseIndexName(@Nullable String configured) {
        return configured == null || configured.isBlank() ? DEFAULT_INDEX_NAME : configured;
    }

    private String normalizePath(@Nullable String path) {
        String p = trimToNull(path);
        if (p == null) {
            return null;
        }
        if (p.startsWith("$.")) {
            return p.substring(2);
        }
        return p;
    }

    private String trimToNull(@Nullable String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record GroupParse(@Nullable String groupKey, String relativePath) {
    }

    private record FieldSelector(String path, String target, @Nullable String groupKey) {
    }

    private record IndexingSpec(
            @Nullable String indexName,
            @Nullable String schemaVersion,
            List<FieldSelector> rootFields,
            Map<String, List<FieldSelector>> groupFields
    ) {
        static IndexingSpec empty() {
            return new IndexingSpec(null, null, List.of(), Map.of());
        }
    }
}