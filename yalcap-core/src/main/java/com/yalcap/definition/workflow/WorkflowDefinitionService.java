package com.yalcap.definition.workflow;

import com.yalcap.definition.form.load.FormLoadDataContext;
import com.yalcap.definition.form.load.FormLoadDataService;
import com.yalcap.definition.form.load.FormLoadDataPhase;
import com.yalcap.definition.form.FormDefinitionEntity;
import com.yalcap.definition.form.FormDefinitionRepository;
import com.yalcap.definition.workflow.step.StepType;
import com.yalcap.definition.workflow.step.StepTypeRegistry;
import com.yalcap.definition.workflow.step.StepTypeValidationContext;
import com.yalcap.definition.workflow.step.StepTypeValidationErrors;
import com.yalcap.persistence.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.NullNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.HashSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Set;
import java.util.ArrayList;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class WorkflowDefinitionService {

    private static final Set<String> ALLOWED_THEME_PRESETS = Set.of("default", "slate", "sunrise", "custom");
    private static final Set<String> ALLOWED_API_METHODS = Set.of("get", "post", "put", "patch", "delete");
    private static final Set<String> ALLOWED_API_TRIGGERS = Set.of("change", "input", "blur", "submit", "click");
    private static final Set<String> ALLOWED_API_SWAPS = Set.of("innerHTML", "outerHTML", "beforeend", "afterend");
    private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$");
    private static final Pattern API_ENDPOINT_PATTERN = Pattern.compile("^/api/[A-Za-z0-9_./\\-?=&:%]*$");
    private static final Pattern API_TARGET_PATTERN = Pattern.compile("^[#.][A-Za-z][A-Za-z0-9_:\\-.]*$");

    private final WorkflowDefinitionRepository repository;
    private final FormDefinitionRepository formDefinitionRepository;
    private final com.yalcap.asset.AssetFileRepository assetFileRepository;
    private final FormLoadDataService formLoadDataHydrationService;
    private final StepTypeRegistry stepTypeRegistry;
    private final WorkflowRuleEngine workflowRuleEngine;
    private final ObjectMapper objectMapper;

    public WorkflowDefinitionService(WorkflowDefinitionRepository repository,
                                   FormDefinitionRepository formDefinitionRepository,
                                   com.yalcap.asset.AssetFileRepository assetFileRepository,
                                   FormLoadDataService formLoadDataHydrationService,
                                   StepTypeRegistry stepTypeRegistry,
                                   WorkflowRuleEngine workflowRuleEngine,
                                   ObjectMapper objectMapper) {
        this.repository = repository;
        this.formDefinitionRepository = formDefinitionRepository;
        this.assetFileRepository = assetFileRepository;
        this.formLoadDataHydrationService = formLoadDataHydrationService;
        this.stepTypeRegistry = stepTypeRegistry;
        this.workflowRuleEngine = workflowRuleEngine;
        this.objectMapper = objectMapper;
    }

    public Optional<WorkflowDefinitionEntity> getActiveDefinition(String definitionKey) {
        return repository.findByDefinitionKeyAndActiveTrue(definitionKey);
    }

    public List<WorkflowDefinitionEntity> getDefinitionHistory(String definitionKey) {
        return repository.findByDefinitionKeyOrderByVersionNumberDesc(definitionKey);
    }

    public Optional<ObjectNode> resolveDefinitionView(String definitionKey, ResolveDefinitionViewRequest request) {
        return repository.findByDefinitionKeyAndActiveTrue(definitionKey)
                .map(entity -> resolveDefinitionView(entity, request));
    }

    public static class ResolveDefinitionViewRequest {
        private String stepId;
        private String userId;
        private List<String> userGroups;
        private JsonNode data;
        private Boolean formInitialization;

        public String getStepId() {
            return stepId;
        }

        public void setStepId(String stepId) {
            this.stepId = stepId;
        }

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public List<String> getUserGroups() {
            return userGroups;
        }

        public void setUserGroups(List<String> userGroups) {
            this.userGroups = userGroups;
        }

        public JsonNode getData() {
            return data;
        }

        public void setData(JsonNode data) {
            this.data = data;
        }

        public Boolean getFormInitialization() {
            return formInitialization;
        }

        public void setFormInitialization(Boolean formInitialization) {
            this.formInitialization = formInitialization;
        }
    }

    @Transactional
    public WorkflowDefinitionEntity publishDefinition(String definitionKey,
                                           JsonNode definition,
                                           String createdBy,
                                           String changeMessage) {
        JsonNode preparedDefinition = prepareDefinition(definition);
        validateTheme(preparedDefinition);
        validateStepDefinitions(preparedDefinition);
        validateAndNormalizeRuleActions(preparedDefinition);

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

        validateRuntimeControlRulesInLayout((ArrayNode) layout, "formSnapshot.controlSchema.layout");
        enrichImageControlsInLayout((ArrayNode) layout, "formSnapshot.controlSchema.layout");

        return snapshot;
    }

    private void validateStepDefinitions(JsonNode definition) {
        if (definition == null || !definition.isObject()) {
            return;
        }

        JsonNode stepsNode = definition.path("steps");
        if (!stepsNode.isArray()) {
            return;
        }

        for (int i = 0; i < stepsNode.size(); i += 1) {
            JsonNode stepNode = stepsNode.get(i);
            if (stepNode == null || !stepNode.isObject()) {
                continue;
            }

            String stepPath = "steps[" + i + "]";
            String stepTypeKey = safeString(stepNode.path("type").asString());
            if (stepTypeKey.isEmpty()) {
                throw new IllegalArgumentException(stepPath + ".type is required");
            }

            StepType stepType = stepTypeRegistry.find(stepTypeKey)
                    .orElseThrow(() -> new IllegalArgumentException(stepPath + ".type is not registered: " + stepTypeKey));

            StepTypeValidationErrors errors = new StepTypeValidationErrors();
            stepType.validate(new StepTypeValidationContext(stepNode, stepPath, errors));
            if (errors.hasErrors()) {
                throw new IllegalArgumentException(String.join("; ", errors.all()));
            }
        }
    }

    private void validateRuntimeControlRulesInLayout(ArrayNode layoutArray, String contextPath) {
        for (int i = 0; i < layoutArray.size(); i += 1) {
            JsonNode control = layoutArray.get(i);
            if (!control.isObject()) {
                continue;
            }

            String widget = control.path("widget").asString("").trim();
            String controlPath = contextPath + "[" + i + "]";

            if ("repeat".equals(widget)) {
                validateRepeatControlRuntimeRules(control, controlPath);
            }

            if ("table".equals(widget)) {
                JsonNode columns = control.path("columns");
                JsonNode legacyColumns = control.path("tableColumns");
                boolean hasColumns = (columns.isArray() && columns.size() > 0)
                        || (legacyColumns.isArray() && legacyColumns.size() > 0);
                if (!hasColumns) {
                    throw new IllegalArgumentException(controlPath + ".columns is required for table widget");
                }
                validateMinMaxBounds(control, controlPath, "minItems", "maxItems");
                validateMinMaxBounds(control, controlPath, "tableMinItems", "tableMaxItems");
            }

            JsonNode children = control.path("children");
            if (children.isArray()) {
                validateRuntimeControlRulesInLayout((ArrayNode) children, controlPath + ".children");
            }
        }
    }

    private void validateRepeatControlRuntimeRules(JsonNode control, String controlPath) {
        JsonNode children = control.path("children");
        JsonNode columns = control.path("columns");
        JsonNode legacyColumns = control.path("tableColumns");

        boolean hasChildren = children.isArray() && children.size() > 0;
        boolean hasColumns = (columns.isArray() && columns.size() > 0)
                || (legacyColumns.isArray() && legacyColumns.size() > 0);

        if (!hasChildren && !hasColumns) {
            throw new IllegalArgumentException(controlPath + " requires children or columns for repeat widget");
        }

        if (hasChildren) {
            if (children.size() != 1) {
                throw new IllegalArgumentException(controlPath + ".children must contain exactly one item for repeat widget");
            }

            JsonNode onlyChild = children.get(0);
            String childWidget = onlyChild == null ? "" : onlyChild.path("widget").asString("").trim().toLowerCase();
            if ("repeat".equals(childWidget) || "section".equals(childWidget)) {
                throw new IllegalArgumentException(controlPath + ".children[0] must be a group or scalar control for repeat widget");
            }
        }

        validateMinMaxBounds(control, controlPath, "minItems", "maxItems");
        validateMinMaxBounds(control, controlPath, "repeatMinItems", "repeatMaxItems");
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

    private void enrichImageControlsInLayout(ArrayNode layoutArray, String contextPath) {

        for (int i = 0; i < layoutArray.size(); i += 1) {
            JsonNode control = layoutArray.get(i);
            if (!control.isObject()) {
                continue;
            }

            String widget = control.path("widget").asString("").trim();
            if ("image".equals(widget)) {
                ObjectNode controlObject = (ObjectNode) control;
                JsonNode assetRef = controlObject.path("assetRef");
                if (!assetRef.isObject()) {
                    throw new IllegalArgumentException(contextPath + "[" + i + "].assetRef is required for image widget");
                }

                String assetKey = assetRef.path("assetKey").asString("").trim();
                if (assetKey.isEmpty()) {
                    throw new IllegalArgumentException(contextPath + "[" + i + "].assetRef.assetKey is required");
                }

                JsonNode versionNode = assetRef.get("version");
                Integer requestedVersion = null;
                if (versionNode != null && !versionNode.isNull()) {
                    if (!versionNode.canConvertToInt() || versionNode.asInt() < 1) {
                        throw new IllegalArgumentException(contextPath + "[" + i + "].assetRef.version must be an integer >= 1 when provided");
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

            JsonNode children = control.path("children");
            if (children.isArray()) {
                enrichImageControlsInLayout((ArrayNode) children, contextPath + "[" + i + "].children");
            }
        }
    }

    private JsonNode resolveFormNode(ObjectNode definition) {
        JsonNode embeddedRootDataSchema = definition.get("dataSchema");
        JsonNode embeddedRootControlSchema = definition.get("controlSchema");

        JsonNode formNode = definition.path("form");
        JsonNode embeddedFormDataSchema = formNode.path("dataSchema");
        JsonNode embeddedFormControlSchema = formNode.path("controlSchema");

        JsonNode formRef = definition.path("formRef");
        boolean hasFormRef = formRef.isObject() && formRef.size() > 0;
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

    private ObjectNode resolveDefinitionView(WorkflowDefinitionEntity definitionEntity,
                                             ResolveDefinitionViewRequest request) {
        JsonNode definition = definitionEntity.getDefinition();
        if (definition == null || definition.isNull() || !definition.isObject()) {
            throw new IllegalArgumentException("Stored workflow definition payload must be a JSON object");
        }

        ObjectNode definitionCopy = ((ObjectNode) definition).deepCopy();
        ObjectNode inputData = asObjectNode(request != null ? request.getData() : null);
        ObjectNode hydratedData = formLoadDataHydrationService.load(new FormLoadDataContext(
            safeString(definitionEntity.getDefinitionKey()),
            request != null ? safeString(request.getStepId()) : "",
            request != null ? safeString(request.getUserId()) : "",
            request != null && request.getUserGroups() != null ? request.getUserGroups() : List.of(),
            definitionEntity.getTenantId(),
            inputData.deepCopy(),
            FormLoadDataPhase.FORM_OPEN
        ));
        ObjectNode mergedData = mergeData(inputData, hydratedData);
        ObjectNode context = buildRuleContext(definitionEntity, request, mergedData);
        boolean initializationPhase = isInitializationPhase(request);

        // Apply value-derivation actions first so subsequent rules can reference derived data.* facts.
        workflowRuleEngine.applyDerivedValueRules(definitionCopy.path("rules"), "form", context, mergedData, initializationPhase);
        workflowRuleEngine.applyDerivedValueRules(definitionCopy.path("rules"), "step", context, mergedData, initializationPhase);

        Map<String, WorkflowRuleEngine.RuleEffectState> formRuleState = workflowRuleEngine.evaluateRules(definitionCopy.path("rules"), "form", context, initializationPhase);
        Map<String, WorkflowRuleEngine.RuleEffectState> stepRuleState = workflowRuleEngine.evaluateRules(definitionCopy.path("rules"), "step", context, initializationPhase);
        ArrayNode formApiActions = evaluateApiActions(definitionCopy.path("rules"), "form", context, initializationPhase);
        ArrayNode stepApiActions = evaluateApiActions(definitionCopy.path("rules"), "step", context, initializationPhase);
        Map<String, ObjectNode> formHtmxByTarget = buildHtmxAttributesByTarget(formApiActions);
        Map<String, ObjectNode> stepHtmxByTarget = buildHtmxAttributesByTarget(stepApiActions);

        ObjectNode controlSchema = resolveControlSchema(definitionCopy);
        Set<String> readablePointers = new HashSet<>();
        ArrayNode readableTargets = objectMapper.createArrayNode();
        ArrayNode writableTargets = objectMapper.createArrayNode();

        if (controlSchema != null) {
            JsonNode layout = controlSchema.path("layout");
            if (layout.isArray()) {
                ArrayNode filteredLayout = objectMapper.createArrayNode();
                filterLayout(
                        (ArrayNode) layout,
                        filteredLayout,
                        formRuleState,
                        stepRuleState,
                    formHtmxByTarget,
                    stepHtmxByTarget,
                        readablePointers,
                        readableTargets,
                        writableTargets
                );
                controlSchema.set("layout", filteredLayout);
            }
        }

        ObjectNode projectedData = projectReadableData(mergedData, readablePointers);

        ObjectNode response = objectMapper.createObjectNode();
        response.put("definitionKey", definitionEntity.getDefinitionKey());
        response.put("versionNumber", definitionEntity.getVersionNumber() == null ? 1 : definitionEntity.getVersionNumber());
        response.put("stepId", request != null ? safeString(request.getStepId()) : "");
        response.set("definition", definitionCopy);
        response.set("data", projectedData);

        ObjectNode permissions = response.putObject("permissions");
        permissions.set("readable", readableTargets);
        permissions.set("writable", writableTargets);

        ObjectNode runtime = response.putObject("runtime");
        ObjectNode runtimeApiActions = runtime.putObject("apiActions");
        runtimeApiActions.set("form", formApiActions);
        runtimeApiActions.set("step", stepApiActions);

        return response;
    }

    private void validateAndNormalizeRuleActions(JsonNode definition) {
        if (definition == null || !definition.isObject()) {
            return;
        }

        JsonNode rulesNode = definition.path("rules");
        if (!rulesNode.isArray()) {
            return;
        }

        for (int i = 0; i < rulesNode.size(); i += 1) {
            JsonNode ruleNode = rulesNode.get(i);
            if (ruleNode == null || !ruleNode.isObject()) {
                continue;
            }

            ObjectNode rule = (ObjectNode) ruleNode;
            JsonNode actionsNode = rule.path("actions");
            if (!actionsNode.isArray()) {
                continue;
            }

            for (int j = 0; j < actionsNode.size(); j += 1) {
                JsonNode actionNode = actionsNode.get(j);
                if (actionNode == null || !actionNode.isObject()) {
                    continue;
                }
                if (!isApiAction(actionNode)) {
                    continue;
                }

                String contextPath = "rules[" + i + "].actions[" + j + "]";
                ObjectNode normalized = normalizeApiAction((ObjectNode) actionNode, contextPath, true);
                ((ArrayNode) actionsNode).set(j, normalized);
            }
        }
    }

    private ArrayNode evaluateApiActions(JsonNode rulesNode,
                                         String scope,
                                         ObjectNode context,
                                         boolean initializationPhase) {
        ArrayNode out = objectMapper.createArrayNode();
        if (!rulesNode.isArray()) {
            return out;
        }

        Map<String, ObjectNode> deduped = new LinkedHashMap<>();
        for (int i = 0; i < rulesNode.size(); i += 1) {
            JsonNode rule = rulesNode.get(i);
            if (rule == null || !rule.isObject()) {
                continue;
            }

            String ruleScope = safeString(rule.path("scope").asString());
            if (!scope.equals(ruleScope)) {
                continue;
            }
            if (!workflowRuleEngine.shouldEvaluateRuleForPhase(rule, initializationPhase)) {
                continue;
            }

            JsonNode when = rule.path("when");
            if (!workflowRuleEngine.evaluateCondition(when, context)) {
                continue;
            }

            JsonNode actionsNode = rule.path("actions");
            if (!actionsNode.isArray()) {
                continue;
            }

            for (int j = 0; j < actionsNode.size(); j += 1) {
                JsonNode actionNode = actionsNode.get(j);
                if (actionNode == null || !actionNode.isObject() || !isApiAction(actionNode)) {
                    continue;
                }

                ObjectNode normalized;
                try {
                    normalized = normalizeApiAction((ObjectNode) actionNode,
                            "rules[" + i + "].actions[" + j + "]", false);
                } catch (IllegalArgumentException ex) {
                    continue;
                }

                String key = safeString(normalized.path("endpoint").asString()) + "|"
                    + safeString(normalized.path("method").asString()) + "|"
                    + safeString(normalized.path("trigger").asString()) + "|"
                    + safeString(normalized.path("target").asString()) + "|"
                    + safeString(normalized.path("swap").asString()) + "|"
                    + safeString(normalized.path("valsTemplate").asString());
                deduped.putIfAbsent(key, normalized);
            }
        }

        deduped.values().forEach(out::add);
        return out;
    }

    private boolean isApiAction(JsonNode actionNode) {
        if (actionNode == null || !actionNode.isObject()) {
            return false;
        }
        String kind = safeString(actionNode.path("kind").asString()).toLowerCase();
        if ("api".equals(kind)) {
            return true;
        }
        return !safeString(actionNode.path("endpoint").asString()).isEmpty();
    }

    private ObjectNode normalizeApiAction(ObjectNode actionNode,
                                          String contextPath,
                                          boolean strict) {
        String endpoint = safeString(actionNode.path("endpoint").asString());
        if (endpoint.isEmpty()) {
            if (strict) {
                throw new IllegalArgumentException(contextPath + ".endpoint is required for API actions");
            }
            endpoint = "";
        }
        if (!endpoint.isEmpty() && !API_ENDPOINT_PATTERN.matcher(endpoint).matches()) {
            throw new IllegalArgumentException(contextPath + ".endpoint must match /api/* and contain safe URL characters");
        }

        String method = safeString(actionNode.path("method").asString()).toLowerCase();
        if (method.isEmpty()) {
            method = "get";
        }
        if (!ALLOWED_API_METHODS.contains(method)) {
            throw new IllegalArgumentException(contextPath + ".method must be one of " + ALLOWED_API_METHODS);
        }

        String trigger = safeString(actionNode.path("trigger").asString()).toLowerCase();
        if (trigger.isEmpty()) {
            trigger = "change";
        }
        if (!ALLOWED_API_TRIGGERS.contains(trigger)) {
            throw new IllegalArgumentException(contextPath + ".trigger must be one of " + ALLOWED_API_TRIGGERS);
        }

        String target = safeString(actionNode.path("target").asString());
        if (!target.isEmpty() && !API_TARGET_PATTERN.matcher(target).matches()) {
            throw new IllegalArgumentException(contextPath + ".target must be a safe CSS id/class selector like #id or .class");
        }

        String swap = safeString(actionNode.path("swap").asString());
        if (swap.isEmpty()) {
            swap = "innerHTML";
        }
        if (!ALLOWED_API_SWAPS.contains(swap)) {
            throw new IllegalArgumentException(contextPath + ".swap must be one of " + ALLOWED_API_SWAPS);
        }

        String valsTemplate = safeString(actionNode.path("valsTemplate").asString());
        if (valsTemplate.length() > 1000) {
            throw new IllegalArgumentException(contextPath + ".valsTemplate is too long (max 1000 chars)");
        }

        ObjectNode normalized = objectMapper.createObjectNode();
        normalized.put("kind", "api");
        normalized.put("endpoint", endpoint);
        normalized.put("method", method);
        normalized.put("trigger", trigger);
        normalized.put("target", target);
        normalized.put("swap", swap);
        normalized.put("valsTemplate", valsTemplate);
        normalized.set("htmx", buildServerHtmxAttributes(endpoint, method, trigger, target, swap, valsTemplate));
        return normalized;
    }

    private ObjectNode buildServerHtmxAttributes(String endpoint,
                                                 String method,
                                                 String trigger,
                                                 String target,
                                                 String swap,
                                                 String valsTemplate) {
        ObjectNode attrs = objectMapper.createObjectNode();
        attrs.put("hxTrigger", trigger);
        attrs.put("hxSwap", swap);
        if ("get".equals(method)) {
            attrs.put("hxGet", endpoint);
        } else {
            attrs.put("hxPost", endpoint);
            attrs.put("hxMethod", method);
        }
        if (!target.isEmpty()) {
            attrs.put("hxTarget", target);
        }
        if (!valsTemplate.isEmpty()) {
            attrs.put("hxVals", valsTemplate);
        }
        return attrs;
    }

    private ObjectNode resolveControlSchema(ObjectNode definition) {
        JsonNode controlSchema = definition.path("controlSchema");
        if (controlSchema.isObject()) {
            return (ObjectNode) controlSchema;
        }

        JsonNode formSnapshotControlSchema = definition.path("formSnapshot").path("controlSchema");
        if (formSnapshotControlSchema.isObject()) {
            definition.set("controlSchema", formSnapshotControlSchema.deepCopy());
            return (ObjectNode) definition.path("controlSchema");
        }

        return null;
    }

    private ObjectNode buildRuleContext(WorkflowDefinitionEntity entity,
                                        ResolveDefinitionViewRequest request,
                                        JsonNode data) {
        ObjectNode context = objectMapper.createObjectNode();

        ObjectNode user = context.putObject("user");
        if (request != null) {
            user.put("id", safeString(request.getUserId()));
            ArrayNode groups = user.putArray("groups");
            if (request.getUserGroups() != null) {
                for (String group : request.getUserGroups()) {
                    if (group != null && !group.trim().isEmpty()) {
                        groups.add(group.trim());
                    }
                }
            }
        } else {
            user.put("id", "");
            user.putArray("groups");
        }

        ObjectNode workflow = context.putObject("workflow");
        workflow.put("definitionKey", safeString(entity.getDefinitionKey()));
        workflow.put("stepId", request != null ? safeString(request.getStepId()) : "");

        ObjectNode tenant = context.putObject("tenant");
        tenant.put("id", entity.getTenantId() != null ? entity.getTenantId().toString() : "");

        if (data != null && data.isObject()) {
            context.set("data", data.deepCopy());
        } else {
            context.set("data", objectMapper.createObjectNode());
        }

        return context;
    }

    private ObjectNode asObjectNode(JsonNode data) {
        if (data != null && data.isObject()) {
            return ((ObjectNode) data).deepCopy();
        }
        return objectMapper.createObjectNode();
    }

    private ObjectNode mergeData(ObjectNode baseData, ObjectNode hydratedData) {
        ObjectNode merged = baseData == null ? objectMapper.createObjectNode() : baseData.deepCopy();
        if (hydratedData != null) {
            merged.setAll(hydratedData);
        }
        return merged;
    }

    private boolean isInitializationPhase(ResolveDefinitionViewRequest request) {
        return request != null && Boolean.TRUE.equals(request.getFormInitialization());
    }

    private void filterLayout(ArrayNode sourceLayout,
                              ArrayNode targetLayout,
                              Map<String, WorkflowRuleEngine.RuleEffectState> formRuleState,
                              Map<String, WorkflowRuleEngine.RuleEffectState> stepRuleState,
                              Map<String, ObjectNode> formHtmxByTarget,
                              Map<String, ObjectNode> stepHtmxByTarget,
                              Set<String> readablePointers,
                              ArrayNode readableTargets,
                              ArrayNode writableTargets) {
        for (JsonNode node : sourceLayout) {
            if (!node.isObject()) {
                continue;
            }

            ObjectNode control = (ObjectNode) node;
            String target = resolveTarget(control);
            EffectiveControlState effectiveState = resolveEffectiveControlState(control, target, formRuleState, stepRuleState);
            if (!effectiveState.visible || !effectiveState.readable) {
                continue;
            }

            ObjectNode copy = control.deepCopy();
            copy.put("visible", true);
            copy.put("enabled", effectiveState.enabled);
            copy.put("required", effectiveState.required);
            copy.put("collapsed", effectiveState.collapsed);
            applyColumnVisibility(copy, target, formRuleState, stepRuleState);

            if (!target.isEmpty()) {
                ObjectNode htmx = stepHtmxByTarget.get(target);
                if (htmx == null) {
                    htmx = formHtmxByTarget.get(target);
                }
                if (htmx != null) {
                    // Runtime-resolved HTMX attributes for server-side renderer consumption.
                    copy.set("runtimeHtmx", htmx.deepCopy());
                }
            }

            JsonNode pointerNode = copy.get("pointer");
            if (pointerNode != null && pointerNode.isString()) {
                readablePointers.add(pointerNode.asString());
            }

            if (!target.isEmpty()) {
                readableTargets.add(target);
                if (effectiveState.writable) {
                    writableTargets.add(target);
                }
            }

            JsonNode children = copy.get("children");
            if (children != null && children.isArray()) {
                ArrayNode filteredChildren = objectMapper.createArrayNode();
                filterLayout((ArrayNode) children, filteredChildren, formRuleState, stepRuleState,
                    formHtmxByTarget, stepHtmxByTarget,
                        readablePointers, readableTargets, writableTargets);
                copy.set("children", filteredChildren);
            }

            targetLayout.add(copy);
        }
    }

    private void applyColumnVisibility(ObjectNode control,
                                       String controlTarget,
                                       Map<String, WorkflowRuleEngine.RuleEffectState> formRuleState,
                                       Map<String, WorkflowRuleEngine.RuleEffectState> stepRuleState) {
        if (control == null) {
            return;
        }

        JsonNode columnsNode = control.path("columns");
        if (!columnsNode.isArray()) {
            return;
        }

        for (JsonNode columnNode : columnsNode) {
            if (!(columnNode instanceof ObjectNode column)) {
                continue;
            }

            String key = safeString(column.path("key").asString());
            if (key.isEmpty() || controlTarget.isEmpty()) {
                continue;
            }

            String columnTarget = controlTarget + ".columns." + key;
            WorkflowRuleEngine.RuleEffectState formState = formRuleState.get(columnTarget);
            WorkflowRuleEngine.RuleEffectState stepState = stepRuleState.get(columnTarget);

            boolean baseVisible = !column.has("visible") || column.path("visible").asBoolean(true);
            boolean formVisible = formState != null && formState.visible() != null ? formState.visible() : baseVisible;
            boolean stepVisible = stepState != null && stepState.visible() != null ? stepState.visible() : true;
            boolean visible = formVisible && stepVisible;

            column.put("visible", visible);
        }
    }

    private Map<String, ObjectNode> buildHtmxAttributesByTarget(ArrayNode apiActions) {
        Map<String, ObjectNode> out = new HashMap<>();
        if (apiActions == null) {
            return out;
        }

        for (JsonNode actionNode : apiActions) {
            if (actionNode == null || !actionNode.isObject()) {
                continue;
            }

            String target = safeString(actionNode.path("target").asString());
            JsonNode htmxNode = actionNode.path("htmx");
            if (target.isEmpty() || !htmxNode.isObject()) {
                continue;
            }

            out.putIfAbsent(target, ((ObjectNode) htmxNode).deepCopy());
        }
        return out;
    }

    private String resolveTarget(ObjectNode control) {
        String stateKey = safeString(control.path("stateKey").asString());
        if (!stateKey.isEmpty()) {
            return stateKey;
        }

        String pointer = safeString(control.path("pointer").asString());
        if (pointer.isEmpty()) {
            return "";
        }
        return pointerToTarget(pointer);
    }

    private String pointerToTarget(String pointer) {
        List<String> tokens = extractPropertyPath(pointer);
        if (tokens.isEmpty()) {
            return "";
        }
        return String.join(".", tokens);
    }

    private EffectiveControlState resolveEffectiveControlState(ObjectNode control,
                                                               String target,
                                                               Map<String, WorkflowRuleEngine.RuleEffectState> formRuleState,
                                                               Map<String, WorkflowRuleEngine.RuleEffectState> stepRuleState) {
        boolean baseVisible = !control.has("visible") || control.path("visible").asBoolean(true);
        boolean baseEnabled = !control.has("enabled") || control.path("enabled").asBoolean(true);
        boolean baseRequired = control.path("required").asBoolean(false);

        WorkflowRuleEngine.RuleEffectState formState = target.isEmpty() ? null : formRuleState.get(target);
        WorkflowRuleEngine.RuleEffectState stepState = target.isEmpty() ? null : stepRuleState.get(target);

        boolean formVisible = formState != null && formState.visible() != null ? formState.visible() : baseVisible;
        boolean stepVisible = stepState != null && stepState.visible() != null ? stepState.visible() : true;
        boolean visible = formVisible && stepVisible;

        boolean formEnabled = formState != null && formState.enabled() != null ? formState.enabled() : baseEnabled;
        boolean stepEnabled = stepState != null && stepState.enabled() != null ? stepState.enabled() : true;
        boolean enabled = formEnabled && stepEnabled;

        boolean formRequired = formState != null && formState.required() != null ? formState.required() : baseRequired;
        boolean stepRequired = stepState != null && stepState.required() != null && stepState.required();
        boolean required = formRequired || stepRequired;

        boolean formReadable = formState != null && formState.readable() != null ? formState.readable() : formVisible;
        boolean stepReadable = stepState != null && stepState.readable() != null ? stepState.readable() : true;
        boolean readable = visible && formReadable && stepReadable;

        boolean formWritable = formState != null && formState.writable() != null ? formState.writable() : formEnabled;
        boolean stepWritable = stepState != null && stepState.writable() != null ? stepState.writable() : true;
        boolean writable = readable && enabled && formWritable && stepWritable;

        boolean sectionWidget = "section".equals(safeString(control.path("widget").asString()));
        boolean collapsible = sectionWidget && control.path("sectionCollapsible").asBoolean(false);
        boolean baseCollapsed = collapsible && !control.path("sectionDefaultExpanded").asBoolean(true);
        if (sectionWidget && control.has("collapsed")) {
            baseCollapsed = control.path("collapsed").asBoolean(baseCollapsed);
        }

        boolean collapsed = false;
        if (sectionWidget) {
            collapsed = baseCollapsed;
            if (formState != null && formState.collapsed() != null) {
                collapsed = formState.collapsed();
            }
            if (stepState != null && stepState.collapsed() != null) {
                collapsed = stepState.collapsed();
            }
            if (!collapsible) {
                collapsed = false;
            }
        }

        return new EffectiveControlState(visible, enabled, required, readable, writable, collapsed);
    }

    private ObjectNode projectReadableData(JsonNode data, Set<String> readablePointers) {
        ObjectNode projected = objectMapper.createObjectNode();
        if (data == null || !data.isObject() || readablePointers.isEmpty()) {
            return projected;
        }

        for (String pointer : readablePointers) {
            List<String> path = extractPropertyPath(pointer);
            if (path.isEmpty()) {
                continue;
            }
            copyObjectPath((ObjectNode) data, projected, path, 0);
        }

        return projected;
    }

    private List<String> extractPropertyPath(String pointer) {
        List<String> properties = new ArrayList<>();
        if (pointer == null || pointer.isBlank()) {
            return properties;
        }

        String[] parts = pointer.split("/");
        for (int i = 0; i < parts.length; i += 1) {
            if ("properties".equals(parts[i]) && i + 1 < parts.length) {
                String property = parts[i + 1];
                if (!property.isBlank()) {
                    properties.add(property);
                }
                i += 1;
            }
        }

        return properties;
    }

    private void copyObjectPath(ObjectNode source,
                                ObjectNode target,
                                List<String> path,
                                int index) {
        if (index >= path.size()) {
            return;
        }

        String key = path.get(index);
        JsonNode sourceValue = source.get(key);
        if (sourceValue == null) {
            return;
        }

        if (index == path.size() - 1 || !sourceValue.isObject()) {
            target.set(key, sourceValue.deepCopy());
            return;
        }

        JsonNode targetValue = target.get(key);
        ObjectNode targetObject;
        if (targetValue != null && targetValue.isObject()) {
            targetObject = (ObjectNode) targetValue;
        } else {
            targetObject = objectMapper.createObjectNode();
            target.set(key, targetObject);
        }

        copyObjectPath((ObjectNode) sourceValue, targetObject, path, index + 1);
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    private static final class EffectiveControlState {
        private final boolean visible;
        private final boolean enabled;
        private final boolean required;
        private final boolean readable;
        private final boolean writable;
        private final boolean collapsed;

        private EffectiveControlState(boolean visible,
                                      boolean enabled,
                                      boolean required,
                                      boolean readable,
                                      boolean writable,
                                      boolean collapsed) {
            this.visible = visible;
            this.enabled = enabled;
            this.required = required;
            this.readable = readable;
            this.writable = writable;
            this.collapsed = collapsed;
        }
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