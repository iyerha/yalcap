package com.yalcap.definition.form;

import com.yalcap.definition.form.control.ControlType;
import com.yalcap.definition.form.control.ControlTextDirection;
import com.yalcap.definition.form.control.ControlTypeRegistry;
import com.yalcap.definition.form.control.ControlTypeValidationContext;
import com.yalcap.definition.form.control.ControlTypeValidationErrors;
import com.yalcap.persistence.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.i18n.LocaleContextHolder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class FormDefinitionService {

    private static final Set<String> RTL_LANGUAGES = Set.of("ar", "fa", "he", "ur");

    private final FormDefinitionRepository repository;
    private final ControlTypeRegistry controlTypeRegistry;

    public FormDefinitionService(FormDefinitionRepository repository,
                                 ControlTypeRegistry controlTypeRegistry) {
        this.repository = repository;
        this.controlTypeRegistry = controlTypeRegistry;
    }

    public Optional<FormDefinitionEntity> getActiveForm(String formKey) {
        return repository.findByFormKeyAndActiveTrue(formKey);
    }

    public List<FormDefinitionEntity> getFormHistory(String formKey) {
        return repository.findByFormKeyOrderByVersionNumberDesc(formKey);
    }

    @Transactional
    public FormDefinitionEntity publish(String formKey, JsonNode definition, String createdBy, String changeMessage) {
        JsonNode preparedDefinition = prepareDefinition(definition);
        validateFormDefinition(preparedDefinition);

        Optional<FormDefinitionEntity> active = repository.findByFormKeyAndActiveTrue(formKey);
        int nextVersion = active.map(entry -> entry.getVersionNumber() + 1).orElse(1);

        active.ifPresent(entity -> {
            entity.setActive(false);
            repository.save(entity);
        });

        FormDefinitionEntity published = new FormDefinitionEntity(
                null,
                formKey,
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
            throw new IllegalArgumentException("Form definition payload must be a JSON object");
        }

        ObjectNode prepared = ((ObjectNode) definition).deepCopy();
        JsonNode layout = prepared.path("form").path("controlSchema").path("layout");
        if (layout.isArray()) {
            ensureControlIds((ArrayNode) layout, "form.controlSchema.layout", new HashSet<>());
        }

        return prepared;
    }

    private void ensureControlIds(ArrayNode layout, String contextPath, Set<String> seenIds) {
        for (int i = 0; i < layout.size(); i += 1) {
            JsonNode controlNode = layout.get(i);
            if (!(controlNode instanceof ObjectNode control)) {
                continue;
            }

            String controlId = control.path("id").asText("").trim();
            if (controlId.isEmpty()) {
                controlId = UUID.randomUUID().toString();
                control.put("id", controlId);
            }

            if (!isGuid(controlId)) {
                throw new IllegalArgumentException(contextPath + "[" + i + "].id must be a valid GUID");
            }

            String normalizedId = controlId.toLowerCase(Locale.ROOT);
            if (!seenIds.add(normalizedId)) {
                throw new IllegalArgumentException(contextPath + "[" + i + "].id must be unique");
            }

            JsonNode children = control.path("children");
            if (children.isArray()) {
                ensureControlIds((ArrayNode) children, contextPath + "[" + i + "].children", seenIds);
            }
        }
    }

    private boolean isGuid(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        try {
            UUID.fromString(value.trim());
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
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

            validateControlTypeDefinition(control, contextPath + "[" + i + "]");

            JsonNode children = control.path("children");
            if (children.isArray()) {
                validateLayoutControlsInLayout(children, contextPath + "[" + i + "].children");
            }
        }
    }

    private void validateControlTypeDefinition(JsonNode control, String controlPath) {
        String widget = control.path("widget").asString("").trim();
        if (widget.isEmpty()) {
            return;
        }

        ControlType type = controlTypeRegistry.find(widget).orElse(null);
        if (type == null) {
            // Keep backward compatibility while core controls are still migrating.
            return;
        }

        Locale locale = LocaleContextHolder.getLocale();
        ControlTextDirection direction = inferDirection(locale);
        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        type.validate(new ControlTypeValidationContext(control, controlPath, errors, locale, direction));
        if (errors.hasErrors()) {
            throw new IllegalArgumentException(String.join("; ", errors.all()));
        }
    }

    private ControlTextDirection inferDirection(Locale locale) {
        if (locale == null) {
            return ControlTextDirection.LTR;
        }
        String language = locale.getLanguage();
        if (language == null) {
            return ControlTextDirection.LTR;
        }
        return RTL_LANGUAGES.contains(language.toLowerCase(Locale.ROOT))
                ? ControlTextDirection.RTL
                : ControlTextDirection.LTR;
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

        if (hasChildren) {
            if (children.size() != 1) {
                throw new IllegalArgumentException(contextPath + ".children must contain exactly one item for repeat widget");
            }

            JsonNode onlyChild = children.get(0);
            String childWidget = onlyChild == null ? "" : onlyChild.path("widget").asString("").trim().toLowerCase();
            if ("repeat".equals(childWidget) || "section".equals(childWidget)) {
                throw new IllegalArgumentException(contextPath + ".children[0] must be a group or scalar control for repeat widget");
            }
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

}