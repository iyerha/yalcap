package com.yalcap.web;

import com.yalcap.manifest.WorkflowManifestEntity;
import com.yalcap.manifest.WorkflowManifestService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import tools.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/api/manifests")
public class WorkflowManifestController {

    private final WorkflowManifestService manifestService;

    public WorkflowManifestController(WorkflowManifestService manifestService) {
        this.manifestService = manifestService;
    }

    @GetMapping("/{manifestKey}")
    @ResponseBody
    public ResponseEntity<WorkflowManifestEntity> getActiveManifest(@PathVariable String manifestKey) {
        return manifestService.getActiveManifest(manifestKey)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{manifestKey}/history")
    @ResponseBody
    public ResponseEntity<List<WorkflowManifestEntity>> getManifestHistory(@PathVariable String manifestKey) {
        return ResponseEntity.ok(manifestService.getManifestHistory(manifestKey));
    }

    @PostMapping("/{manifestKey}/publish")
    @ResponseBody
    public ResponseEntity<?> publishManifest(@PathVariable String manifestKey,
                                             @RequestBody PublishManifestRequest request) {
        try {
            WorkflowManifestEntity published = manifestService.publish(
                    manifestKey,
                    request.getManifest(),
                    request.getCreatedBy(),
                    request.getChangeMessage()
            );
            return ResponseEntity.ok(published);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    public static class PublishManifestRequest {
        private JsonNode manifest;
        private String createdBy;
        private String changeMessage;

        public JsonNode getManifest() {
            return manifest;
        }

        public void setManifest(JsonNode manifest) {
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
