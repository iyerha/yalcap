package com.yalcap.web;

import com.yalcap.definition.form.control.ControlTypeClientAssets;
import com.yalcap.definition.form.control.ControlTypeDescriptor;
import com.yalcap.definition.form.control.ControlTypeRegistry;
import com.yalcap.definition.form.FormDefinitionEntity;
import com.yalcap.definition.form.FormDefinitionService;
import com.yalcap.definition.workflow.WorkflowDefinitionEntity;
import com.yalcap.definition.workflow.WorkflowDefinitionService;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Scanner;
import java.util.Set;
import java.util.UUID;

@Controller
@RequestMapping({"/designer", "/t/{tenantId}/designer"})
public class DesignerController {

    private final FormDefinitionService formDefinitionService;
    private final WorkflowDefinitionService definitionService;
    private final ControlTypeRegistry controlTypeRegistry;
    private final ObjectMapper objectMapper;

    public DesignerController(FormDefinitionService formDefinitionService,
                              WorkflowDefinitionService definitionService,
                              ControlTypeRegistry controlTypeRegistry,
                              ObjectMapper objectMapper) {
        this.formDefinitionService = formDefinitionService;
        this.definitionService = definitionService;
        this.controlTypeRegistry = controlTypeRegistry;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public String designerPage(@PathVariable(value = "tenantId", required = false) UUID tenantId, Model model) throws Exception {
        String definitionKey = "example-review";
        putDefinitionKey(model, definitionKey);
        model.addAttribute("tenantId", tenantId);
        seedExampleDefinition(definitionKey);
        return "designer";
    }

    @GetMapping("/active")
    public String activeDefinition(@PathVariable(value = "tenantId", required = false) UUID tenantId,
                                 @RequestParam String definitionKey,
                                 Model model) {
        putDefinitionKey(model, definitionKey);
        model.addAttribute("tenantId", tenantId);
        definitionService.getActiveDefinition(definitionKey).ifPresent(entity -> model.addAttribute("activeDefinition", entity));
        return "designer/active :: content";
    }

    @GetMapping("/history")
    public String definitionHistory(@PathVariable(value = "tenantId", required = false) UUID tenantId,
                                  @RequestParam String definitionKey,
                                  Model model) {
        putDefinitionKey(model, definitionKey);
        model.addAttribute("tenantId", tenantId);
        List<WorkflowDefinitionEntity> history = definitionService.getDefinitionHistory(definitionKey);
        model.addAttribute("history", history);
        return "designer/history :: content";
    }

    @PostMapping("/publish")
    public String publishDefinition(@PathVariable(value = "tenantId", required = false) UUID tenantId,
                                  @ModelAttribute PublishDefinitionForm form,
                                  Model model) throws Exception {
        JsonNode definition = objectMapper.readTree(form.getDefinition());
        putDefinitionKey(model, form.getDefinitionKey());
        model.addAttribute("tenantId", tenantId);
        try {
            String kind = definition.path("kind").asString("").trim();
            if ("form".equals(kind)) {
                FormDefinitionEntity publishedForm = formDefinitionService.publish(
                        form.getDefinitionKey(),
                        definition,
                        form.getCreatedBy(),
                        form.getChangeMessage()
                );
                model.addAttribute("activeDefinition", publishedForm);
            } else {
                WorkflowDefinitionEntity published = definitionService.publishDefinition(
                        form.getDefinitionKey(),
                        definition,
                        form.getCreatedBy(),
                        form.getChangeMessage()
                );
                model.addAttribute("activeDefinition", published);
            }
            model.addAttribute("publishSuccess", true);
        } catch (IllegalArgumentException ex) {
            String kind = definition.path("kind").asString("").trim();
            if ("form".equals(kind)) {
                formDefinitionService.getActiveForm(form.getDefinitionKey()).ifPresent(entity -> model.addAttribute("activeDefinition", entity));
            } else {
                definitionService.getActiveDefinition(form.getDefinitionKey()).ifPresent(entity -> model.addAttribute("activeDefinition", entity));
            }
            model.addAttribute("publishError", ex.getMessage());
        }
        return "designer/active :: content";
    }

    @GetMapping("/form")
    public String formDesigner(@PathVariable(value = "tenantId", required = false) UUID tenantId,
                               @RequestParam(required = false) String definitionKey,
                               Model model) throws Exception {
        String key = definitionKey != null ? definitionKey : "example-review";
        putDefinitionKey(model, key);
        model.addAttribute("tenantId", tenantId);
        addDesignerAssets(model);
        formDefinitionService.getActiveForm(key).ifPresent(entity -> model.addAttribute("activeDefinition", entity));
        return "designer/form";
    }

    @GetMapping("/workflow")
    public String workflowDesigner(@PathVariable(value = "tenantId", required = false) UUID tenantId,
                                   @RequestParam(required = false) String definitionKey,
                                   Model model) throws Exception {
        String key = definitionKey != null ? definitionKey : "example-review";
        putDefinitionKey(model, key);
        model.addAttribute("tenantId", tenantId);
        addDesignerAssets(model);
        model.addAttribute("workflowPublishAction", tenantId != null
            ? "/t/" + tenantId + "/designer/workflow/publish"
            : "/designer/workflow/publish");
        seedExampleDefinition(key);
        definitionService.getActiveDefinition(key).ifPresent(entity -> model.addAttribute("activeDefinition", entity));
        return "designer/workflow";
    }

    @PostMapping("/workflow/publish")
    public String publishWorkflowDefinition(@PathVariable(value = "tenantId", required = false) UUID tenantId,
                                            @ModelAttribute PublishDefinitionForm form,
                                            RedirectAttributes redirectAttributes) throws Exception {
        JsonNode definition = objectMapper.readTree(form.getDefinition());

        try {
            definitionService.publishDefinition(
                    form.getDefinitionKey(),
                    definition,
                    form.getCreatedBy(),
                    form.getChangeMessage()
            );
            redirectAttributes.addFlashAttribute("publishSuccess", true);
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("publishError", ex.getMessage());
        }

        String basePath = tenantId != null ? "/t/" + tenantId + "/designer/workflow" : "/designer/workflow";
        return "redirect:" + basePath + "?definitionKey=" + form.getDefinitionKey();
    }

    private void seedExampleDefinition(String definitionKey) throws Exception {
        if (definitionService.getActiveDefinition(definitionKey).isEmpty()) {
            ClassPathResource resource = new ClassPathResource("manifests/example-review-manifest.json");
            try (Scanner scanner = new Scanner(resource.getInputStream(), StandardCharsets.UTF_8.name())) {
                String content = scanner.useDelimiter("\\A").hasNext() ? scanner.next() : "";
                JsonNode definition = objectMapper.readTree(content);
                definitionService.publishDefinition(definitionKey, definition, "system", "Seed example definition");
            }
        }
    }

    private void putDefinitionKey(Model model, String definitionKey) {
        model.addAttribute("definitionKey", definitionKey);
    }

    private void addDesignerAssets(Model model) {
        Set<String> designerJs = new LinkedHashSet<>();
        Set<String> designerCss = new LinkedHashSet<>();

        for (ControlTypeDescriptor descriptor : controlTypeRegistry.descriptors()) {
            if (descriptor == null) {
                continue;
            }

            ControlTypeClientAssets assets = descriptor.clientAssets();
            if (assets == null) {
                continue;
            }

            addAssets(designerJs, assets.designerJs());
            addAssets(designerCss, assets.designerCss());
        }

        model.addAttribute("designerJsAssets", new ArrayList<>(designerJs));
        model.addAttribute("designerCssAssets", new ArrayList<>(designerCss));
    }

    private void addAssets(Set<String> target, List<String> assets) {
        if (assets == null) {
            return;
        }

        for (String asset : assets) {
            String value = asset == null ? "" : asset.trim();
            if (!value.isEmpty()) {
                target.add(value);
            }
        }
    }

    public static class PublishDefinitionForm {
        private String definitionKey;
        private String definition;
        private String createdBy;
        private String changeMessage;

        public String getDefinitionKey() {
            return definitionKey;
        }

        public void setDefinitionKey(String definitionKey) {
            this.definitionKey = definitionKey;
        }

        public String getDefinition() {
            return definition;
        }

        public void setDefinition(String definition) {
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
