package com.yalcap.web;

import com.yalcap.form.FormArtifactEntity;
import com.yalcap.form.FormArtifactService;
import com.yalcap.manifest.WorkflowManifestEntity;
import com.yalcap.manifest.WorkflowManifestService;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Scanner;

@Controller
@RequestMapping("/designer")
public class DesignerController {

    private final FormArtifactService formArtifactService;
    private final WorkflowManifestService manifestService;
    private final ObjectMapper objectMapper;

    public DesignerController(FormArtifactService formArtifactService,
                              WorkflowManifestService manifestService,
                              ObjectMapper objectMapper) {
        this.formArtifactService = formArtifactService;
        this.manifestService = manifestService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public String designerPage(Model model) throws Exception {
        String manifestKey = "example-review";
        model.addAttribute("manifestKey", manifestKey);
        seedExampleManifest(manifestKey);
        return "designer";
    }

    @GetMapping("/active")
    public String activeManifest(@RequestParam String manifestKey, Model model) {
        model.addAttribute("manifestKey", manifestKey);
        manifestService.getActiveManifest(manifestKey).ifPresent(entity -> model.addAttribute("activeManifest", entity));
        return "designer/active :: content";
    }

    @GetMapping("/history")
    public String manifestHistory(@RequestParam String manifestKey, Model model) {
        model.addAttribute("manifestKey", manifestKey);
        List<WorkflowManifestEntity> history = manifestService.getManifestHistory(manifestKey);
        model.addAttribute("history", history);
        return "designer/history :: content";
    }

    @PostMapping("/publish")
    public String publishManifest(@ModelAttribute PublishManifestForm form, Model model) throws Exception {
        JsonNode manifest = objectMapper.readTree(form.getManifest());
        model.addAttribute("manifestKey", form.getManifestKey());
        try {
            String kind = manifest.path("kind").asString("").trim();
            if ("form".equals(kind)) {
                FormArtifactEntity publishedForm = formArtifactService.publish(
                        form.getManifestKey(),
                        manifest,
                        form.getCreatedBy(),
                        form.getChangeMessage()
                );
                model.addAttribute("activeManifest", publishedForm);
            } else {
                WorkflowManifestEntity published = manifestService.publish(
                        form.getManifestKey(),
                        manifest,
                        form.getCreatedBy(),
                        form.getChangeMessage()
                );
                model.addAttribute("activeManifest", published);
            }
            model.addAttribute("publishSuccess", true);
        } catch (IllegalArgumentException ex) {
            String kind = manifest.path("kind").asString("").trim();
            if ("form".equals(kind)) {
                formArtifactService.getActiveForm(form.getManifestKey()).ifPresent(entity -> model.addAttribute("activeManifest", entity));
            } else {
                manifestService.getActiveManifest(form.getManifestKey()).ifPresent(entity -> model.addAttribute("activeManifest", entity));
            }
            model.addAttribute("publishError", ex.getMessage());
        }
        return "designer/active :: content";
    }

    @GetMapping("/form")
    public String formDesigner(@RequestParam(required = false) String manifestKey, Model model) throws Exception {
        String key = manifestKey != null ? manifestKey : "example-review";
        model.addAttribute("manifestKey", key);
        formArtifactService.getActiveForm(key).ifPresent(entity -> model.addAttribute("activeManifest", entity));
        return "designer/form";
    }

    private void seedExampleManifest(String manifestKey) throws Exception {
        if (manifestService.getActiveManifest(manifestKey).isEmpty()) {
            ClassPathResource resource = new ClassPathResource("manifests/example-review-manifest.json");
            try (Scanner scanner = new Scanner(resource.getInputStream(), StandardCharsets.UTF_8.name())) {
                String content = scanner.useDelimiter("\\A").hasNext() ? scanner.next() : "";
                JsonNode manifest = objectMapper.readTree(content);
                manifestService.publish(manifestKey, manifest, "system", "Seed example manifest");
            }
        }
    }

    public static class PublishManifestForm {
        private String manifestKey;
        private String manifest;
        private String createdBy;
        private String changeMessage;

        public String getManifestKey() {
            return manifestKey;
        }

        public void setManifestKey(String manifestKey) {
            this.manifestKey = manifestKey;
        }

        public String getManifest() {
            return manifest;
        }

        public void setManifest(String manifest) {
            this.manifest = manifest;
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
