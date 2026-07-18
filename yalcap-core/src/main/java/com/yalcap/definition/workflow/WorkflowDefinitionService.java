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
import java.util.Map;
import java.util.Optional;
import java.util.HashSet;
import java.util.HashMap;
import java.util.Set;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class WorkflowDefinitionService {

    private static final Set<String> ALLOWED_THEME_PRESETS = Set.of("default", "slate", "sunrise", "custom");
        private static final Set<String> JSON_LOGIC_OPERATORS = Set.of(
            "var", "==", "!=", ">", ">=", "<", "<=", "in", "and", "or", "!", "matches"
        );
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

    public Optional<ObjectNode> resolveDefinitionView(String definitionKey, ResolveDefinitionViewRequest request) {
        return repository.findByDefinitionKeyAndActiveTrue(definitionKey)
                .map(entity -> resolveDefinitionView(entity, request));
    }

    public static class ResolveDefinitionViewRequest {
        private String stepId;
        private String userId;
        private List<String> userGroups;
        private JsonNode data;

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

        validateRuntimeControlRulesInLayout((ArrayNode) layout, "formSnapshot.controlSchema.layout");
        enrichImageControlsInLayout((ArrayNode) layout, "formSnapshot.controlSchema.layout");

        return snapshot;
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
        JsonNode inputData = request != null ? request.getData() : null;
        ObjectNode context = buildRuleContext(definitionEntity, request, inputData);

        Map<String, RuleEffectState> formRuleState = evaluateRules(definitionCopy.path("rules"), "form", context);
        Map<String, RuleEffectState> stepRuleState = evaluateRules(definitionCopy.path("rules"), "step", context);

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
                        readablePointers,
                        readableTargets,
                        writableTargets
                );
                controlSchema.set("layout", filteredLayout);
            }
        }

        ObjectNode projectedData = projectReadableData(inputData, readablePointers);

        ObjectNode response = objectMapper.createObjectNode();
        response.put("definitionKey", definitionEntity.getDefinitionKey());
        response.put("versionNumber", definitionEntity.getVersionNumber() == null ? 1 : definitionEntity.getVersionNumber());
        response.put("stepId", request != null ? safeString(request.getStepId()) : "");
        response.set("definition", definitionCopy);
        response.set("data", projectedData);

        ObjectNode permissions = response.putObject("permissions");
        permissions.set("readable", readableTargets);
        permissions.set("writable", writableTargets);

        return response;
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

    private Map<String, RuleEffectState> evaluateRules(JsonNode rulesNode,
                                                       String scope,
                                                       ObjectNode context) {
        Map<String, RuleEffectState> targetState = new HashMap<>();
        if (!rulesNode.isArray()) {
            return targetState;
        }

        for (JsonNode rule : rulesNode) {
            if (rule == null || !rule.isObject()) {
                continue;
            }
            String ruleScope = safeString(rule.path("scope").asString());
            if (!scope.equals(ruleScope)) {
                continue;
            }

            JsonNode when = rule.path("when");
            if (!evaluateCondition(when, context)) {
                continue;
            }

            JsonNode actions = rule.path("actions");
            if (actions.isArray() && actions.size() > 0) {
                for (JsonNode action : actions) {
                    applyRuleAction(targetState, action);
                }
                continue;
            }

            applyRuleAction(targetState, rule);
        }

        return targetState;
    }

    private void applyRuleAction(Map<String, RuleEffectState> targetState, JsonNode actionNode) {
        if (actionNode == null || !actionNode.isObject()) {
            return;
        }

        String target = safeString(actionNode.path("target").asString());
        String effect = safeString(actionNode.path("effect").asString());
        if (target.isEmpty() || effect.isEmpty()) {
            return;
        }

        boolean value = actionNode.path("value").asBoolean(false);
        RuleEffectState state = targetState.computeIfAbsent(target, ignored -> new RuleEffectState());
        state.apply(effect, value);
    }

    private boolean evaluateCondition(JsonNode condition, ObjectNode context) {
        if (condition == null || condition.isNull() || condition.isMissingNode()) {
            return true;
        }

        if (isJsonLogicCondition(condition)) {
            JsonNode evaluated = evaluateJsonLogic(condition, context);
            return isTruthy(evaluated);
        }

        JsonNode all = condition.get("all");
        if (all != null && all.isArray()) {
            for (JsonNode child : all) {
                if (!evaluateCondition(child, context)) {
                    return false;
                }
            }
            return true;
        }

        JsonNode any = condition.get("any");
        if (any != null && any.isArray()) {
            for (JsonNode child : any) {
                if (evaluateCondition(child, context)) {
                    return true;
                }
            }
            return false;
        }

        JsonNode not = condition.get("not");
        if (not != null && !not.isNull()) {
            return !evaluateCondition(not, context);
        }

        return evaluateLeafCondition(condition, context);
    }

    private boolean isJsonLogicCondition(JsonNode condition) {
        if (condition == null || !condition.isObject() || condition.size() != 1) {
            return false;
        }
        return resolveJsonLogicOperator(condition) != null;
    }

    private String resolveJsonLogicOperator(JsonNode expression) {
        if (expression == null || !expression.isObject() || expression.size() != 1) {
            return null;
        }
        for (String operator : JSON_LOGIC_OPERATORS) {
            if (expression.has(operator)) {
                return operator;
            }
        }
        return null;
    }

    private JsonNode evaluateJsonLogic(JsonNode expression, ObjectNode context) {
        if (expression == null || expression.isNull() || expression.isMissingNode()) {
            return null;
        }

        if (!expression.isObject() || expression.size() != 1) {
            return expression;
        }

        String op = resolveJsonLogicOperator(expression);
        if (op == null) {
            return expression;
        }
        JsonNode rawArgs = expression.get(op);
        List<JsonNode> args = normalizeJsonLogicArgs(rawArgs);

        switch (op) {
            case "var":
                return evaluateJsonLogicVar(rawArgs, context);
            case "==":
                return objectMapper.getNodeFactory().booleanNode(
                        compareEq(evaluateJsonLogicArg(args, 0, context), evaluateJsonLogicArg(args, 1, context))
                );
            case "!=":
                return objectMapper.getNodeFactory().booleanNode(
                        !compareEq(evaluateJsonLogicArg(args, 0, context), evaluateJsonLogicArg(args, 1, context))
                );
            case ">":
                return objectMapper.getNodeFactory().booleanNode(
                        compareNumeric(evaluateJsonLogicArg(args, 0, context), evaluateJsonLogicArg(args, 1, context), 1)
                );
            case ">=":
                return objectMapper.getNodeFactory().booleanNode(
                        compareNumeric(evaluateJsonLogicArg(args, 0, context), evaluateJsonLogicArg(args, 1, context), 0, 1)
                );
            case "<":
                return objectMapper.getNodeFactory().booleanNode(
                        compareNumeric(evaluateJsonLogicArg(args, 0, context), evaluateJsonLogicArg(args, 1, context), -1)
                );
            case "<=":
                return objectMapper.getNodeFactory().booleanNode(
                        compareNumeric(evaluateJsonLogicArg(args, 0, context), evaluateJsonLogicArg(args, 1, context), 0, -1)
                );
            case "in":
                return objectMapper.getNodeFactory().booleanNode(
                        jsonLogicIn(evaluateJsonLogicArg(args, 0, context), evaluateJsonLogicArg(args, 1, context))
                );
            case "and":
                return objectMapper.getNodeFactory().booleanNode(jsonLogicAnd(args, context));
            case "or":
                return objectMapper.getNodeFactory().booleanNode(jsonLogicOr(args, context));
            case "!":
                return objectMapper.getNodeFactory().booleanNode(!isTruthy(evaluateJsonLogicArg(args, 0, context)));
            case "matches":
                return objectMapper.getNodeFactory().booleanNode(jsonLogicMatches(args, context));
            default:
                return expression;
        }
    }

    private List<JsonNode> normalizeJsonLogicArgs(JsonNode rawArgs) {
        List<JsonNode> args = new ArrayList<>();
        if (rawArgs == null || rawArgs.isNull() || rawArgs.isMissingNode()) {
            return args;
        }
        if (rawArgs.isArray()) {
            rawArgs.forEach(args::add);
            return args;
        }
        args.add(rawArgs);
        return args;
    }

    private JsonNode evaluateJsonLogicVar(JsonNode rawArgs, ObjectNode context) {
        if (rawArgs == null || rawArgs.isNull() || rawArgs.isMissingNode()) {
            return null;
        }

        if (rawArgs.isString()) {
            return resolveFactValue(context, rawArgs.asString());
        }

        if (rawArgs.isArray() && rawArgs.size() > 0) {
            JsonNode keyNode = rawArgs.get(0);
            JsonNode defaultValue = rawArgs.size() > 1 ? rawArgs.get(1) : null;
            if (keyNode != null && keyNode.isString()) {
                JsonNode resolved = resolveFactValue(context, keyNode.asString());
                if (resolved != null) {
                    return resolved;
                }
            }
            return defaultValue;
        }

        return null;
    }

    private JsonNode evaluateJsonLogicArg(List<JsonNode> args, int index, ObjectNode context) {
        if (index < 0 || index >= args.size()) {
            return null;
        }
        return evaluateJsonLogic(args.get(index), context);
    }

    private boolean jsonLogicIn(JsonNode left, JsonNode right) {
        if (right == null || right.isNull() || right.isMissingNode()) {
            return false;
        }

        if (right.isArray()) {
            return containsNode(right, left);
        }

        if (left != null && left.isArray()) {
            for (JsonNode item : left) {
                if (compareEq(item, right)) {
                    return true;
                }
            }
            return false;
        }

        if (left != null && left.isString() && right.isString()) {
            return right.asString().contains(left.asString());
        }

        return compareEq(left, right);
    }

    private boolean jsonLogicAnd(List<JsonNode> args, ObjectNode context) {
        if (args.isEmpty()) {
            return false;
        }
        for (JsonNode arg : args) {
            if (!isTruthy(evaluateJsonLogic(arg, context))) {
                return false;
            }
        }
        return true;
    }

    private boolean jsonLogicOr(List<JsonNode> args, ObjectNode context) {
        for (JsonNode arg : args) {
            if (isTruthy(evaluateJsonLogic(arg, context))) {
                return true;
            }
        }
        return false;
    }

    private boolean jsonLogicMatches(List<JsonNode> args, ObjectNode context) {
        JsonNode valueNode = evaluateJsonLogicArg(args, 0, context);
        JsonNode patternNode = evaluateJsonLogicArg(args, 1, context);
        if (valueNode == null || patternNode == null || !valueNode.isString() || !patternNode.isString()) {
            return false;
        }
        String pattern = safeString(patternNode.asString());
        if (pattern.isEmpty()) {
            return false;
        }
        return Pattern.compile(pattern).matcher(valueNode.asString()).find();
    }

    private boolean isTruthy(JsonNode value) {
        if (value == null || value.isNull() || value.isMissingNode()) {
            return false;
        }
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        if (value.isNumber()) {
            return Double.compare(value.asDouble(), 0d) != 0;
        }
        if (value.isString()) {
            return !value.asString().isEmpty();
        }
        if (value.isArray()) {
            return value.size() > 0;
        }
        return true;
    }

    private boolean evaluateLeafCondition(JsonNode condition, ObjectNode context) {
        String fact = safeString(condition.path("fact").asString());
        String op = safeString(condition.path("op").asString());
        if (fact.isEmpty() || op.isEmpty()) {
            return false;
        }

        JsonNode factValue = resolveFactValue(context, fact);
        switch (op) {
            case "eq":
                return compareEq(factValue, condition.get("value"));
            case "ne":
                return !compareEq(factValue, condition.get("value"));
            case "in":
                return compareIn(factValue, condition.path("values"), true);
            case "notIn":
                return compareIn(factValue, condition.path("values"), false);
            case "gt":
                return compareNumeric(factValue, condition.get("value"), 1);
            case "gte":
                return compareNumeric(factValue, condition.get("value"), 0, 1);
            case "lt":
                return compareNumeric(factValue, condition.get("value"), -1);
            case "lte":
                return compareNumeric(factValue, condition.get("value"), 0, -1);
            case "exists":
                return factValue != null && !factValue.isNull() && !factValue.isMissingNode();
            case "matches":
                if (factValue == null || !factValue.isString()) {
                    return false;
                }
                String pattern = safeString(condition.path("pattern").asString());
                if (pattern.isEmpty()) {
                    return false;
                }
                return Pattern.compile(pattern).matcher(factValue.asString()).find();
            default:
                return false;
        }
    }

    private boolean compareEq(JsonNode left, JsonNode right) {
        if (left == null || left.isNull() || left.isMissingNode()) {
            return right == null || right.isNull() || right.isMissingNode();
        }
        if (right == null || right.isNull() || right.isMissingNode()) {
            return false;
        }
        if (left.isNumber() && right.isNumber()) {
            return Double.compare(left.asDouble(), right.asDouble()) == 0;
        }
        if (left.isBoolean() && right.isBoolean()) {
            return left.asBoolean() == right.asBoolean();
        }
        return left.asString().equals(right.asString());
    }

    private boolean compareIn(JsonNode factValue, JsonNode values, boolean positiveCheck) {
        if (values == null || !values.isArray()) {
            return !positiveCheck;
        }

        boolean contains;
        if (factValue != null && factValue.isArray()) {
            contains = false;
            for (JsonNode item : factValue) {
                if (containsNode(values, item)) {
                    contains = true;
                    break;
                }
            }
        } else {
            contains = containsNode(values, factValue);
        }

        return positiveCheck ? contains : !contains;
    }

    private boolean containsNode(JsonNode values, JsonNode candidate) {
        for (JsonNode value : values) {
            if (compareEq(candidate, value)) {
                return true;
            }
        }
        return false;
    }

    private boolean compareNumeric(JsonNode left, JsonNode right, int... allowedSigns) {
        if (left == null || right == null || !left.isNumber() || !right.isNumber()) {
            return false;
        }
        int sign = Double.compare(left.asDouble(), right.asDouble());
        for (int allowed : allowedSigns) {
            if (sign == allowed) {
                return true;
            }
        }
        return false;
    }

    private JsonNode resolveFactValue(ObjectNode context, String factPath) {
        JsonNode current = context;
        String[] segments = factPath.split("\\.");
        for (String segment : segments) {
            if (segment == null || segment.isBlank()) {
                continue;
            }
            if (current == null || !current.isObject()) {
                return null;
            }
            current = current.get(segment);
            if (current == null) {
                return null;
            }
        }
        return current;
    }

    private void filterLayout(ArrayNode sourceLayout,
                              ArrayNode targetLayout,
                              Map<String, RuleEffectState> formRuleState,
                              Map<String, RuleEffectState> stepRuleState,
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
                        readablePointers, readableTargets, writableTargets);
                copy.set("children", filteredChildren);
            }

            targetLayout.add(copy);
        }
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
                                                               Map<String, RuleEffectState> formRuleState,
                                                               Map<String, RuleEffectState> stepRuleState) {
        boolean baseVisible = !control.has("visible") || control.path("visible").asBoolean(true);
        boolean baseEnabled = !control.has("enabled") || control.path("enabled").asBoolean(true);
        boolean baseRequired = control.path("required").asBoolean(false);

        RuleEffectState formState = target.isEmpty() ? null : formRuleState.get(target);
        RuleEffectState stepState = target.isEmpty() ? null : stepRuleState.get(target);

        boolean formVisible = formState != null && formState.visible != null ? formState.visible : baseVisible;
        boolean stepVisible = stepState != null && stepState.visible != null ? stepState.visible : true;
        boolean visible = formVisible && stepVisible;

        boolean formEnabled = formState != null && formState.enabled != null ? formState.enabled : baseEnabled;
        boolean stepEnabled = stepState != null && stepState.enabled != null ? stepState.enabled : true;
        boolean enabled = formEnabled && stepEnabled;

        boolean formRequired = formState != null && formState.required != null ? formState.required : baseRequired;
        boolean stepRequired = stepState != null && stepState.required != null && stepState.required;
        boolean required = formRequired || stepRequired;

        boolean formReadable = formState != null && formState.readable != null ? formState.readable : formVisible;
        boolean stepReadable = stepState != null && stepState.readable != null ? stepState.readable : true;
        boolean readable = visible && formReadable && stepReadable;

        boolean formWritable = formState != null && formState.writable != null ? formState.writable : formEnabled;
        boolean stepWritable = stepState != null && stepState.writable != null ? stepState.writable : true;
        boolean writable = readable && enabled && formWritable && stepWritable;

        return new EffectiveControlState(visible, enabled, required, readable, writable);
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

    private static final class RuleEffectState {
        private Boolean visible;
        private Boolean enabled;
        private Boolean required;
        private Boolean readable;
        private Boolean writable;

        private void apply(String effect, boolean value) {
            switch (effect) {
                case "visible":
                    this.visible = value;
                    break;
                case "enabled":
                    this.enabled = value;
                    break;
                case "required":
                    this.required = value;
                    break;
                case "readable":
                    this.readable = value;
                    break;
                case "writable":
                    this.writable = value;
                    break;
                default:
                    break;
            }
        }
    }

    private static final class EffectiveControlState {
        private final boolean visible;
        private final boolean enabled;
        private final boolean required;
        private final boolean readable;
        private final boolean writable;

        private EffectiveControlState(boolean visible,
                                      boolean enabled,
                                      boolean required,
                                      boolean readable,
                                      boolean writable) {
            this.visible = visible;
            this.enabled = enabled;
            this.required = required;
            this.readable = readable;
            this.writable = writable;
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