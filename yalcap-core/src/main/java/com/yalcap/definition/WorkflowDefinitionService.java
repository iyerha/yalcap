package com.yalcap.definition;

import com.yalcap.definition.form.DefinitionFilesystem;
import com.yalcap.definition.form.load.FormLoadDataContext;
import com.yalcap.definition.form.load.FormLoadDataService;
import com.yalcap.definition.form.load.FormLoadDataPhase;
import com.yalcap.asset.AssetStorageService;
import com.yalcap.asset.AssetUploadResult;
import com.yalcap.definition.workflow.WorkflowDefinitionEntity;
import com.yalcap.definition.workflow.WorkflowDefinitionRepository;
import com.yalcap.definition.workflow.WorkflowRuleEngine;
import com.yalcap.definition.workflow.step.StepType;
import com.yalcap.definition.workflow.step.StepTypeRegistry;
import com.yalcap.definition.workflow.step.StepTypeValidationContext;
import com.yalcap.definition.workflow.step.StepTypeValidationErrors;
import com.yalcap.tenant.TenantContext;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import tools.jackson.dataformat.yaml.YAMLFactory;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.List;
import java.io.IOException;
import java.util.regex.Pattern;

@Service
public class WorkflowDefinitionService {

    private static final Set<String> ALLOWED_THEME_PRESETS = Set.of("default", "slate", "sunrise", "custom");
    private static final Set<String> ALLOWED_API_METHODS = Set.of("get", "post", "put", "patch", "delete");
    private static final Set<String> ALLOWED_API_TRIGGERS = Set.of("change", "input", "blur", "submit", "click");
    private static final Set<String> ALLOWED_API_SWAPS = Set.of("innerHTML", "outerHTML", "beforeend", "afterend");
    private static final Set<String> ALLOWED_STEP_FIELDS = Set.of("id", "title", "type", "assignment", "access", "ui", "routing");
    private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$");
    private static final Pattern API_ENDPOINT_PATTERN = Pattern.compile("^/api/[A-Za-z0-9_./\\-?=&:%]*$");
    private static final Pattern API_TARGET_PATTERN = Pattern.compile("^[#.][A-Za-z][A-Za-z0-9_:\\-.]*$");

    private final DefinitionFilesystem definitionFilesystem;
    private final WorkflowDefinitionRepository repository;
    private final StepTypeRegistry stepTypeRegistry;
    private final WorkflowRuleEngine workflowRuleEngine;
    private final FormLoadDataService formLoadDataService;
    private final AssetStorageService assetStorageService;
    private final ObjectMapper yamlMapper;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    public WorkflowDefinitionService(DefinitionFilesystem definitionFilesystem,
                                    WorkflowDefinitionRepository repository,
                                    StepTypeRegistry stepTypeRegistry,
                                    WorkflowRuleEngine workflowRuleEngine,
                                    FormLoadDataService formLoadDataService,
                                    AssetStorageService assetStorageService,
                                    ObjectMapper objectMapper,
                                    ApplicationEventPublisher eventPublisher) {
        this.definitionFilesystem = definitionFilesystem;
        this.repository = repository;
        this.stepTypeRegistry = stepTypeRegistry;
        this.workflowRuleEngine = workflowRuleEngine;
        this.formLoadDataService = formLoadDataService;
        this.assetStorageService = assetStorageService;
        this.objectMapper = objectMapper;
        this.yamlMapper = new ObjectMapper(new YAMLFactory());
        this.eventPublisher = eventPublisher;
    }

    // ============ DESIGN-TIME (Publish) ============
    
    public WorkflowDefinitionEntity publishDefinition(String workflowKey, String jsonDefinition, String createdBy, String changeMessage) throws IOException {
        JsonNode definition = objectMapper.readTree(jsonDefinition);
        validateTheme(definition);
        validateStepDefinitions(definition);
        validateAndNormalizeRuleActions(definition);

        String title = extractTitle(definition);
        if (title.isEmpty()) {
            title = workflowKey;
        }

        ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
        String yamlDefinition = yamlMapper.writeValueAsString(definition);
        definitionFilesystem.writeWorkflowDefinition(workflowKey, yamlDefinition);
        Optional<WorkflowDefinitionEntity> activeDefinition = repository.findActiveByDefinitionKey(workflowKey);
        int nextVersion = activeDefinition.map(entry -> entry.getVersionNumber() + 1).orElse(1);

        activeDefinition.ifPresent(entity -> {
            entity.setActive(false);
            repository.save(entity);
        });
        
        WorkflowDefinitionEntity published = new WorkflowDefinitionEntity(
                null,
                workflowKey,
                title,
                definition,
                nextVersion,
                true,
                TenantContext.getTenantId().orElse(UUID.fromString("00000000-0000-0000-0000-000000000000")),
                createdBy,
                changeMessage);
        published = repository.save(published);
        eventPublisher.publishEvent(new WorkflowDefinitionPublishedEvent(
            published.getId() == null ? null : published.getId().toString(),
            published.getDefinitionKey(),
            published.getVersionNumber(),
            published.getTenantId() == null ? null : published.getTenantId().toString(),
            published.getDefinition(),
            published.getCreatedBy(),
            published.getChangeMessage()));
        return published;
    }

    // ============ RUNTIME (Read from DB) ============
    
    public Optional<WorkflowDefinitionEntity> getActiveDefinition(String definitionKey) {
        return repository.findActiveByDefinitionKey(definitionKey);
    }

    public List<WorkflowDefinitionEntity> getDefinitionHistory(String definitionKey) {
        return repository.findByDefinitionKeyOrderByVersionNumberDesc(definitionKey);
    }

    public Optional<ObjectNode> resolveDefinitionView(String definitionKey, ResolveDefinitionViewRequest request) {
        return repository.findActiveByDefinitionKey(definitionKey)
                .map(entity -> resolveDefinitionView(entity.getDefinition(), request));
    }

    private ObjectNode resolveDefinitionView(JsonNode definition, ResolveDefinitionViewRequest request) {
        if (definition == null || definition.isNull() || !definition.isObject()) {
            throw new IllegalArgumentException("Workflow definition payload must be a JSON object");
        }

        ObjectNode definitionCopy = ((ObjectNode) definition).deepCopy();
        ObjectNode inputData = asObjectNode(request != null ? request.getData() : null);
        ObjectNode hydratedData = formLoadDataService.load(new FormLoadDataContext(
                safeString(request != null ? request.getDefinitionKey() : ""),
                request != null ? safeString(request.getStepId()) : "",
                request != null ? safeString(request.getUserId()) : "",
                request != null && request.getUserGroups() != null ? request.getUserGroups() : List.of(),
                null,
                inputData.deepCopy(),
                FormLoadDataPhase.FORM_OPEN));
        ObjectNode mergedData = mergeData(inputData, hydratedData);
        ObjectNode context = buildRuleContext(definitionCopy, request, mergedData);
        boolean initializationPhase = isInitializationPhase(request);

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
                filterLayout((ArrayNode) layout, filteredLayout, formRuleState, stepRuleState,
                        formHtmxByTarget, stepHtmxByTarget, readablePointers, readableTargets, writableTargets);
                controlSchema.set("layout", filteredLayout);
            }
        }

        ObjectNode projectedData = projectReadableData(mergedData, readablePointers);

        ObjectNode response = objectMapper.createObjectNode();
        response.put("definitionKey", request != null ? safeString(request.getDefinitionKey()) : "");
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

    // ============ VALIDATION (shared) ============

    private JsonNode parseYamlToJson(String yaml) throws IOException {
        return yamlMapper.readTree(yaml);
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
            validateNormalizedStepShape(stepNode, stepPath);

            StepType stepType = stepTypeRegistry.find(stepTypeKey)
                    .orElseThrow(() -> new IllegalArgumentException(stepPath + ".type is not registered: " + stepTypeKey));

            StepTypeValidationErrors errors = new StepTypeValidationErrors();
            stepType.validate(new StepTypeValidationContext(stepNode, stepPath, errors));
            if (errors.hasErrors()) {
                throw new IllegalArgumentException(String.join("; ", errors.all()));
            }
        }
    }

    private void validateNormalizedStepShape(JsonNode stepNode, String stepPath) {
        Iterator<String> fieldNames = stepNode.propertyNames().iterator();
        while (fieldNames.hasNext()) {
            String field = fieldNames.next();
            if (!ALLOWED_STEP_FIELDS.contains(field)) {
                throw new IllegalArgumentException(stepPath + "." + field + " is not allowed; allowed: " + ALLOWED_STEP_FIELDS);
            }
        }

        requireNonBlankString(stepNode, "id", stepPath + ".id");
        requireNonBlankString(stepNode, "title", stepPath + ".title");

        JsonNode assignment = requireObjectField(stepNode, "assignment", stepPath + ".assignment");
        requireNonBlankString(assignment, "kind", stepPath + ".assignment.kind");
        requireNonBlankString(assignment, "value", stepPath + ".assignment.value");

        JsonNode access = requireObjectField(stepNode, "access", stepPath + ".access");
        requireStringArray(access, "groups", stepPath + ".access.groups");
        requireStringArray(access, "users", stepPath + ".access.users");

        JsonNode ui = requireObjectField(stepNode, "ui", stepPath + ".ui");
        requireNonBlankString(ui, "pointer", stepPath + ".ui.pointer");

        JsonNode routing = requireObjectField(stepNode, "routing", stepPath + ".routing");
        JsonNode transitions = requireObjectField(routing, "transitions", stepPath + ".routing.transitions");
        Iterator<String> events = transitions.propertyNames().iterator();
        while (events.hasNext()) {
            String event = events.next();
            if (safeString(event).isEmpty()) {
                throw new IllegalArgumentException(stepPath + ".routing.transitions contains an empty event key");
            }
            JsonNode targetNode = transitions.get(event);
            if (targetNode == null || !targetNode.isString() || safeString(targetNode.asString()).isEmpty()) {
                throw new IllegalArgumentException(stepPath + ".routing.transitions." + event + " must be non-empty string");
            }
        }
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
            JsonNode rule = rulesNode.get(i);
            if (rule == null || !rule.isObject()) {
                continue;
            }

            JsonNode actions = ((ObjectNode) rule).path("actions");
            if (!actions.isArray()) {
                continue;
            }

            for (int j = 0; j < actions.size(); j += 1) {
                if (isApiAction(actions.get(j))) {
                    normalizeApiAction((ObjectNode) actions.get(j), "rules[" + i + "].actions[" + j + "]", true);
                }
            }
        }
    }

    private void validateTheme(JsonNode definition) {
        JsonNode controlSchema = definition.path("controlSchema");
        if (controlSchema.isMissingNode() || controlSchema.isNull()) {
            return;
        }

        JsonNode theme = controlSchema.path("theme");
        if (theme.isMissingNode() || theme.isNull()) {
            return;
        }

        String preset = theme.path("preset").asString("").trim();
        if (preset.isEmpty()) {
            throw new IllegalArgumentException("controlSchema.theme.preset is required");
        }
        if (!ALLOWED_THEME_PRESETS.contains(preset)) {
            throw new IllegalArgumentException("Unsupported theme preset: " + preset);
        }
        if ("custom".equals(preset)) {
            JsonNode custom = theme.get("custom");
            if (custom == null || !custom.isObject()) {
                throw new IllegalArgumentException("controlSchema.theme.custom required for preset 'custom'");
            }
            for (String color : new String[]{"accent", "bg", "surface", "text"}) {
                validateHexColor(custom, color);
            }
        }
    }

    private String extractTitle(JsonNode definition) {
        if (definition == null || !definition.isObject()) {
            return "";
        }
        JsonNode titleNode = definition.path("title");
        if (titleNode.isString()) {
            return titleNode.asString("").trim();
        }
        return "";
    }

    // ============ RUNTIME HELPERS ============

    private ArrayNode evaluateApiActions(JsonNode rulesNode, String scope, ObjectNode context, boolean initializationPhase) {
        ArrayNode out = objectMapper.createArrayNode();
        if (!rulesNode.isArray()) {
            return out;
        }

        Map<String, ObjectNode> deduped = new LinkedHashMap<>();
        for (JsonNode rule : rulesNode) {
            if (rule == null || !rule.isObject()) {
                continue;
            }
            if (!scope.equals(safeString(rule.path("scope").asString()))) {
                continue;
            }
            if (!workflowRuleEngine.shouldEvaluateRuleForPhase(rule, initializationPhase)) {
                continue;
            }
            if (!workflowRuleEngine.evaluateCondition(rule.path("when"), context)) {
                continue;
            }

            JsonNode actions = rule.path("actions");
            if (actions.isArray()) {
                for (int j = 0; j < actions.size(); j += 1) {
                    JsonNode actionNode = actions.get(j);
                    if (isApiAction(actionNode)) {
                        try {
                            ObjectNode normalized = normalizeApiActionForRuntime((ObjectNode) actionNode, "rules.actions[" + j + "]", false);
                            String key = safeString(normalized.path("endpoint").asString()) + "|" +
                                    safeString(normalized.path("method").asString()) + "|" +
                                    safeString(normalized.path("trigger").asString()) + "|" +
                                    safeString(normalized.path("target").asString());
                            deduped.putIfAbsent(key, normalized);
                        } catch (Exception ex) {
                            // skip malformed actions
                        }
                    }
                }
            }
        }
        deduped.values().forEach(out::add);
        return out;
    }

    private boolean isApiAction(JsonNode action) {
        if (action == null || !action.isObject()) {
            return false;
        }
        return "api".equals(safeString(action.path("kind").asString()).toLowerCase()) ||
               !safeString(action.path("endpoint").asString()).isEmpty();
    }

    private void normalizeApiAction(ObjectNode action, String path, boolean strict) {
        String endpoint = safeString(action.path("endpoint").asString());
        if (endpoint.isEmpty() && strict) {
            throw new IllegalArgumentException(path + ".endpoint required");
        }
        if (!endpoint.isEmpty() && !API_ENDPOINT_PATTERN.matcher(endpoint).matches()) {
            throw new IllegalArgumentException(path + ".endpoint invalid format");
        }

        String method = safeString(action.path("method").asString()).toLowerCase();
        if (method.isEmpty()) method = "get";
        if (!ALLOWED_API_METHODS.contains(method)) {
            throw new IllegalArgumentException(path + ".method must be one of " + ALLOWED_API_METHODS);
        }

        String trigger = safeString(action.path("trigger").asString()).toLowerCase();
        if (trigger.isEmpty()) trigger = "change";
        if (!ALLOWED_API_TRIGGERS.contains(trigger)) {
            throw new IllegalArgumentException(path + ".trigger must be one of " + ALLOWED_API_TRIGGERS);
        }

        String swap = safeString(action.path("swap").asString());
        if (swap.isEmpty()) swap = "innerHTML";
        if (!ALLOWED_API_SWAPS.contains(swap)) {
            throw new IllegalArgumentException(path + ".swap must be one of " + ALLOWED_API_SWAPS);
        }
    }

    private ObjectNode normalizeApiActionForRuntime(ObjectNode actionNode, String contextPath, boolean strict) {
        String endpoint = safeString(actionNode.path("endpoint").asString());
        if (endpoint.isEmpty() && strict) {
            throw new IllegalArgumentException(contextPath + ".endpoint required");
        }
        if (!endpoint.isEmpty() && !API_ENDPOINT_PATTERN.matcher(endpoint).matches()) {
            throw new IllegalArgumentException(contextPath + ".endpoint invalid format");
        }

        String method = safeString(actionNode.path("method").asString()).toLowerCase();
        if (method.isEmpty()) method = "get";
        if (!ALLOWED_API_METHODS.contains(method)) {
            throw new IllegalArgumentException(contextPath + ".method invalid");
        }

        String trigger = safeString(actionNode.path("trigger").asString()).toLowerCase();
        if (trigger.isEmpty()) trigger = "change";
        if (!ALLOWED_API_TRIGGERS.contains(trigger)) {
            throw new IllegalArgumentException(contextPath + ".trigger invalid");
        }

        String target = safeString(actionNode.path("target").asString());
        if (!target.isEmpty() && !API_TARGET_PATTERN.matcher(target).matches()) {
            throw new IllegalArgumentException(contextPath + ".target invalid selector");
        }

        String swap = safeString(actionNode.path("swap").asString());
        if (swap.isEmpty()) swap = "innerHTML";
        if (!ALLOWED_API_SWAPS.contains(swap)) {
            throw new IllegalArgumentException(contextPath + ".swap invalid");
        }

        ObjectNode normalized = objectMapper.createObjectNode();
        normalized.put("kind", "api");
        normalized.put("endpoint", endpoint);
        normalized.put("method", method);
        normalized.put("trigger", trigger);
        normalized.put("target", target);
        normalized.put("swap", swap);
        normalized.set("htmx", buildServerHtmxAttributes(endpoint, method, trigger, target, swap));
        return normalized;
    }

    private ObjectNode buildServerHtmxAttributes(String endpoint, String method, String trigger, String target, String swap) {
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
        return attrs;
    }

    private void validateHexColor(JsonNode obj, String key) {
        JsonNode value = obj.get(key);
        if (value == null || !value.isString()) {
            throw new IllegalArgumentException("theme.custom." + key + " must be hex color");
        }
        String color = value.asString().trim();
        if (!HEX_COLOR_PATTERN.matcher(color).matches()) {
            throw new IllegalArgumentException("Invalid hex color: " + color);
        }
    }

    private JsonNode requireObjectField(JsonNode parent, String field, String path) {
        JsonNode node = parent.path(field);
        if (!parent.has(field) || !node.isObject()) {
            throw new IllegalArgumentException(path + " required and must be object");
        }
        return node;
    }

    private void requireNonBlankString(JsonNode parent, String field, String path) {
        JsonNode node = parent.path(field);
        if (!parent.has(field) || !node.isString() || safeString(node.asString()).isEmpty()) {
            throw new IllegalArgumentException(path + " required non-empty string");
        }
    }

    private void requireStringArray(JsonNode parent, String field, String path) {
        JsonNode node = parent.path(field);
        if (!parent.has(field) || !node.isArray()) {
            throw new IllegalArgumentException(path + " required array");
        }
        for (JsonNode value : node) {
            if (value == null || !value.isString() || safeString(value.asString()).isEmpty()) {
                throw new IllegalArgumentException(path + " contains non-string or empty value");
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
            throw new IllegalArgumentException("Use either embedded form or formRef, not both");
        }

        if (hasFormRef) {
            final String refFormKey = formRef.path("formKey").asString("").trim();
            if (refFormKey.isEmpty()) {
                throw new IllegalArgumentException("formRef.formKey is required");
            }
            ObjectNode snapshot = objectMapper.createObjectNode();
            snapshot.put("formKey", refFormKey);
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
                        throw new IllegalArgumentException(contextPath + "[" + i + "].assetRef.version must be >= 1");
                    }
                    requestedVersion = versionNode.asInt();
                }
                final Integer resolvedRequestedVersion = requestedVersion;

                AssetUploadResult resolvedAsset = assetStorageService.getAsset(assetKey, resolvedRequestedVersion)
                        .orElseThrow(() -> new IllegalArgumentException("Asset not found: " + assetKey));

                ObjectNode assetSnapshot = objectMapper.createObjectNode();
                assetSnapshot.put("assetKey", assetKey);
                assetSnapshot.put("version", resolvedAsset.version());
                if (resolvedAsset.sha256() != null) {
                    assetSnapshot.put("sha256", resolvedAsset.sha256());
                }
                controlObject.set("assetSnapshot", assetSnapshot);
            }

            JsonNode children = control.path("children");
            if (children.isArray()) {
                enrichImageControlsInLayout((ArrayNode) children, contextPath + "[" + i + "].children");
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
            if ("table".equals(widget)) {
                JsonNode columns = control.path("columns");
                if (!columns.isArray() || columns.size() == 0) {
                    throw new IllegalArgumentException(contextPath + "[" + i + "].columns required for table");
                }
            }

            JsonNode children = control.path("children");
            if (children.isArray()) {
                validateRuntimeControlRulesInLayout((ArrayNode) children, contextPath + "[" + i + "].children");
            }
        }
    }

    private ObjectNode resolveControlSchema(ObjectNode definition) {
        JsonNode controlSchema = definition.path("controlSchema");
        if (controlSchema.isObject()) {
            return (ObjectNode) controlSchema;
        }
        JsonNode formSnapshot = definition.path("formSnapshot").path("controlSchema");
        if (formSnapshot.isObject()) {
            definition.set("controlSchema", formSnapshot.deepCopy());
            return (ObjectNode) definition.path("controlSchema");
        }
        return null;
    }

    private void filterLayout(ArrayNode source, ArrayNode target, Map<String, WorkflowRuleEngine.RuleEffectState> formRuleState,
                             Map<String, WorkflowRuleEngine.RuleEffectState> stepRuleState, Map<String, ObjectNode> formHtmx,
                             Map<String, ObjectNode> stepHtmx, Set<String> readablePointers, ArrayNode readableTargets, ArrayNode writableTargets) {
        for (JsonNode node : source) {
            if (!node.isObject()) continue;
            ObjectNode control = (ObjectNode) node;
            String controlTarget = resolveTarget(control);
            Map<String, WorkflowRuleEngine.RuleEffectState> combined = new HashMap<>(formRuleState);
            combined.putAll(stepRuleState);
            
            ObjectNode copy = control.deepCopy();
            target.add(copy);
        }
    }

    private String resolveTarget(ObjectNode control) {
        String stateKey = safeString(control.path("stateKey").asString());
        if (!stateKey.isEmpty()) {
            return stateKey;
        }
        String pointer = safeString(control.path("pointer").asString());
        return pointer.isEmpty() ? "" : pointerToTarget(pointer);
    }

    private String pointerToTarget(String pointer) {
        List<String> tokens = new ArrayList<>();
        String[] parts = pointer.split("/");
        for (int i = 0; i < parts.length - 1; i++) {
            if ("properties".equals(parts[i])) {
                tokens.add(parts[i + 1]);
                i++;
            }
        }
        return String.join(".", tokens);
    }

    private ObjectNode projectReadableData(JsonNode data, Set<String> pointers) {
        ObjectNode projected = objectMapper.createObjectNode();
        if (data == null || !data.isObject() || pointers.isEmpty()) {
            return projected;
        }
        for (String pointer : pointers) {
            copyPath((ObjectNode) data, projected, extractPath(pointer), 0);
        }
        return projected;
    }

    private List<String> extractPath(String pointer) {
        List<String> path = new ArrayList<>();
        String[] parts = pointer.split("/");
        for (int i = 0; i < parts.length - 1; i++) {
            if ("properties".equals(parts[i]) && i + 1 < parts.length) {
                path.add(parts[i + 1]);
                i++;
            }
        }
        return path;
    }

    private void copyPath(ObjectNode source, ObjectNode target, List<String> path, int index) {
        if (index >= path.size()) return;
        String key = path.get(index);
        JsonNode value = source.get(key);
        if (value == null) return;
        if (index == path.size() - 1) {
            target.set(key, value.deepCopy());
        } else if (value.isObject()) {
            ObjectNode nested = target.has(key) && target.get(key).isObject() ? 
                    (ObjectNode) target.get(key) : objectMapper.createObjectNode();
            target.set(key, nested);
            copyPath((ObjectNode) value, nested, path, index + 1);
        }
    }

    private Map<String, ObjectNode> buildHtmxAttributesByTarget(ArrayNode actions) {
        Map<String, ObjectNode> map = new HashMap<>();
        if (actions != null) {
            for (JsonNode action : actions) {
                String target = safeString(action.path("target").asString());
                JsonNode htmx = action.path("htmx");
                if (!target.isEmpty() && htmx.isObject()) {
                    map.putIfAbsent(target, (ObjectNode) htmx.deepCopy());
                }
            }
        }
        return map;
    }

    private ObjectNode buildRuleContext(ObjectNode definition, ResolveDefinitionViewRequest request, ObjectNode data) {
        ObjectNode context = objectMapper.createObjectNode();
        ObjectNode user = context.putObject("user");
        if (request != null) {
            user.put("id", safeString(request.getUserId()));
            ArrayNode groups = user.putArray("groups");
            if (request.getUserGroups() != null) {
                request.getUserGroups().forEach(groups::add);
            }
        }
        ObjectNode workflow = context.putObject("workflow");
        workflow.put("definitionKey", request != null ? safeString(request.getDefinitionKey()) : "");
        context.set("data", data.deepCopy());
        return context;
    }

    private ObjectNode mergeData(ObjectNode base, ObjectNode hydrated) {
        ObjectNode merged = base == null ? objectMapper.createObjectNode() : base.deepCopy();
        if (hydrated != null) {
            merged.setAll(hydrated);
        }
        return merged;
    }

    private ObjectNode asObjectNode(JsonNode data) {
        return data != null && data.isObject() ? ((ObjectNode) data).deepCopy() : objectMapper.createObjectNode();
    }

    private boolean isInitializationPhase(ResolveDefinitionViewRequest request) {
        return request != null && Boolean.TRUE.equals(request.getFormInitialization());
    }

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    // ============ REQUEST DTO ============

    public static class ResolveDefinitionViewRequest {
        private String definitionKey;
        private String stepId;
        private String userId;
        private List<String> userGroups;
        private JsonNode data;
        private Boolean formInitialization;

        public String getDefinitionKey() { return definitionKey; }
        public void setDefinitionKey(String definitionKey) { this.definitionKey = definitionKey; }
        public String getStepId() { return stepId; }
        public void setStepId(String stepId) { this.stepId = stepId; }
        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }
        public List<String> getUserGroups() { return userGroups; }
        public void setUserGroups(List<String> userGroups) { this.userGroups = userGroups; }
        public JsonNode getData() { return data; }
        public void setData(JsonNode data) { this.data = data; }
        public Boolean getFormInitialization() { return formInitialization; }
        public void setFormInitialization(Boolean formInitialization) { this.formInitialization = formInitialization; }
    }
}