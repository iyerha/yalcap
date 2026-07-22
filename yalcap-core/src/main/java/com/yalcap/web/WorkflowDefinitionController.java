package com.yalcap.web;

import com.yalcap.definition.form.control.ControlTextDirection;
import com.yalcap.definition.form.control.ControlTypeClientAssets;
import com.yalcap.definition.form.control.ControlTypeRenderContext;
import com.yalcap.definition.form.control.ControlTypeRenderSpec;
import com.yalcap.definition.form.control.ControlTypeRegistry;
import com.yalcap.definition.workflow.WorkflowDefinitionEntity;
import com.yalcap.definition.workflow.WorkflowDefinitionService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Locale;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Set;

@Controller
@RequestMapping("/api/definitions")
public class WorkflowDefinitionController {

    private static final Set<String> RTL_LANGUAGES = Set.of("ar", "fa", "he", "ur");

    private final WorkflowDefinitionService definitionService;
    private final ControlTypeRegistry controlTypeRegistry;

    public WorkflowDefinitionController(WorkflowDefinitionService definitionService,
                                        ControlTypeRegistry controlTypeRegistry) {
        this.definitionService = definitionService;
        this.controlTypeRegistry = controlTypeRegistry;
    }

    @GetMapping("/{definitionKey}")
    @ResponseBody
    public ResponseEntity<WorkflowDefinitionEntity> getActiveDefinition(@PathVariable String definitionKey) {
        return definitionService.getActiveDefinition(definitionKey)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{definitionKey}/history")
    @ResponseBody
    public ResponseEntity<List<WorkflowDefinitionEntity>> getDefinitionHistory(@PathVariable String definitionKey) {
        return ResponseEntity.ok(definitionService.getDefinitionHistory(definitionKey));
    }

    @PostMapping("/{definitionKey}/resolved")
    @ResponseBody
    public ResponseEntity<?> resolveDefinitionView(@PathVariable String definitionKey,
                                                   @RequestBody(required = false) WorkflowDefinitionService.ResolveDefinitionViewRequest request) {
        try {
            return definitionService.resolveDefinitionView(definitionKey, request)
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/{definitionKey}/resolved/html")
    public String resolveDefinitionHtml(@PathVariable String definitionKey,
                                        @RequestBody(required = false) WorkflowDefinitionService.ResolveDefinitionViewRequest request,
                                        Model model) {
        ObjectNode resolved = definitionService.resolveDefinitionView(definitionKey, request)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        JsonNode layout = resolved.path("definition").path("controlSchema").path("layout");
        Locale locale = LocaleContextHolder.getLocale();
        ControlTextDirection direction = inferDirection(locale);
        AssetCollector assets = new AssetCollector();
        model.addAttribute("definitionKey", definitionKey);
        model.addAttribute("controls", mapRenderedControls(layout, locale, direction, assets));
        model.addAttribute("runtimeJsAssets", assets.runtimeJs());
        model.addAttribute("runtimeCssAssets", assets.runtimeCss());
        return "runtime/resolved-form :: content";
    }

    private List<RenderedControl> mapRenderedControls(JsonNode layout,
                                                      Locale locale,
                                                      ControlTextDirection direction,
                                                      AssetCollector assets) {
        if (layout == null || !layout.isArray()) {
            return List.of();
        }

        List<RenderedControl> controls = new ArrayList<>();
        for (JsonNode node : layout) {
            if (node == null || !node.isObject()) {
                continue;
            }

            RenderedControl control = new RenderedControl();
            control.stateKey = trim(node.path("stateKey").asString());
            control.name = trim(node.path("name").asString());
            control.label = trim(node.path("label").asString());
            control.widget = trim(node.path("widget").asString());
            control.inputType = resolveInputType(control.widget);
            control.placeholder = trim(node.path("placeholder").asString());
            control.required = node.path("required").asBoolean(false);
            control.enabled = node.path("enabled").asBoolean(true);
            control.min = scalarText(node.get("min"));
            control.max = scalarText(node.get("max"));
            control.step = scalarText(node.get("step"));

            JsonNode runtimeHtmx = node.path("runtimeHtmx");
            if (runtimeHtmx != null && runtimeHtmx.isObject()) {
                control.hxGet = trim(runtimeHtmx.path("hxGet").asString());
                control.hxPost = trim(runtimeHtmx.path("hxPost").asString());
                control.hxMethod = trim(runtimeHtmx.path("hxMethod").asString());
                control.hxTrigger = trim(runtimeHtmx.path("hxTrigger").asString());
                control.hxTarget = trim(runtimeHtmx.path("hxTarget").asString());
                control.hxSwap = trim(runtimeHtmx.path("hxSwap").asString());
                control.hxVals = trim(runtimeHtmx.path("hxVals").asString());
            }

            applyControlTypeRender(control, node, locale, direction, assets);

            control.children = mapRenderedControls(node.path("children"), locale, direction, assets);
            controls.add(control);
        }

        return controls;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String resolveInputType(String widget) {
        if ("number".equals(widget)) {
            return "number";
        }
        if ("date".equals(widget)) {
            return "date";
        }
        if ("datetime".equals(widget)) {
            return "datetime-local";
        }
        return "text";
    }

    private String scalarText(JsonNode node) {
        if (node == null || node.isNull()) {
            return "";
        }
        if (node.isString()) {
            return trim(node.asString());
        }
        if (node.isNumber()) {
            return node.numberValue().toString();
        }
        if (node.isBoolean()) {
            return String.valueOf(node.asBoolean());
        }
        return "";
    }

    private void applyControlTypeRender(RenderedControl control,
                                        JsonNode node,
                                        Locale locale,
                                        ControlTextDirection direction,
                                        AssetCollector assets) {
        if (control == null || node == null || !node.isObject()) {
            return;
        }

        String widget = trim(node.path("widget").asString());
        ControlTypeRenderSpec spec = controlTypeRegistry.find(widget)
                .map(type -> {
                    if (assets != null) {
                        assets.add(type.descriptor().clientAssets());
                    }

                    return type.render(new ControlTypeRenderContext(
                            node,
                            null,
                            null,
                            Map.of(),
                            locale,
                            direction
                    )).orElse(null);
                })
                .orElse(null);

        if (spec == null || spec.model() == null) {
            return;
        }

        control.inputType = modelText(spec.model(), "inputType", control.inputType);
        control.placeholder = modelText(spec.model(), "placeholder", control.placeholder);
        control.min = modelText(spec.model(), "min", control.min);
        control.max = modelText(spec.model(), "max", control.max);
        control.step = modelText(spec.model(), "step", control.step);
        control.renderFragment = trim(spec.fragmentName());
        control.renderModel = new LinkedHashMap<>(spec.model());
    }

    private static final class AssetCollector {
        private final Set<String> runtimeJs = new LinkedHashSet<>();
        private final Set<String> runtimeCss = new LinkedHashSet<>();

        private void add(ControlTypeClientAssets assets) {
            if (assets == null) {
                return;
            }
            addAll(runtimeJs, assets.runtimeJs());
            addAll(runtimeCss, assets.runtimeCss());
        }

        private List<String> runtimeJs() {
            return List.copyOf(runtimeJs);
        }

        private List<String> runtimeCss() {
            return List.copyOf(runtimeCss);
        }

        private void addAll(Set<String> target, List<String> source) {
            if (source == null) {
                return;
            }
            for (String item : source) {
                String value = trimValue(item);
                if (!value.isEmpty()) {
                    target.add(value);
                }
            }
        }

        private String trimValue(String value) {
            return value == null ? "" : value.trim();
        }
    }

    private String modelText(Map<String, Object> model, String key, String fallback) {
        if (model == null || key == null || key.isEmpty()) {
            return fallback;
        }
        Object value = model.get(key);
        if (value == null) {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? fallback : text;
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

    public static class RenderedControl {
        private String stateKey;
        private String name;
        private String label;
        private String widget;
        private String inputType;
        private String placeholder;
        private boolean required;
        private boolean enabled;
        private String min;
        private String max;
        private String step;
        private String hxGet;
        private String hxPost;
        private String hxMethod;
        private String hxTrigger;
        private String hxTarget;
        private String hxSwap;
        private String hxVals;
        private String renderFragment;
        private Map<String, Object> renderModel = Collections.emptyMap();
        private List<RenderedControl> children = Collections.emptyList();

        public String getStateKey() {
            return stateKey;
        }

        public String getName() {
            return name;
        }

        public String getLabel() {
            return label;
        }

        public String getWidget() {
            return widget;
        }

        public String getInputType() {
            return inputType;
        }

        public String getPlaceholder() {
            return placeholder;
        }

        public boolean isRequired() {
            return required;
        }

        public boolean isEnabled() {
            return enabled;
        }

        public String getMin() {
            return min;
        }

        public String getMax() {
            return max;
        }

        public String getStep() {
            return step;
        }

        public String getHxGet() {
            return hxGet;
        }

        public String getHxPost() {
            return hxPost;
        }

        public String getHxMethod() {
            return hxMethod;
        }

        public String getHxTrigger() {
            return hxTrigger;
        }

        public String getHxTarget() {
            return hxTarget;
        }

        public String getHxSwap() {
            return hxSwap;
        }

        public String getHxVals() {
            return hxVals;
        }

        public String getRenderFragment() {
            return renderFragment;
        }

        public Map<String, Object> getRenderModel() {
            return renderModel;
        }

        public List<RenderedControl> getChildren() {
            return children;
        }
    }

    @PostMapping("/{definitionKey}/publish")
    @ResponseBody
    public ResponseEntity<?> publishDefinition(@PathVariable String definitionKey,
                                             @RequestBody PublishDefinitionRequest request) {
        try {
            WorkflowDefinitionEntity published = definitionService.publishDefinition(
                    definitionKey,
                    request.getDefinition(),
                    request.getCreatedBy(),
                    request.getChangeMessage()
            );
            return ResponseEntity.ok(published);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    public static class PublishDefinitionRequest {
        private JsonNode definition;
        private String createdBy;
        private String changeMessage;

        public JsonNode getDefinition() {
            return definition;
        }

        public void setDefinition(JsonNode definition) {
            this.definition = definition;
        }

        public String getCreatedBy() {
            return createdBy;
        }

        public void setCreatedBy(String createdBy) {
            this.createdBy = createdBy;
        }

        public String getChangeMessage() {
            return changeMessage;
        }

        public void setChangeMessage(String changeMessage) {
            this.changeMessage = changeMessage;
        }
    }
}
