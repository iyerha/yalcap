package com.yalcap.definition.workflow;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.NullNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class WorkflowRuleEngine {

    private static final Set<String> JSON_LOGIC_OPERATORS = Set.of(
            "var", "==", "!=", ">", ">=", "<", "<=", "in", "and", "or", "!", "matches"
    );

    private final ObjectMapper objectMapper;

    public WorkflowRuleEngine(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, RuleEffectState> evaluateRules(JsonNode rulesNode,
                                                      String scope,
                                                      ObjectNode context,
                                                      boolean initializationPhase) {
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
            if (!shouldEvaluateRuleForPhase(rule, initializationPhase)) {
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

    public void applyDerivedValueRules(JsonNode rulesNode,
                                       String scope,
                                       ObjectNode context,
                                       ObjectNode data,
                                       boolean initializationPhase) {
        if (!rulesNode.isArray() || context == null || data == null) {
            return;
        }

        ObjectNode contextData = context.path("data").isObject()
                ? (ObjectNode) context.path("data")
                : context.putObject("data");

        for (JsonNode rule : rulesNode) {
            if (rule == null || !rule.isObject()) {
                continue;
            }

            String ruleScope = safeString(rule.path("scope").asString());
            if (!scope.equals(ruleScope)) {
                continue;
            }
            if (!shouldEvaluateRuleForPhase(rule, initializationPhase)) {
                continue;
            }

            JsonNode when = rule.path("when");
            if (!evaluateCondition(when, context)) {
                continue;
            }

            JsonNode actions = rule.path("actions");
            if (actions.isArray() && actions.size() > 0) {
                for (JsonNode action : actions) {
                    applyDerivedValueAction(action, context, data, contextData);
                }
                continue;
            }

            applyDerivedValueAction(rule, context, data, contextData);
        }
    }

    public boolean shouldEvaluateRuleForPhase(JsonNode rule, boolean initializationPhase) {
        if (rule == null || !rule.isObject()) {
            return false;
        }

        boolean runOnInit = rule.path("runOnInit").asBoolean(false);
        if (!runOnInit) {
            return true;
        }

        return initializationPhase;
    }

    public boolean evaluateCondition(JsonNode condition, ObjectNode context) {
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

    private void applyRuleAction(Map<String, RuleEffectState> targetState, JsonNode actionNode) {
        if (actionNode == null || !actionNode.isObject()) {
            return;
        }

        String target = safeString(actionNode.path("target").asString());
        String effect = safeString(actionNode.path("effect").asString());
        if (target.isEmpty() || effect.isEmpty()) {
            return;
        }

        RuleEffectState state = targetState.computeIfAbsent(target, ignored -> new RuleEffectState());
        if ("collapse".equals(effect)) {
            state.applyCollapsed(true);
            return;
        }
        if ("expand".equals(effect)) {
            state.applyCollapsed(false);
            return;
        }

        boolean value = actionNode.path("value").asBoolean(false);
        state.apply(effect, value);
    }

    private void applyDerivedValueAction(JsonNode actionNode,
                                         ObjectNode context,
                                         ObjectNode data,
                                         ObjectNode contextData) {
        if (actionNode == null || !actionNode.isObject() || !isDerivedValueAction(actionNode)) {
            return;
        }

        String target = safeString(actionNode.path("target").asString());
        if (target.isEmpty()) {
            return;
        }

        String dataPath = target.startsWith("data.") ? target.substring(5) : target;
        if (dataPath.isEmpty()) {
            return;
        }

        JsonNode derivedValue = evaluateDerivedValueNode(actionNode, context);
        if (derivedValue == null || derivedValue.isMissingNode()) {
            return;
        }

        setObjectPathValue(data, dataPath, derivedValue);
        setObjectPathValue(contextData, dataPath, derivedValue);
    }

    private boolean isDerivedValueAction(JsonNode actionNode) {
        if (actionNode == null || !actionNode.isObject()) {
            return false;
        }

        String kind = safeString(actionNode.path("kind").asString()).toLowerCase();
        if ("derive".equals(kind)) {
            return true;
        }

        String effect = safeString(actionNode.path("effect").asString()).toLowerCase();
        return "set".equals(effect) || "derive".equals(effect);
    }

    private JsonNode evaluateDerivedValueNode(JsonNode actionNode, ObjectNode context) {
        JsonNode expression = actionNode.get("expression");
        if (expression != null && !expression.isNull() && !expression.isMissingNode()) {
            return evaluateExpressionNode(expression, context);
        }

        JsonNode valueNode = actionNode.get("value");
        if (valueNode == null || valueNode.isMissingNode()) {
            return null;
        }

        return evaluateExpressionNode(valueNode, context);
    }

    private JsonNode evaluateExpressionNode(JsonNode node, ObjectNode context) {
        if (node == null || node.isMissingNode()) {
            return null;
        }

        if (isJsonLogicCondition(node)) {
            JsonNode evaluated = evaluateJsonLogic(node, context);
            return evaluated == null ? NullNode.getInstance() : evaluated.deepCopy();
        }

        return node.deepCopy();
    }

    private void setObjectPathValue(ObjectNode root, String dottedPath, JsonNode value) {
        if (root == null) {
            return;
        }

        String path = safeString(dottedPath);
        if (path.isEmpty()) {
            return;
        }

        String[] segments = path.split("\\.");
        ObjectNode cursor = root;
        for (int i = 0; i < segments.length - 1; i += 1) {
            String segment = safeString(segments[i]);
            if (segment.isEmpty()) {
                return;
            }

            JsonNode next = cursor.get(segment);
            if (!(next instanceof ObjectNode)) {
                ObjectNode created = objectMapper.createObjectNode();
                cursor.set(segment, created);
                cursor = created;
                continue;
            }
            cursor = (ObjectNode) next;
        }

        String leaf = safeString(segments[segments.length - 1]);
        if (leaf.isEmpty()) {
            return;
        }

        cursor.set(leaf, value == null ? NullNode.getInstance() : value.deepCopy());
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

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    public static final class RuleEffectState {
        private Boolean visible;
        private Boolean enabled;
        private Boolean required;
        private Boolean readable;
        private Boolean writable;
        private Boolean collapsed;

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
                case "collapsed":
                    this.collapsed = value;
                    break;
                default:
                    break;
            }
        }

        private void applyCollapsed(boolean value) {
            this.collapsed = value;
        }

        public Boolean visible() {
            return visible;
        }

        public Boolean enabled() {
            return enabled;
        }

        public Boolean required() {
            return required;
        }

        public Boolean readable() {
            return readable;
        }

        public Boolean writable() {
            return writable;
        }

        public Boolean collapsed() {
            return collapsed;
        }
    }
}
