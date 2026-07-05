package com.yalcap.form;

import com.yalcap.persistence.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class FormArtifactService {

    private final FormArtifactRepository repository;

    public FormArtifactService(FormArtifactRepository repository) {
        this.repository = repository;
    }

    public Optional<FormArtifactEntity> getActiveForm(String formKey) {
        return repository.findByFormKeyAndActiveTrue(formKey);
    }

    public List<FormArtifactEntity> getFormHistory(String formKey) {
        return repository.findByFormKeyOrderByVersionNumberDesc(formKey);
    }

    @Transactional
    public FormArtifactEntity publish(String formKey, JsonNode artifact, String createdBy, String changeMessage) {
        validateFormArtifact(artifact);

        Optional<FormArtifactEntity> active = repository.findByFormKeyAndActiveTrue(formKey);
        int nextVersion = active.map(entry -> entry.getVersionNumber() + 1).orElse(1);

        active.ifPresent(entity -> {
            entity.setActive(false);
            repository.save(entity);
        });

        FormArtifactEntity published = new FormArtifactEntity(
                null,
                formKey,
                artifact,
                nextVersion,
                true,
                TenantContext.getTenantId().orElse(UUID.fromString("00000000-0000-0000-0000-000000000000")),
                createdBy,
                changeMessage
        );
        published.setCreatedAt(OffsetDateTime.now());
        return repository.save(published);
    }

    private void validateFormArtifact(JsonNode artifact) {
        if (artifact == null || artifact.isNull() || !artifact.isObject()) {
            throw new IllegalArgumentException("Form artifact payload must be a JSON object");
        }

        String kind = artifact.path("kind").asString("").trim();
        if (!"form".equals(kind)) {
            throw new IllegalArgumentException("Form artifact kind must be 'form'");
        }

        JsonNode form = artifact.path("form");
        if (form.isMissingNode() || form.isNull() || !form.isObject()) {
            throw new IllegalArgumentException("Form artifact must include form object");
        }

        if (form.path("dataSchema").isMissingNode() || form.path("dataSchema").isNull()) {
            throw new IllegalArgumentException("Form artifact must include form.dataSchema");
        }

        if (form.path("controlSchema").isMissingNode() || form.path("controlSchema").isNull()) {
            throw new IllegalArgumentException("Form artifact must include form.controlSchema");
        }

        validateImageControls(form.path("controlSchema"), "form.controlSchema");
    }

    private void validateImageControls(JsonNode controlSchema, String context) {
        JsonNode layout = controlSchema.path("layout");
        if (!layout.isArray()) {
            return;
        }

        for (int i = 0; i < layout.size(); i += 1) {
            JsonNode control = layout.get(i);
            String widget = control.path("widget").asString("").trim();
            if (!"image".equals(widget)) {
                continue;
            }

            JsonNode assetRef = control.path("assetRef");
            if (!assetRef.isObject()) {
                throw new IllegalArgumentException(context + ".layout[" + i + "].assetRef is required for image widget");
            }

            String assetKey = assetRef.path("assetKey").asString("").trim();
            if (assetKey.isEmpty()) {
                throw new IllegalArgumentException(context + ".layout[" + i + "].assetRef.assetKey is required");
            }

            JsonNode versionNode = assetRef.get("version");
            if (versionNode == null || versionNode.isNull() || !versionNode.canConvertToInt() || versionNode.asInt() < 1) {
                throw new IllegalArgumentException(context + ".layout[" + i + "].assetRef.version must be an integer >= 1");
            }

            String sha = assetRef.path("sha256").asString("").trim();
            if (sha.isEmpty()) {
                throw new IllegalArgumentException(context + ".layout[" + i + "].assetRef.sha256 is required");
            }
        }
    }
}
