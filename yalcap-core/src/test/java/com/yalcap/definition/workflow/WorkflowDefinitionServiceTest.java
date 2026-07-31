package com.yalcap.definition.workflow;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import com.yalcap.definition.form.load.FormLoadDataService;
import com.yalcap.asset.AssetStorageService;
import com.yalcap.definition.WorkflowDefinitionService;
import com.yalcap.definition.form.DefinitionFilesystem;
import com.yalcap.definition.workflow.step.DecisionStepType;
import com.yalcap.definition.workflow.step.FormStepType;
import com.yalcap.definition.workflow.step.ServiceStepType;
import com.yalcap.definition.workflow.step.StepTypeRegistry;
import com.yalcap.tenant.TenantContext;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.context.ApplicationEventPublisher;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowDefinitionServiceTest {
    private static final UUID TENANT_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final DefinitionFilesystem definitionFilesystem = Mockito.mock(DefinitionFilesystem.class);
    private final WorkflowDefinitionRepository workflowRepository = Mockito.mock(WorkflowDefinitionRepository.class);
    private final AssetStorageService assetStorageService = Mockito.mock(AssetStorageService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final FormLoadDataService hydrationService = new FormLoadDataService(List.of(), objectMapper);
    private final StepTypeRegistry stepTypeRegistry = new StepTypeRegistry(List.of(
        new FormStepType(),
        new ServiceStepType(),
        new DecisionStepType()
    ));
    private final ApplicationEventPublisher eventPublisher = Mockito.mock(ApplicationEventPublisher.class);

    private WorkflowDefinitionService service;

    @BeforeEach
    void setUp() throws Exception {
        // Mock static TenantContext - keep it active for entire test
        mockStatic(TenantContext.class);
        when(TenantContext.getTenantId()).thenReturn(Optional.of(TENANT_ID));
        
        service = new WorkflowDefinitionService(
            definitionFilesystem,
            workflowRepository,
            stepTypeRegistry,
            new WorkflowRuleEngine(objectMapper),
            hydrationService,
            assetStorageService,
            objectMapper,
            eventPublisher
        );
    }

@Test
void resolveDefinitionView_filtersLayoutAndDataByVisibilityAndReadabilityRules() throws Exception {
    when(workflowRepository.findActiveByDefinitionKey("sample")).thenReturn(Optional.empty());
    when(workflowRepository.save(any(WorkflowDefinitionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    String yamlDefinition = """
            id: sample
            controlSchema:
              layout:
                - stateKey: applicantName
                  pointer: '#/properties/applicantName'
                  widget: text
                - stateKey: secretCode
                  pointer: '#/properties/secretCode'
                  widget: text
                - stateKey: publicNote
                  pointer: '#/properties/publicNote'
                  widget: text
            rules:
              - id: r-hide-applicant
                scope: step
                target: applicantName
                effect: visible
                value: false
                when:
                  fact: workflow.stepId
                  op: eq
                  value: review
              - id: r-hide-secret
                scope: form
                target: secretCode
                effect: readable
                value: false
            """;

    WorkflowDefinitionEntity entity = service.publishDefinition("sample", yamlDefinition, "tester", "initial");
    when(workflowRepository.findActiveByDefinitionKey("sample")).thenReturn(Optional.of(entity));

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
    void publishDefinition_acceptsRegisteredStepTypes() throws Exception {
        when(workflowRepository.findActiveByDefinitionKey("wf-known-step-types")).thenReturn(Optional.empty());
        when(workflowRepository.save(any(WorkflowDefinitionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String yamlDefinition = """
                steps:
                  - id: s1
                    type: form
                    title: Form
                    assignment:
                      kind: user
                      value: alice
                    access:
                      groups: []
                      users: []
                    ui:
                      pointer: '#/properties/formData'
                    routing:
                      transitions:
                        next: s2
                dataSchema:
                  type: object
                controlSchema:
                  layout: []
                """;

        WorkflowDefinitionEntity published = service.publishDefinition("wf-known-step-types", yamlDefinition, "tester", "known");
        assertEquals("wf-known-step-types", published.getDefinitionKey());
    }

    @Test
    void publishDefinition_rejectsUnregisteredStepType() throws Exception {
        String yamlDefinition = """
                steps:
                  - id: s1
                    type: custom-step
                    title: Custom
                    assignment:
                      kind: user
                      value: alice
                    access:
                      groups: []
                      users: []
                    ui:
                      pointer: '#/properties/data'
                    routing:
                      transitions:
                        next: s2
                dataSchema:
                  type: object
                controlSchema:
                  layout: []
                """;

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> service.publishDefinition("wf-unknown-step", yamlDefinition, "tester", "unknown")
        );

        assertTrue(ex.getMessage().contains("custom-step"));
    }
}