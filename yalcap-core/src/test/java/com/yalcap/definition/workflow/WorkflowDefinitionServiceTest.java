package com.yalcap.definition.workflow;

import com.yalcap.asset.AssetFileRepository;
import com.yalcap.definition.form.load.FormLoadDataContext;
import com.yalcap.definition.form.load.FormLoadDataHydrationService;
import com.yalcap.definition.form.load.FormLoadDataProvider;
import com.yalcap.definition.form.FormDefinitionRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class WorkflowDefinitionServiceTest {

    private final WorkflowDefinitionRepository workflowRepository = Mockito.mock(WorkflowDefinitionRepository.class);
    private final FormDefinitionRepository formRepository = Mockito.mock(FormDefinitionRepository.class);
    private final AssetFileRepository assetFileRepository = Mockito.mock(AssetFileRepository.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final FormLoadDataHydrationService hydrationService = new FormLoadDataHydrationService(List.of(), objectMapper);

    private final WorkflowDefinitionService service = new WorkflowDefinitionService(
            workflowRepository,
            formRepository,
            assetFileRepository,
          hydrationService,
            objectMapper
    );

    @Test
    void resolveDefinitionView_filtersLayoutAndDataByVisibilityAndReadabilityRules() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("sample", """
                {
                  "id": "sample",
                  "controlSchema": {
                    "layout": [
                      {"stateKey": "applicantName", "pointer": "#/properties/applicantName", "widget": "text"},
                      {"stateKey": "secretCode", "pointer": "#/properties/secretCode", "widget": "text"},
                      {"stateKey": "publicNote", "pointer": "#/properties/publicNote", "widget": "text"}
                    ]
                  },
                  "rules": [
                    {"id": "r-hide-applicant", "scope": "step", "target": "applicantName", "effect": "visible", "value": false,
                      "when": {"fact": "workflow.stepId", "op": "eq", "value": "review"}},
                    {"id": "r-hide-secret", "scope": "form", "target": "secretCode", "effect": "readable", "value": false}
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("sample")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest request = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        request.setStepId("review");
        request.setData(objectMapper.readTree("""
                {
                  "applicantName": "Alice",
                  "secretCode": "S3",
                  "publicNote": "hello"
                }
                """));

        ObjectNode response = service.resolveDefinitionView("sample", request).orElseThrow();

        assertEquals(1, response.path("definition").path("controlSchema").path("layout").size());
        assertEquals("publicNote", response.path("definition").path("controlSchema").path("layout").get(0).path("stateKey").asString());

        assertTrue(response.path("data").has("publicNote"));
        assertFalse(response.path("data").has("applicantName"));
        assertFalse(response.path("data").has("secretCode"));

        assertEquals(1, response.path("permissions").path("readable").size());
        assertEquals("publicNote", response.path("permissions").path("readable").get(0).asString());
    }

    @Test
    void resolveDefinitionView_supportsInOperatorAgainstUserGroups() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("approval-flow", """
                {
                  "id": "approval-flow",
                  "controlSchema": {
                    "layout": [
                      {"stateKey": "approvalDecision", "pointer": "#/properties/approvalDecision", "widget": "select"}
                    ]
                  },
                  "rules": [
                    {"id": "r-required-for-finance", "scope": "step", "target": "approvalDecision", "effect": "required", "value": true,
                      "when": {"fact": "user.groups", "op": "in", "values": ["finance"]}}
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("approval-flow")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest financeRequest = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        financeRequest.setUserGroups(List.of("finance", "audit"));

        ObjectNode financeResponse = service.resolveDefinitionView("approval-flow", financeRequest).orElseThrow();

        assertTrue(financeResponse.path("definition").path("controlSchema").path("layout").get(0).path("required").asBoolean(false));

        WorkflowDefinitionService.ResolveDefinitionViewRequest nonFinanceRequest = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        nonFinanceRequest.setUserGroups(List.of("audit"));

        ObjectNode nonFinanceResponse = service.resolveDefinitionView("approval-flow", nonFinanceRequest).orElseThrow();

        assertFalse(nonFinanceResponse.path("definition").path("controlSchema").path("layout").get(0).path("required").asBoolean(false));
    }

    @Test
    void resolveDefinitionView_returnsEmptyDataWhenNoReadablePointers() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("hidden", """
                {
                  "id": "hidden",
                  "controlSchema": {
                    "layout": [
                      {"stateKey": "token", "pointer": "#/properties/token", "widget": "text"}
                    ]
                  },
                  "rules": [
                    {"id": "r-hide-token", "scope": "form", "target": "token", "effect": "readable", "value": false}
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("hidden")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest request = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        request.setData(objectMapper.readTree("{\"token\":\"abc\"}"));

        ObjectNode response = service.resolveDefinitionView("hidden", request).orElseThrow();

        assertNotNull(response.path("data"));
        assertEquals(0, response.path("data").size());
        assertEquals(0, response.path("definition").path("controlSchema").path("layout").size());
    }

    @Test
    void resolveDefinitionView_appliesRulesInVisualOrderAndBuildsPermissions() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("permissions", """
                {
                  "id": "permissions",
                  "controlSchema": {
                    "layout": [
                      {"stateKey": "approvalDecision", "pointer": "#/properties/approvalDecision", "widget": "select"}
                    ]
                  },
                  "rules": [
                    {"id": "r-default-readonly", "scope": "form", "target": "approvalDecision", "effect": "writable", "value": false},
                    {"id": "r-editor-can-write", "scope": "form", "target": "approvalDecision", "effect": "writable", "value": true,
                      "when": {"fact": "user.id", "op": "eq", "value": "editor"}}
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("permissions")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest editorRequest = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        editorRequest.setUserId("editor");
        editorRequest.setStepId("approve");
        editorRequest.setData(objectMapper.readTree("{\"approvalDecision\":\"yes\"}"));

        ObjectNode editorResponse = service.resolveDefinitionView("permissions", editorRequest).orElseThrow();

        assertEquals("permissions", editorResponse.path("definitionKey").asString());
        assertEquals(1, editorResponse.path("versionNumber").asInt());
        assertEquals("approve", editorResponse.path("stepId").asString());
        assertEquals(1, editorResponse.path("permissions").path("readable").size());
        assertEquals(1, editorResponse.path("permissions").path("writable").size());
        assertEquals("approvalDecision", editorResponse.path("permissions").path("writable").get(0).asString());

        WorkflowDefinitionService.ResolveDefinitionViewRequest reviewerRequest = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        reviewerRequest.setUserId("reviewer");
        reviewerRequest.setData(objectMapper.readTree("{\"approvalDecision\":\"yes\"}"));

        ObjectNode reviewerResponse = service.resolveDefinitionView("permissions", reviewerRequest).orElseThrow();

        assertEquals(1, reviewerResponse.path("permissions").path("readable").size());
        assertEquals(0, reviewerResponse.path("permissions").path("writable").size());
    }

    @Test
    void resolveDefinitionView_projectsNestedDataForReadablePointersOnly() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("nested", """
                {
                  "id": "nested",
                  "controlSchema": {
                    "layout": [
                      {"stateKey": "profile.displayName", "pointer": "#/properties/profile/properties/displayName", "widget": "text"},
                      {"stateKey": "profile.secret", "pointer": "#/properties/profile/properties/secret", "widget": "text"}
                    ]
                  },
                  "rules": [
                    {"id": "r-hide-secret", "scope": "form", "target": "profile.secret", "effect": "readable", "value": false}
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("nested")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest request = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        request.setData(objectMapper.readTree("""
                {
                  "profile": {
                    "displayName": "Alice",
                    "secret": "hidden"
                  }
                }
                """));

        ObjectNode response = service.resolveDefinitionView("nested", request).orElseThrow();

        assertEquals(1, response.path("definition").path("controlSchema").path("layout").size());
        assertEquals("profile.displayName", response.path("definition").path("controlSchema").path("layout").get(0).path("stateKey").asString());
        assertTrue(response.path("data").path("profile").has("displayName"));
        assertFalse(response.path("data").path("profile").has("secret"));
    }

    @Test
    void resolveDefinitionView_evaluatesJsonLogicConditions() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("json-logic", """
                {
                  "id": "json-logic",
                  "controlSchema": {
                    "layout": [
                      {"stateKey": "approvalDecision", "pointer": "#/properties/approvalDecision", "widget": "select"}
                    ]
                  },
                  "rules": [
                    {
                      "id": "r-disable-default",
                      "scope": "step",
                      "target": "approvalDecision",
                      "effect": "enabled",
                      "value": false
                    },
                    {
                      "id": "r-enable-for-review",
                      "scope": "step",
                      "target": "approvalDecision",
                      "effect": "enabled",
                      "value": true,
                      "when": {"==": [{"var": "workflow.stepId"}, "review"]}
                    }
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("json-logic")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest reviewRequest = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        reviewRequest.setStepId("review");

        ObjectNode reviewResponse = service.resolveDefinitionView("json-logic", reviewRequest).orElseThrow();
        assertTrue(reviewResponse.path("definition").path("controlSchema").path("layout").get(0).path("enabled").asBoolean());

        WorkflowDefinitionService.ResolveDefinitionViewRequest draftRequest = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        draftRequest.setStepId("draft");

        ObjectNode draftResponse = service.resolveDefinitionView("json-logic", draftRequest).orElseThrow();
        assertFalse(draftResponse.path("definition").path("controlSchema").path("layout").get(0).path("enabled").asBoolean());
    }

    @Test
    void resolveDefinitionView_appliesMultipleActionsFromSingleRule() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("multi-actions", """
                {
                  "id": "multi-actions",
                  "controlSchema": {
                    "layout": [
                      {"stateKey": "applicantName", "pointer": "#/properties/applicantName", "widget": "text"},
                      {"stateKey": "approvalDecision", "pointer": "#/properties/approvalDecision", "widget": "select"}
                    ]
                  },
                  "rules": [
                    {
                      "id": "r-review-mode",
                      "scope": "step",
                      "when": {"==": [{"var": "workflow.stepId"}, "review"]},
                      "actions": [
                        {"target": "applicantName", "effect": "readable", "value": false},
                        {"target": "approvalDecision", "effect": "required", "value": true}
                      ]
                    }
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("multi-actions")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest request = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        request.setStepId("review");
        request.setData(objectMapper.readTree("{\"applicantName\":\"Alice\",\"approvalDecision\":\"\"}"));

        ObjectNode response = service.resolveDefinitionView("multi-actions", request).orElseThrow();

        assertEquals(1, response.path("definition").path("controlSchema").path("layout").size());
        assertEquals("approvalDecision", response.path("definition").path("controlSchema").path("layout").get(0).path("stateKey").asString());
        assertTrue(response.path("definition").path("controlSchema").path("layout").get(0).path("required").asBoolean());
    }

    @Test
    void resolveDefinitionView_mergesHydratedDataFromProvidersForRuleEvaluation() throws Exception {
        FormLoadDataProvider provider = new FormLoadDataProvider() {
            @Override
            public String id() {
                return "mock-provider";
            }

            @Override
            public ObjectNode load(FormLoadDataContext context) {
                ObjectNode node = objectMapper.createObjectNode();
                node.put("region", "EU");
                return node;
            }
        };

        WorkflowDefinitionService hydrationAwareService = new WorkflowDefinitionService(
                workflowRepository,
                formRepository,
                assetFileRepository,
                new FormLoadDataHydrationService(List.of(provider), objectMapper),
                objectMapper
        );

        WorkflowDefinitionEntity entity = buildEntity("hydration", """
                {
                  "id": "hydration",
                  "controlSchema": {
                    "layout": [
                      {"stateKey": "approvalDecision", "pointer": "#/properties/approvalDecision", "widget": "select"}
                    ]
                  },
                  "rules": [
                    {
                      "id": "r-require-eu",
                      "scope": "form",
                      "target": "approvalDecision",
                      "effect": "required",
                      "value": true,
                      "when": {"fact": "data.region", "op": "eq", "value": "EU"}
                    }
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("hydration")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest request = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        request.setData(objectMapper.createObjectNode());

        ObjectNode response = hydrationAwareService.resolveDefinitionView("hydration", request).orElseThrow();

        assertTrue(response.path("definition").path("controlSchema").path("layout").get(0).path("required").asBoolean(false));
    }

    private WorkflowDefinitionEntity buildEntity(String definitionKey, String definitionJson) throws Exception {
        WorkflowDefinitionEntity entity = new WorkflowDefinitionEntity();
        entity.setId(UUID.randomUUID());
        entity.setDefinitionKey(definitionKey);
        entity.setVersionNumber(1);
        entity.setActive(true);
        entity.setDefinition(objectMapper.readTree(definitionJson));
        return entity;
    }
}
