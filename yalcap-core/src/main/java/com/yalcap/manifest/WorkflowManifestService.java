package com.yalcap.manifest;

import com.yalcap.form.FormArtifactEntity;
import com.yalcap.form.FormArtifactRepository;
import com.yalcap.persistence.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class WorkflowManifestService {

    private static final Set<String> ALLOWED_THEME_PRESETS = Set.of("default", "slate", "sunrise", "custom");
    private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$");

    private final WorkflowManifestRepository repository;
    private final FormArtifactRepository formArtifactRepository;
    private final ObjectMapper objectMapper;

    public WorkflowManifestService(WorkflowManifestRepository repository,
                                   FormArtifactRepository formArtifactRepository,
                                   ObjectMapper objectMapper) {
        this.repository = repository;
        this.formArtifactRepository = formArtifactRepository;
        this.objectMapper = objectMapper;
    }

    public Optional<WorkflowManifestEntity> getActiveManifest(String manifestKey) {
        return repository.findByManifestKeyAndActiveTrue(manifestKey);
    }

    public List<WorkflowManifestEntity> getManifestHistory(String manifestKey) {
        return repository.findByManifestKeyOrderByVersionNumberDesc(manifestKey);
    }

    @Transactional
    public WorkflowManifestEntity publish(String manifestKey,
                                           JsonNode manifest,
                                           String createdBy,
                                           String changeMessage) {
        JsonNode preparedManifest = prepareManifest(manifest);
        validateTheme(preparedManifest);

        Optional<WorkflowManifestEntity> activeManifest = repository.findByManifestKeyAndActiveTrue(manifestKey);
        int nextVersion = activeManifest.map(entry -> entry.getVersionNumber() + 1).orElse(1);

        activeManifest.ifPresent(entity -> {
            entity.setActive(false);
            repository.save(entity);
        });

        WorkflowManifestEntity published = new WorkflowManifestEntity(
                null,
                manifestKey,
            preparedManifest,
                nextVersion,
                true,
                TenantContext.getTenantId().orElse(UUID.fromString("00000000-0000-0000-0000-000000000000")),
                createdBy,
                changeMessage
        );
        published.setCreatedAt(OffsetDateTime.now());
        return repository.save(published);
    }

    private JsonNode prepareManifest(JsonNode manifest) {
        if (manifest == null || manifest.isNull() || !manifest.isObject()) {
            throw new IllegalArgumentException("Manifest payload must be a JSON object");
        }

        ObjectNode prepared = manifest.deepCopy();
        JsonNode resolvedForm = resolveFormNode(prepared);
        if (resolvedForm != null) {
            ObjectNode enrichedSnapshot = enrichFormSnapshot(resolvedForm);
            prepared.set("formSnapshot", enrichedSnapshot);

            // Keep existing consumers working while introducing references/snapshots.
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

        ObjectNode snapshot = resolvedForm.deepCopy();
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
            if (versionNode == null || versionNode.isNull() || !versionNode.canConvertToInt() || versionNode.asInt() < 1) {
                throw new IllegalArgumentException("formSnapshot.controlSchema.layout[" + i + "].assetRef.version must be an integer >= 1");
            }

            String sha = assetRef.path("sha256").asString("").trim();
            if (sha.isEmpty()) {
                throw new IllegalArgumentException("formSnapshot.controlSchema.layout[" + i + "].assetRef.sha256 is required");
            }

            ObjectNode assetSnapshot = objectMapper.createObjectNode();
            assetSnapshot.put("assetKey", assetKey);
            assetSnapshot.put("version", versionNode.asInt());
            assetSnapshot.put("sha256", sha);

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

    private JsonNode resolveFormNode(ObjectNode manifest) {
        JsonNode embeddedRootDataSchema = manifest.get("dataSchema");
        JsonNode embeddedRootControlSchema = manifest.get("controlSchema");

        JsonNode formNode = manifest.path("form");
        JsonNode embeddedFormDataSchema = formNode.path("dataSchema");
        JsonNode embeddedFormControlSchema = formNode.path("controlSchema");

        JsonNode formRef = manifest.get("formRef");
        boolean hasFormRef = formRef != null && formRef.isObject() && formRef.size() > 0;
        boolean hasEmbeddedRoot = embeddedRootDataSchema != null || embeddedRootControlSchema != null;
        boolean hasEmbeddedForm = !embeddedFormDataSchema.isMissingNode() || !embeddedFormControlSchema.isMissingNode();

        if (hasFormRef && (hasEmbeddedRoot || hasEmbeddedForm)) {
            throw new IllegalArgumentException("Use either embedded form (dataSchema/controlSchema or form.*) or formRef, not both");
        }

        if (hasFormRef) {
            String refFormKey = formRef.path("formKey").asString("").trim();
            if (refFormKey.isEmpty()) {
                refFormKey = formRef.path("manifestKey").asString("").trim();
            }
            if (refFormKey.isEmpty()) {
                throw new IllegalArgumentException("formRef.formKey is required");
            }

            JsonNode versionNode = formRef.get("versionNumber");
            if (versionNode == null || versionNode.isNull()) {
                throw new IllegalArgumentException("formRef.versionNumber is required and must be pinned");
            }
            if (!versionNode.canConvertToInt()) {
                throw new IllegalArgumentException("formRef.versionNumber must be an integer");
            }

            int versionNumber = versionNode.asInt();
            if (versionNumber < 1) {
                throw new IllegalArgumentException("formRef.versionNumber must be >= 1");
            }

                FormArtifactEntity referenced = formArtifactRepository
                    .findByFormKeyAndVersionNumber(refFormKey, versionNumber)
                    .orElseThrow(() -> new IllegalArgumentException(
                        "Referenced form not found: " + refFormKey + " v" + versionNumber));

                JsonNode referencedForm = extractEmbeddedForm(referenced.getArtifact());
            if (referencedForm == null) {
                throw new IllegalArgumentException(
                    "Referenced artifact does not contain a form: " + refFormKey + " v" + versionNumber);
            }

            ObjectNode snapshot = objectMapper.createObjectNode();
            snapshot.set("dataSchema", referencedForm.path("dataSchema"));
            snapshot.set("controlSchema", referencedForm.path("controlSchema"));
            ObjectNode source = snapshot.putObject("source");
                source.put("formKey", refFormKey);
            source.put("versionNumber", versionNumber);
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

    private JsonNode extractEmbeddedForm(JsonNode manifest) {
        if (manifest == null || manifest.isNull() || !manifest.isObject()) {
            return null;
        }

        JsonNode snapshot = manifest.get("formSnapshot");
        if (snapshot != null && snapshot.isObject()
                && !snapshot.path("dataSchema").isMissingNode()
                && !snapshot.path("controlSchema").isMissingNode()) {
            return snapshot;
        }

        JsonNode formNode = manifest.path("form");
        if (formNode.isObject()
                && !formNode.path("dataSchema").isMissingNode()
                && !formNode.path("controlSchema").isMissingNode()) {
            return formNode;
        }

        JsonNode dataSchema = manifest.get("dataSchema");
        JsonNode controlSchema = manifest.get("controlSchema");
        if (dataSchema != null && controlSchema != null) {
            ObjectNode node = objectMapper.createObjectNode();
            node.set("dataSchema", dataSchema);
            node.set("controlSchema", controlSchema);
            return node;
        }

        return null;
    }

    private void validateTheme(JsonNode manifest) {
        if (manifest == null || manifest.isNull()) {
            throw new IllegalArgumentException("Manifest payload is required");
        }

        JsonNode controlSchema = manifest.path("controlSchema");
        if (controlSchema.isMissingNode() || controlSchema.isNull()) {
            controlSchema = manifest.path("form").path("controlSchema");
        }
        if (controlSchema.isMissingNode() || controlSchema.isNull()) {
            controlSchema = manifest.path("formSnapshot").path("controlSchema");
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
