package com.yalcap.definition.workflow;

import com.yalcap.definition.form.FormDefinitionEntity;
import com.yalcap.definition.form.FormDefinitionRepository;
import com.yalcap.persistence.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class WorkflowDefinitionService {

    private static final Set<String> ALLOWED_THEME_PRESETS = Set.of("default", "slate", "sunrise", "custom");
    private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$");

    private final WorkflowDefinitionRepository repository;
    private final FormDefinitionRepository formDefinitionRepository;
    private final com.yalcap.asset.AssetFileRepository assetFileRepository;
    private final ObjectMapper objectMapper;

    public WorkflowDefinitionService(WorkflowDefinitionRepository repository,
                                   FormDefinitionRepository formDefinitionRepository,
                                   com.yalcap.asset.AssetFileRepository assetFileRepository,
                                   ObjectMapper objectMapper) {
        this.repository = repository;
        this.formDefinitionRepository = formDefinitionRepository;
        this.assetFileRepository = assetFileRepository;
        this.objectMapper = objectMapper;
    }

    public Optional<WorkflowDefinitionEntity> getActiveDefinition(String definitionKey) {
        return repository.findByDefinitionKeyAndActiveTrue(definitionKey);
    }

    public List<WorkflowDefinitionEntity> getDefinitionHistory(String definitionKey) {
        return repository.findByDefinitionKeyOrderByVersionNumberDesc(definitionKey);
    }

    @Transactional
    public WorkflowDefinitionEntity publishDefinition(String definitionKey,
                                           JsonNode definition,
                                           String createdBy,
                                           String changeMessage) {
        JsonNode preparedDefinition = prepareDefinition(definition);
        validateTheme(preparedDefinition);

        Optional<WorkflowDefinitionEntity> activeDefinition = repository.findByDefinitionKeyAndActiveTrue(definitionKey);
        int nextVersion = activeDefinition.map(entry -> entry.getVersionNumber() + 1).orElse(1);

        activeDefinition.ifPresent(entity -> {
            entity.setActive(false);
            repository.save(entity);
        });

        WorkflowDefinitionEntity published = new WorkflowDefinitionEntity(
                null,
                definitionKey,
                preparedDefinition,
                nextVersion,
                true,
                TenantContext.getTenantId().orElse(UUID.fromString("00000000-0000-0000-0000-000000000000")),
                createdBy,
                changeMessage
        );
        return repository.save(published);
    }

    private JsonNode prepareDefinition(JsonNode definition) {
        if (definition == null || definition.isNull() || !definition.isObject()) {
            throw new IllegalArgumentException("Workflow definition payload must be a JSON object");
        }

        ObjectNode prepared = ((ObjectNode) definition).deepCopy();
        JsonNode resolvedForm = resolveFormNode(prepared);
        if (resolvedForm != null) {
            ObjectNode enrichedSnapshot = enrichFormSnapshot(resolvedForm);
            prepared.set("formSnapshot", enrichedSnapshot);

            if (!prepared.has("dataSchema")) {
                prepared.set("dataSchema", enrichedSnapshot.path("dataSchema"));
            }
            if (!prepared.has("controlSchema")) {
                prepared.set("controlSchema", enrichedSnapshot.path("controlSchema"));
            }
        }

        return prepared;
    }

    private ObjectNode enrichFormSnapshot(JsonNode resolvedForm) {
        if (resolvedForm == null || resolvedForm.isNull() || !resolvedForm.isObject()) {
            throw new IllegalArgumentException("Resolved form payload must be an object");
        }

        ObjectNode snapshot = ((ObjectNode) resolvedForm).deepCopy();
        JsonNode controlSchema = snapshot.path("controlSchema");
        JsonNode layout = controlSchema.path("layout");
        if (!layout.isArray()) {
            return snapshot;
        }

        ArrayNode layoutArray = (ArrayNode) layout;
        for (int i = 0; i < layoutArray.size(); i += 1) {
            JsonNode control = layoutArray.get(i);
            if (!control.isObject()) {
                continue;
            }

            String widget = control.path("widget").asString("").trim();
            if (!"image".equals(widget)) {
                continue;
            }

            ObjectNode controlObject = (ObjectNode) control;
            JsonNode assetRef = controlObject.path("assetRef");
            if (!assetRef.isObject()) {
                throw new IllegalArgumentException("formSnapshot.controlSchema.layout[" + i + "].assetRef is required for image widget");
            }

            String assetKey = assetRef.path("assetKey").asString("").trim();
            if (assetKey.isEmpty()) {
                throw new IllegalArgumentException("formSnapshot.controlSchema.layout[" + i + "].assetRef.assetKey is required");
            }

            JsonNode versionNode = assetRef.get("version");
            Integer requestedVersion = null;
            if (versionNode != null && !versionNode.isNull()) {
                if (!versionNode.canConvertToInt() || versionNode.asInt() < 1) {
                    throw new IllegalArgumentException("formSnapshot.controlSchema.layout[" + i + "].assetRef.version must be an integer >= 1 when provided");
                }
                requestedVersion = versionNode.asInt();
            }
            final Integer resolvedRequestedVersion = requestedVersion;

            com.yalcap.asset.AssetFileEntity resolvedAsset = (resolvedRequestedVersion != null)
                    ? assetFileRepository.findByAssetKeyAndVersionNumber(assetKey, resolvedRequestedVersion)
                        .orElseThrow(() -> new IllegalArgumentException("Asset not found: " + assetKey + " v" + resolvedRequestedVersion))
                    : assetFileRepository.findTopByAssetKeyOrderByVersionNumberDesc(assetKey)
                        .orElseThrow(() -> new IllegalArgumentException("Asset not found (active/latest): " + assetKey));

            ObjectNode assetSnapshot = objectMapper.createObjectNode();
            assetSnapshot.put("assetKey", assetKey);
            assetSnapshot.put("version", resolvedAsset.getVersionNumber() == null ? 1 : resolvedAsset.getVersionNumber());
            assetSnapshot.put("sha256", resolvedAsset.getSha256() == null ? "" : resolvedAsset.getSha256());
            if (resolvedAsset.getMimeType() != null) {
                assetSnapshot.put("mimeType", resolvedAsset.getMimeType());
            }
            if (resolvedAsset.getWidth() != null) {
                assetSnapshot.put("width", resolvedAsset.getWidth());
            }
            if (resolvedAsset.getHeight() != null) {
                assetSnapshot.put("height", resolvedAsset.getHeight());
            }

            if (assetRef.has("mimeType")) {
                assetSnapshot.set("mimeType", assetRef.get("mimeType"));
            }
            if (assetRef.has("width")) {
                assetSnapshot.set("width", assetRef.get("width"));
            }
            if (assetRef.has("height")) {
                assetSnapshot.set("height", assetRef.get("height"));
            }
            if (assetRef.has("url")) {
                assetSnapshot.set("url", assetRef.get("url"));
            }

            controlObject.set("assetSnapshot", assetSnapshot);
        }

        return snapshot;
    }

    private JsonNode resolveFormNode(ObjectNode definition) {
        JsonNode embeddedRootDataSchema = definition.get("dataSchema");
        JsonNode embeddedRootControlSchema = definition.get("controlSchema");

        JsonNode formNode = definition.path("form");
        JsonNode embeddedFormDataSchema = formNode.path("dataSchema");
        JsonNode embeddedFormControlSchema = formNode.path("controlSchema");

        JsonNode formRef = definition.get("formRef");
        boolean hasFormRef = formRef != null && formRef.isObject() && formRef.size() > 0;
        boolean hasEmbeddedRoot = embeddedRootDataSchema != null || embeddedRootControlSchema != null;
        boolean hasEmbeddedForm = !embeddedFormDataSchema.isMissingNode() || !embeddedFormControlSchema.isMissingNode();

        if (hasFormRef && (hasEmbeddedRoot || hasEmbeddedForm)) {
            throw new IllegalArgumentException("Use either embedded form (dataSchema/controlSchema or form.*) or formRef, not both");
        }

        if (hasFormRef) {
            final String refFormKey = formRef.path("formKey").asString("").trim();
            if (refFormKey.isEmpty()) {
                throw new IllegalArgumentException("formRef.formKey is required");
            }

            JsonNode versionNode = formRef.get("versionNumber");
            Integer requestedVersion = null;
            if (versionNode != null && !versionNode.isNull()) {
                if (!versionNode.canConvertToInt()) {
                    throw new IllegalArgumentException("formRef.versionNumber must be an integer");
                }
                int parsedVersion = versionNode.asInt();
                if (parsedVersion < 1) {
                    throw new IllegalArgumentException("formRef.versionNumber must be >= 1 when provided");
                }
                requestedVersion = parsedVersion;
            }
            final Integer resolvedRequestedVersion = requestedVersion;

            FormDefinitionEntity referenced = (resolvedRequestedVersion != null)
                    ? formDefinitionRepository
                        .findByFormKeyAndVersionNumber(refFormKey, resolvedRequestedVersion)
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Referenced form not found: " + refFormKey + " v" + resolvedRequestedVersion))
                    : formDefinitionRepository
                        .findByFormKeyAndActiveTrue(refFormKey)
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Referenced form not found (active): " + refFormKey));

            JsonNode referencedForm = extractEmbeddedForm(referenced.getDefinition());
            if (referencedForm == null) {
                throw new IllegalArgumentException(
                    "Referenced form definition does not contain a form: " + refFormKey + " v" + referenced.getVersionNumber());
            }

            ObjectNode snapshot = objectMapper.createObjectNode();
            snapshot.set("dataSchema", referencedForm.path("dataSchema"));
            snapshot.set("controlSchema", referencedForm.path("controlSchema"));
            ObjectNode source = snapshot.putObject("source");
            source.put("formKey", refFormKey);
            source.put("versionNumber", referenced.getVersionNumber());
            source.put("requestedVersion", resolvedRequestedVersion != null ? resolvedRequestedVersion : -1);
            return snapshot;
        }

        if (hasEmbeddedRoot) {
            if (embeddedRootDataSchema == null || embeddedRootDataSchema.isNull() || embeddedRootDataSchema.isMissingNode()) {
                throw new IllegalArgumentException("Embedded form requires dataSchema");
            }
            if (embeddedRootControlSchema == null || embeddedRootControlSchema.isNull() || embeddedRootControlSchema.isMissingNode()) {
                throw new IllegalArgumentException("Embedded form requires controlSchema");
            }

            ObjectNode snapshot = objectMapper.createObjectNode();
            snapshot.set("dataSchema", embeddedRootDataSchema);
            snapshot.set("controlSchema", embeddedRootControlSchema);
            return snapshot;
        }

        if (hasEmbeddedForm) {
            if (embeddedFormDataSchema.isMissingNode() || embeddedFormDataSchema.isNull()) {
                throw new IllegalArgumentException("Embedded form requires form.dataSchema");
            }
            if (embeddedFormControlSchema.isMissingNode() || embeddedFormControlSchema.isNull()) {
                throw new IllegalArgumentException("Embedded form requires form.controlSchema");
            }

            ObjectNode snapshot = objectMapper.createObjectNode();
            snapshot.set("dataSchema", embeddedFormDataSchema);
            snapshot.set("controlSchema", embeddedFormControlSchema);
            return snapshot;
        }

        return null;
    }

    private JsonNode extractEmbeddedForm(JsonNode definition) {
        if (definition == null || definition.isNull() || !definition.isObject()) {
            return null;
        }

        JsonNode snapshot = definition.get("formSnapshot");
        if (snapshot != null && snapshot.isObject()
                && !snapshot.path("dataSchema").isMissingNode()
                && !snapshot.path("controlSchema").isMissingNode()) {
            return snapshot;
        }

        JsonNode formNode = definition.path("form");
        if (formNode.isObject()
                && !formNode.path("dataSchema").isMissingNode()
                && !formNode.path("controlSchema").isMissingNode()) {
            return formNode;
        }

        JsonNode dataSchema = definition.get("dataSchema");
        JsonNode controlSchema = definition.get("controlSchema");
        if (dataSchema != null && controlSchema != null) {
            ObjectNode node = objectMapper.createObjectNode();
            node.set("dataSchema", dataSchema);
            node.set("controlSchema", controlSchema);
            return node;
        }

        return null;
    }

    private void validateTheme(JsonNode definition) {
        if (definition == null || definition.isNull()) {
            throw new IllegalArgumentException("Workflow definition payload is required");
        }

        JsonNode controlSchema = definition.path("controlSchema");
        if (controlSchema.isMissingNode() || controlSchema.isNull()) {
            controlSchema = definition.path("form").path("controlSchema");
        }
        if (controlSchema.isMissingNode() || controlSchema.isNull()) {
            controlSchema = definition.path("formSnapshot").path("controlSchema");
        }

        JsonNode theme = controlSchema.path("theme");
        if (theme.isMissingNode() || theme.isNull()) {
            return;
        }

        String preset = theme.path("preset").asString("").trim();
        if (preset.isEmpty()) {
            throw new IllegalArgumentException("controlSchema.theme.preset is required when theme is provided");
        }

        if (!ALLOWED_THEME_PRESETS.contains(preset)) {
            throw new IllegalArgumentException("Unsupported theme preset: " + preset);
        }

        if (!"custom".equals(preset)) {
            return;
        }

        JsonNode custom = theme.get("custom");
        if (custom == null || custom.isNull() || !custom.isObject()) {
            throw new IllegalArgumentException("controlSchema.theme.custom is required for preset 'custom'");
        }

        validateHexColor(custom, "accent");
        validateHexColor(custom, "bg");
        validateHexColor(custom, "surface");
        validateHexColor(custom, "text");
    }

    private void validateHexColor(JsonNode custom, String key) {
        JsonNode value = custom.get(key);
        if (value == null || value.isNull() || !value.isString()) {
            throw new IllegalArgumentException("controlSchema.theme.custom." + key + " must be a hex color");
        }

        String color = value.asString().trim();
        if (!HEX_COLOR_PATTERN.matcher(color).matches()) {
            throw new IllegalArgumentException("Invalid hex color for controlSchema.theme.custom." + key + ": " + color);
        }
    }
}