package com.yalcap.definition.form;

import com.yalcap.persistence.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class FormDefinitionService {

    private final FormDefinitionRepository repository;

    public FormDefinitionService(FormDefinitionRepository repository) {
        this.repository = repository;
    }

    public Optional<FormDefinitionEntity> getActiveForm(String formKey) {
        return repository.findByFormKeyAndActiveTrue(formKey);
    }

    public List<FormDefinitionEntity> getFormHistory(String formKey) {
        return repository.findByFormKeyOrderByVersionNumberDesc(formKey);
    }

    @Transactional
    public FormDefinitionEntity publish(String formKey, JsonNode definition, String createdBy, String changeMessage) {
        validateFormDefinition(definition);

        Optional<FormDefinitionEntity> active = repository.findByFormKeyAndActiveTrue(formKey);
        int nextVersion = active.map(entry -> entry.getVersionNumber() + 1).orElse(1);

        active.ifPresent(entity -> {
            entity.setActive(false);
            repository.save(entity);
        });

        FormDefinitionEntity published = new FormDefinitionEntity(
                null,
                formKey,
                definition,
                nextVersion,
                true,
                TenantContext.getTenantId().orElse(UUID.fromString("00000000-0000-0000-0000-000000000000")),
                createdBy,
                changeMessage
        );
        return repository.save(published);
    }

    private void validateFormDefinition(JsonNode definition) {
        if (definition == null || definition.isNull() || !definition.isObject()) {
            throw new IllegalArgumentException("Form definition payload must be a JSON object");
        }

        String kind = definition.path("kind").asString("").trim();
        if (!"form".equals(kind)) {
            throw new IllegalArgumentException("Form definition kind must be 'form'");
        }

        JsonNode form = definition.path("form");
        if (form.isMissingNode() || form.isNull() || !form.isObject()) {
            throw new IllegalArgumentException("Form definition must include form object");
        }

        if (form.path("dataSchema").isMissingNode() || form.path("dataSchema").isNull()) {
            throw new IllegalArgumentException("Form definition must include form.dataSchema");
        }

        if (form.path("controlSchema").isMissingNode() || form.path("controlSchema").isNull()) {
            throw new IllegalArgumentException("Form definition must include form.controlSchema");
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
        }
    }
}