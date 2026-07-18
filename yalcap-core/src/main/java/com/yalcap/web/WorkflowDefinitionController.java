package com.yalcap.web;

import com.yalcap.definition.workflow.WorkflowDefinitionEntity;
import com.yalcap.definition.workflow.WorkflowDefinitionService;
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
@RequestMapping("/api/definitions")
public class WorkflowDefinitionController {

    private final WorkflowDefinitionService definitionService;

    public WorkflowDefinitionController(WorkflowDefinitionService definitionService) {
        this.definitionService = definitionService;
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
