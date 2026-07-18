package com.yalcap.definition.form;

import com.yalcap.persistence.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.time.LocalDate;
import java.time.LocalDateTime;
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

        validateLayoutControls(form.path("controlSchema"), "form.controlSchema");
    }

    private void validateLayoutControls(JsonNode controlSchema, String context) {
        JsonNode layout = controlSchema.path("layout");
        if (!layout.isArray()) {
            return;
        }

        validateLayoutControlsInLayout(layout, context + ".layout");
    }

    private void validateLayoutControlsInLayout(JsonNode layout, String contextPath) {
        for (int i = 0; i < layout.size(); i += 1) {
            JsonNode control = layout.get(i);
            if (!control.isObject()) {
                continue;
            }

            String widget = control.path("widget").asString("").trim();
            if ("image".equals(widget)) {
                JsonNode assetRef = control.path("assetRef");
                if (!assetRef.isObject()) {
                    throw new IllegalArgumentException(contextPath + "[" + i + "].assetRef is required for image widget");
                }

                String assetKey = assetRef.path("assetKey").asString("").trim();
                if (assetKey.isEmpty()) {
                    throw new IllegalArgumentException(contextPath + "[" + i + "].assetRef.assetKey is required");
                }
            }

            if ("repeat".equals(widget)) {
                validateRepeatControl(control, contextPath + "[" + i + "]");
            }

            if ("autocomplete".equals(widget)) {
                String sourceType = control.path("autocompleteSourceType").asString("static").trim();
                JsonNode options = control.path("options");
                if ("remote".equals(sourceType)) {
                    String sourceUrl = control.path("autocompleteSourceUrl").asString("").trim();
                    if (sourceUrl.isEmpty()) {
                        throw new IllegalArgumentException(contextPath + "[" + i + "].autocompleteSourceUrl is required for remote autocomplete widget");
                    }
                } else if (!options.isArray() || options.size() == 0) {
                    throw new IllegalArgumentException(contextPath + "[" + i + "].options is required for autocomplete widget");
                }
            }

            if ("date".equals(widget)) {
                validateDateBounds(control, contextPath + "[" + i + "]", "minDate", "maxDate");
            }

            if ("datetime".equals(widget)) {
                validateDateTimeBounds(control, contextPath + "[" + i + "]", "minDateTime", "maxDateTime");
            }

            if ("table".equals(widget)) {
                JsonNode columns = control.path("columns");
                JsonNode legacyColumns = control.path("tableColumns");
                boolean hasColumns = (columns.isArray() && columns.size() > 0)
                        || (legacyColumns.isArray() && legacyColumns.size() > 0);
                if (!hasColumns) {
                    throw new IllegalArgumentException(contextPath + "[" + i + "].columns is required for table widget");
                }
                validateMinMaxBounds(control, contextPath + "[" + i + "]", "minItems", "maxItems");
                validateMinMaxBounds(control, contextPath + "[" + i + "]", "tableMinItems", "tableMaxItems");
            }

            JsonNode children = control.path("children");
            if (children.isArray()) {
                validateLayoutControlsInLayout(children, contextPath + "[" + i + "].children");
            }
        }
    }

    private void validateRepeatControl(JsonNode control, String contextPath) {
        JsonNode children = control.path("children");
        JsonNode columns = control.path("columns");
        JsonNode legacyColumns = control.path("tableColumns");

        boolean hasChildren = children.isArray() && children.size() > 0;
        boolean hasColumns = (columns.isArray() && columns.size() > 0)
                || (legacyColumns.isArray() && legacyColumns.size() > 0);

        if (!hasChildren && !hasColumns) {
            throw new IllegalArgumentException(contextPath + " requires children or columns for repeat widget");
        }

        validateMinMaxBounds(control, contextPath, "minItems", "maxItems");
        validateMinMaxBounds(control, contextPath, "repeatMinItems", "repeatMaxItems");
    }

    private void validateMinMaxBounds(JsonNode control, String contextPath, String minKey, String maxKey) {
        JsonNode minNode = control.get(minKey);
        JsonNode maxNode = control.get(maxKey);

        Integer min = parseNonNegativeInteger(minNode, contextPath + "." + minKey);
        Integer max = parseNonNegativeInteger(maxNode, contextPath + "." + maxKey);

        if (min != null && max != null && max > 0 && max < min) {
            throw new IllegalArgumentException(contextPath + "." + maxKey + " must be greater than or equal to " + minKey);
        }
    }

    private Integer parseNonNegativeInteger(JsonNode node, String contextPath) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (!node.canConvertToInt()) {
            throw new IllegalArgumentException(contextPath + " must be an integer when provided");
        }
        int value = node.asInt();
        if (value < 0) {
            throw new IllegalArgumentException(contextPath + " must be >= 0 when provided");
        }
        return value;
    }

    private void validateDateBounds(JsonNode control, String contextPath, String minKey, String maxKey) {
        LocalDate min = parseLocalDate(control.get(minKey), contextPath + "." + minKey);
        LocalDate max = parseLocalDate(control.get(maxKey), contextPath + "." + maxKey);
        if (min != null && max != null && max.isBefore(min)) {
            throw new IllegalArgumentException(contextPath + "." + maxKey + " must be greater than or equal to " + minKey);
        }
    }

    private void validateDateTimeBounds(JsonNode control, String contextPath, String minKey, String maxKey) {
        LocalDateTime min = parseLocalDateTime(control.get(minKey), contextPath + "." + minKey);
        LocalDateTime max = parseLocalDateTime(control.get(maxKey), contextPath + "." + maxKey);
        if (min != null && max != null && max.isBefore(min)) {
            throw new IllegalArgumentException(contextPath + "." + maxKey + " must be greater than or equal to " + minKey);
        }
    }

    private LocalDate parseLocalDate(JsonNode node, String contextPath) {
        if (node == null || node.isNull() || !node.isString() || node.asString().trim().isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(node.asString().trim());
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException(contextPath + " must be an ISO date (YYYY-MM-DD)");
        }
    }

    private LocalDateTime parseLocalDateTime(JsonNode node, String contextPath) {
        if (node == null || node.isNull() || !node.isString() || node.asString().trim().isEmpty()) {
            return null;
        }
        try {
            return LocalDateTime.parse(node.asString().trim());
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException(contextPath + " must be an ISO local datetime");
        }
    }
}