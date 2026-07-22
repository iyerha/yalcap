package com.yalcap.definition.workflow;

import com.yalcap.asset.AssetFileRepository;
import com.yalcap.definition.form.load.FormLoadDataContext;
import com.yalcap.definition.form.load.FormLoadDataPhase;
import com.yalcap.definition.form.load.FormLoadDataService;
import com.yalcap.definition.form.load.FormLoadDataProvider;
import com.yalcap.definition.form.load.FormLoadPhaseHandler;
import com.yalcap.definition.form.FormDefinitionRepository;
import com.yalcap.definition.workflow.step.DecisionStepType;
import com.yalcap.definition.workflow.step.FormStepType;
import com.yalcap.definition.workflow.step.ServiceStepType;
import com.yalcap.definition.workflow.step.StepTypeRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class WorkflowDefinitionServiceTest {

    private final WorkflowDefinitionRepository workflowRepository = Mockito.mock(WorkflowDefinitionRepository.class);
    private final FormDefinitionRepository formRepository = Mockito.mock(FormDefinitionRepository.class);
    private final AssetFileRepository assetFileRepository = Mockito.mock(AssetFileRepository.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final FormLoadDataService hydrationService = new FormLoadDataService(List.of(), objectMapper);
        private final StepTypeRegistry stepTypeRegistry = new StepTypeRegistry(List.of(
          new FormStepType(),
          new ServiceStepType(),
          new DecisionStepType()
        ));

    private final WorkflowDefinitionService service = new WorkflowDefinitionService(
            workflowRepository,
            formRepository,
            assetFileRepository,
          hydrationService,
          stepTypeRegistry,
          new WorkflowRuleEngine(objectMapper),
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

          @FormLoadPhaseHandler(FormLoadDataPhase.FORM_OPEN)
          public ObjectNode onFormOpen(FormLoadDataContext context) {
                ObjectNode node = objectMapper.createObjectNode();
                node.put("region", "EU");
                return node;
            }
        };

        WorkflowDefinitionService hydrationAwareService = new WorkflowDefinitionService(
                workflowRepository,
                formRepository,
                assetFileRepository,
                new FormLoadDataService(List.of(provider), objectMapper),
          stepTypeRegistry,
          new WorkflowRuleEngine(objectMapper),
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

    @Test
    void resolveDefinitionView_appliesSectionCollapseAndExpandRuleEffects() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("section-collapse", """
                {
                  "id": "section-collapse",
                  "controlSchema": {
                    "layout": [
                      {
                        "widget": "section",
                        "stateKey": "reviewSection",
                        "label": "Review",
                        "sectionCollapsible": true,
                        "sectionDefaultExpanded": true,
                        "children": [
                          {"widget": "text", "stateKey": "notes", "pointer": "#/properties/notes"}
                        ]
                      }
                    ]
                  },
                  "rules": [
                    {
                      "id": "r-collapse-on-review",
                      "scope": "form",
                      "target": "reviewSection",
                      "effect": "collapse",
                      "when": {"fact": "workflow.stepId", "op": "eq", "value": "review"}
                    },
                    {
                      "id": "r-expand-for-lead",
                      "scope": "step",
                      "target": "reviewSection",
                      "effect": "expand",
                      "when": {
                        "all": [
                          {"fact": "workflow.stepId", "op": "eq", "value": "review"},
                          {"fact": "user.id", "op": "eq", "value": "lead"}
                        ]
                      }
                    }
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("section-collapse")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest reviewerRequest = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        reviewerRequest.setStepId("review");
        reviewerRequest.setUserId("reviewer");

        ObjectNode reviewerResponse = service.resolveDefinitionView("section-collapse", reviewerRequest).orElseThrow();
        assertTrue(reviewerResponse.path("definition").path("controlSchema").path("layout").get(0).path("collapsed").asBoolean(false));

        WorkflowDefinitionService.ResolveDefinitionViewRequest leadRequest = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        leadRequest.setStepId("review");
        leadRequest.setUserId("lead");

        ObjectNode leadResponse = service.resolveDefinitionView("section-collapse", leadRequest).orElseThrow();
        assertFalse(leadResponse.path("definition").path("controlSchema").path("layout").get(0).path("collapsed").asBoolean(true));
    }

    @Test
    void resolveDefinitionView_appliesColumnVisibilityRuleEffects() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("table-column-visibility", """
                {
                  "id": "table-column-visibility",
                  "controlSchema": {
                    "layout": [
                      {
                        "widget": "repeat",
                        "stateKey": "lineItems",
                        "renderer": "table",
                        "columns": [
                          {"key": "sku", "title": "SKU", "type": "string", "visible": true},
                          {"key": "amount", "title": "Amount", "type": "number", "visible": true}
                        ]
                      }
                    ]
                  },
                  "rules": [
                    {
                      "id": "hide-amount-column",
                      "scope": "form",
                      "target": "lineItems.columns.amount",
                      "effect": "visible",
                      "value": false,
                      "when": {"fact": "workflow.stepId", "op": "eq", "value": "review"}
                    }
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("table-column-visibility")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest request = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        request.setStepId("review");

        ObjectNode response = service.resolveDefinitionView("table-column-visibility", request).orElseThrow();
        JsonNode columns = response.path("definition").path("controlSchema").path("layout").get(0).path("columns");

        assertTrue(columns.isArray());
        assertTrue(columns.get(0).path("visible").asBoolean(true));
        assertFalse(columns.get(1).path("visible").asBoolean(true));
    }

    @Test
    void resolveDefinitionView_appliesDerivedValueExpressionsToData() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("derived-values", """
                {
                  "id": "derived-values",
                  "controlSchema": {
                    "layout": [
                      {"widget": "text", "stateKey": "stepName", "pointer": "#/properties/stepName"},
                      {"widget": "text", "stateKey": "reviewed", "pointer": "#/properties/reviewed"}
                    ]
                  },
                  "rules": [
                    {
                      "id": "derive-step-name",
                      "scope": "form",
                      "actions": [
                        {
                          "kind": "derive",
                          "target": "data.stepName",
                          "expression": {"var": "workflow.stepId"}
                        },
                        {
                          "effect": "set",
                          "target": "data.reviewed",
                          "value": true
                        }
                      ]
                    }
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("derived-values")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest request = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        request.setStepId("review");

        ObjectNode response = service.resolveDefinitionView("derived-values", request).orElseThrow();
        ObjectNode projectedData = (ObjectNode) response.path("data");

        assertEquals("review", projectedData.path("stepName").asString(""));
        assertTrue(projectedData.path("reviewed").asBoolean(false));
    }

    @Test
    void resolveDefinitionView_appliesRunOnInitRulesOnlyDuringInitializationPhase() throws Exception {
        WorkflowDefinitionEntity entity = buildEntity("init-phase-rules", """
                {
                  "id": "init-phase-rules",
                  "controlSchema": {
                    "layout": [
                      {"widget": "text", "stateKey": "serverComputed", "pointer": "#/properties/serverComputed"},
                      {"widget": "text", "stateKey": "uiFlag", "pointer": "#/properties/uiFlag"}
                    ]
                  },
                  "rules": [
                    {
                      "id": "init-derive",
                      "scope": "form",
                      "runOnInit": true,
                      "actions": [
                        {
                          "kind": "derive",
                          "target": "data.serverComputed",
                          "expression": "ready"
                        }
                      ]
                    },
                    {
                      "id": "runtime-derive",
                      "scope": "form",
                      "actions": [
                        {
                          "kind": "derive",
                          "target": "data.uiFlag",
                          "expression": "always"
                        }
                      ]
                    }
                  ]
                }
                """);

        when(workflowRepository.findByDefinitionKeyAndActiveTrue("init-phase-rules")).thenReturn(Optional.of(entity));

        WorkflowDefinitionService.ResolveDefinitionViewRequest runtimeRequest = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        ObjectNode runtimeResponse = service.resolveDefinitionView("init-phase-rules", runtimeRequest).orElseThrow();

        assertFalse(runtimeResponse.path("data").has("serverComputed"));
        assertEquals("always", runtimeResponse.path("data").path("uiFlag").asString(""));

        WorkflowDefinitionService.ResolveDefinitionViewRequest initRequest = new WorkflowDefinitionService.ResolveDefinitionViewRequest();
        initRequest.setFormInitialization(true);
        ObjectNode initResponse = service.resolveDefinitionView("init-phase-rules", initRequest).orElseThrow();

        assertEquals("ready", initResponse.path("data").path("serverComputed").asString(""));
        assertEquals("always", initResponse.path("data").path("uiFlag").asString(""));
    }

    @Test
    void publishDefinition_rejectsRepeatWithMoreThanOneChild() throws Exception {
        JsonNode definition = objectMapper.readTree("""
                {
                  "controlSchema": {
                    "layout": [
                      {
                        "widget": "repeat",
                        "children": [
                          {"widget": "text", "stateKey": "a"},
                          {"widget": "text", "stateKey": "b"}
                        ]
                      }
                    ]
                  },
                  "dataSchema": {"type":"object"}
                }
                """);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.publishDefinition("repeat-shape", definition, "tester", "invalid")
        );

        assertTrue(ex.getMessage().contains("children must contain exactly one item for repeat widget"));
    }

    @Test
    void publishDefinition_rejectsRepeatWithSectionChild() throws Exception {
        JsonNode definition = objectMapper.readTree("""
                {
                  "controlSchema": {
                    "layout": [
                      {
                        "widget": "repeat",
                        "children": [
                          {
                            "widget": "section",
                            "children": [{"widget": "text", "stateKey": "x"}]
                          }
                        ]
                      }
                    ]
                  },
                  "dataSchema": {"type":"object"}
                }
                """);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.publishDefinition("repeat-child-widget", definition, "tester", "invalid")
        );

        assertTrue(ex.getMessage().contains("must be a group or scalar control for repeat widget"));
    }

    @Test
    void publishDefinition_rejectsUnregisteredStepType() throws Exception {
        JsonNode definition = objectMapper.readTree("""
                {
                  "steps": [
                    {"id": "s1", "type": "custom-step", "title": "Custom"}
                  ],
                  "dataSchema": {"type":"object"},
                  "controlSchema": {"layout": []}
                }
                """);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.publishDefinition("wf-unknown-step", definition, "tester", "unknown")
        );

        assertEquals("steps[0].type is not registered: custom-step", ex.getMessage());
    }

    @Test
    void publishDefinition_acceptsRegisteredStepTypes() throws Exception {
        when(workflowRepository.findByDefinitionKeyAndActiveTrue("wf-known-step-types")).thenReturn(Optional.empty());
        when(workflowRepository.save(Mockito.any(WorkflowDefinitionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        JsonNode definition = objectMapper.readTree("""
                {
                  "steps": [
                    {
                      "id": "s1",
                      "type": "form",
                      "title": "Form",
                      "config": {
                        "assigneeKind": "INTERNAL_USER",
                        "assigneeValue": "alice"
                      }
                    },
                    {"id": "s2", "type": "service", "title": "Service"},
                    {
                      "id": "s3",
                      "type": "decision",
                      "title": "Decision",
                      "config": {
                        "conditionJson": "{\\\"==\\\":[{\\\"var\\\":\\\"data.status\\\"},\\\"approved\\\"]}",
                        "action1Label": "Approve",
                        "action2Label": "Reject"
                      }
                    }
                  ],
                  "dataSchema": {"type":"object"},
                  "controlSchema": {"layout": []}
                }
                """);

        WorkflowDefinitionEntity published = service.publishDefinition("wf-known-step-types", definition, "tester", "known");
        assertEquals("wf-known-step-types", published.getDefinitionKey());
    }

    @Test
    void publishDefinition_rejectsFormStepWithInvalidAssigneeKind() throws Exception {
        JsonNode definition = objectMapper.readTree("""
                {
                  "steps": [
                    {
                      "id": "s1",
                      "type": "form",
                      "title": "Form",
                      "config": {
                        "assigneeKind": "BOGUS",
                        "assigneeValue": "user-1"
                      }
                    }
                  ],
                  "dataSchema": {"type":"object"},
                  "controlSchema": {"layout": []}
                }
                """);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.publishDefinition("wf-invalid-form-assignee", definition, "tester", "invalid")
        );

        assertTrue(ex.getMessage().contains("steps[0] assignee kind is invalid"));
    }

    @Test
    void publishDefinition_rejectsDecisionStepWithInvalidConditionJson() throws Exception {
        JsonNode definition = objectMapper.readTree("""
                {
                  "steps": [
                    {
                      "id": "s1",
                      "type": "decision",
                      "title": "Decision",
                      "config": {
                        "conditionJson": "{bad-json",
                        "action1Label": "Approve",
                        "action2Label": "Reject"
                      }
                    }
                  ],
                  "dataSchema": {"type":"object"},
                  "controlSchema": {"layout": []}
                }
                """);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.publishDefinition("wf-invalid-decision-condition", definition, "tester", "invalid")
        );

        assertTrue(ex.getMessage().contains("steps[0].config.conditionJson is invalid JSON"));
    }

    @Test
    void publishDefinition_acceptsDecisionStepWithLegacyConditionObject() throws Exception {
        when(workflowRepository.findByDefinitionKeyAndActiveTrue("wf-legacy-decision-condition")).thenReturn(Optional.empty());
        when(workflowRepository.save(Mockito.any(WorkflowDefinitionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        JsonNode definition = objectMapper.readTree("""
                {
                  "steps": [
                    {
                      "id": "s1",
                      "type": "decision",
                      "title": "Decision",
                      "condition": {"==": [{"var":"data.status"}, "approved"]},
                      "transitions": {
                        "output_1": "s2",
                        "output_2": "s3"
                      }
                    }
                  ],
                  "dataSchema": {"type":"object"},
                  "controlSchema": {"layout": []}
                }
                """);

        WorkflowDefinitionEntity published = service.publishDefinition("wf-legacy-decision-condition", definition, "tester", "legacy");
        assertEquals("wf-legacy-decision-condition", published.getDefinitionKey());
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
