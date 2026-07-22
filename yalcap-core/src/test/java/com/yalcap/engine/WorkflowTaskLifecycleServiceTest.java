package com.yalcap.engine;

import com.yalcap.definition.form.load.FormLoadDataContext;
import com.yalcap.definition.form.load.FormLoadDataService;
import com.yalcap.definition.form.load.FormLoadDataPhase;
import com.yalcap.definition.form.load.FormLoadDataProvider;
import com.yalcap.definition.form.load.FormLoadPhaseHandler;
import com.yalcap.persistence.AssignmentEntity;
import com.yalcap.persistence.AssignmentRepository;
import com.yalcap.persistence.EventEntity;
import com.yalcap.persistence.EventRepository;
import com.yalcap.persistence.WorkflowInstanceEntity;
import com.yalcap.persistence.WorkflowInstanceRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class WorkflowTaskLifecycleServiceTest {

    private final WorkflowInstanceRepository workflowInstanceRepository = Mockito.mock(WorkflowInstanceRepository.class);
    private final AssignmentRepository assignmentRepository = Mockito.mock(AssignmentRepository.class);
    private final EventRepository eventRepository = Mockito.mock(EventRepository.class);
    private final TaskAssignmentResolver assignmentResolver = Mockito.mock(TaskAssignmentResolver.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void createUserTaskInvokesPreTaskCreatePhaseAndPersistsAssignmentAndEvent() {
        FormLoadDataProvider provider = new FormLoadDataProvider() {
            @Override
            public String id() {
                return "pre-create-provider";
            }

            @FormLoadPhaseHandler(FormLoadDataPhase.PRE_TASK_CREATE)
            public ObjectNode onPreTaskCreate(FormLoadDataContext context) {
                ObjectNode node = objectMapper.createObjectNode();
                node.put("riskLevel", "LOW");
                return node;
            }
        };

        FormLoadDataService hydrationService = new FormLoadDataService(List.of(provider), objectMapper);
        WorkflowTaskLifecycleService service = new WorkflowTaskLifecycleService(
                workflowInstanceRepository,
                assignmentRepository,
                eventRepository,
                assignmentResolver,
                hydrationService,
                objectMapper
        );

        UUID instanceId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        WorkflowInstanceEntity instance = new WorkflowInstanceEntity();
        instance.setId(instanceId);
        instance.setTenantId(tenantId);
        instance.setData(objectMapper.createObjectNode());

        when(workflowInstanceRepository.findById(instanceId)).thenReturn(Optional.of(instance));
        when(workflowInstanceRepository.save(any(WorkflowInstanceEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(assignmentRepository.save(any(AssignmentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(eventRepository.save(any(EventEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(assignmentResolver.resolve(any(UUID.class), any(TaskAssignmentIntent.class)))
            .thenReturn(new TaskAssignmentResolution(AssigneeType.USER, "alice", null));

        WorkflowTaskLifecycleService.CreateTaskResult result = service.createUserTask(
                new WorkflowTaskLifecycleService.CreateTaskCommand(
                        instanceId,
                        "purchase-request",
                        "review",
                        new TaskAssignmentIntent(TaskAssigneeKind.INTERNAL_USER, "alice"),
                        "system",
                        ActorType.SYSTEM,
                        List.of("ops")
                )
        );

                assertEquals(AssigneeType.USER, result.assigneeType());
        assertEquals("alice", result.assigneeId());
        assertEquals("LOW", result.data().path("riskLevel").asString());

        ArgumentCaptor<AssignmentEntity> assignmentCaptor = ArgumentCaptor.forClass(AssignmentEntity.class);
        Mockito.verify(assignmentRepository).save(assignmentCaptor.capture());
        assertEquals("review", assignmentCaptor.getValue().getStepId());
        assertEquals("USER", assignmentCaptor.getValue().getAssigneeType());
        assertTrue(assignmentCaptor.getValue().isActive());

        ArgumentCaptor<EventEntity> eventCaptor = ArgumentCaptor.forClass(EventEntity.class);
        Mockito.verify(eventRepository).save(eventCaptor.capture());
        assertEquals("TASK_CREATED", eventCaptor.getValue().getEventType());
        assertEquals("review", eventCaptor.getValue().getStepId());
    }

    @Test
    void completeUserTask_preservesArraySubmissionAndCompletesMatchingAssignments() {
        FormLoadDataProvider provider = new FormLoadDataProvider() {
            @Override
            public String id() {
                return "pre-complete-provider";
            }

            @FormLoadPhaseHandler(FormLoadDataPhase.PRE_TASK_COMPLETE)
            public ObjectNode onPreTaskComplete(FormLoadDataContext context) {
                ObjectNode node = objectMapper.createObjectNode();
                node.put("approvedBy", "manager-1");
                return node;
            }
        };

        FormLoadDataService hydrationService = new FormLoadDataService(List.of(provider), objectMapper);
        WorkflowTaskLifecycleService service = new WorkflowTaskLifecycleService(
                workflowInstanceRepository,
                assignmentRepository,
                eventRepository,
                assignmentResolver,
                hydrationService,
                objectMapper
        );

        UUID instanceId = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        WorkflowInstanceEntity instance = new WorkflowInstanceEntity();
        instance.setId(instanceId);
        instance.setTenantId(tenantId);

        ObjectNode existingData = objectMapper.createObjectNode();
        existingData.put("title", "Quarterly Review");
        existingData.putArray("tags").add("legacy");
        instance.setData(existingData);

        AssignmentEntity reviewAssignment = new AssignmentEntity();
        reviewAssignment.setId(UUID.randomUUID());
        reviewAssignment.setInstanceId(instanceId);
        reviewAssignment.setStepId("review");
        reviewAssignment.setActive(true);

        AssignmentEntity otherStepAssignment = new AssignmentEntity();
        otherStepAssignment.setId(UUID.randomUUID());
        otherStepAssignment.setInstanceId(instanceId);
        otherStepAssignment.setStepId("archive");
        otherStepAssignment.setActive(true);

        when(workflowInstanceRepository.findById(instanceId)).thenReturn(Optional.of(instance));
        when(workflowInstanceRepository.save(any(WorkflowInstanceEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(assignmentRepository.findByInstanceIdAndActiveTrue(instanceId)).thenReturn(List.of(reviewAssignment, otherStepAssignment));
        when(assignmentRepository.save(any(AssignmentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(eventRepository.save(any(EventEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ObjectNode submittedData = objectMapper.createObjectNode();
        ArrayNode submittedTags = submittedData.putArray("tags");
        submittedTags.add("alpha");
        submittedTags.add("beta");
        ArrayNode submittedCountries = submittedData.putArray("countries");
        submittedCountries.add("us");
        submittedCountries.add("ca");

        WorkflowTaskLifecycleService.CompleteTaskResult result = service.completeUserTask(
                new WorkflowTaskLifecycleService.CompleteTaskCommand(
                        instanceId,
                        "purchase-request",
                        "review",
                        "system",
                        ActorType.SYSTEM,
                        List.of("ops"),
                        submittedData
                )
        );

        assertEquals(1, result.completedAssignmentCount());
        assertEquals("Quarterly Review", result.data().path("title").asString());
        assertEquals("manager-1", result.data().path("approvedBy").asString());
        assertTrue(result.data().path("tags").isArray());
        assertEquals(2, result.data().path("tags").size());
        assertEquals("alpha", result.data().path("tags").get(0).asString());
        assertEquals("beta", result.data().path("tags").get(1).asString());
        assertTrue(result.data().path("countries").isArray());
        assertEquals("us", result.data().path("countries").get(0).asString());
        assertEquals("ca", result.data().path("countries").get(1).asString());

        assertFalse(reviewAssignment.isActive());
        assertTrue(otherStepAssignment.isActive());

        ArgumentCaptor<EventEntity> eventCaptor = ArgumentCaptor.forClass(EventEntity.class);
        Mockito.verify(eventRepository).save(eventCaptor.capture());
        assertEquals("TASK_COMPLETED", eventCaptor.getValue().getEventType());
        assertTrue(eventCaptor.getValue().getPayload().path("tags").isArray());
        assertEquals("alpha", eventCaptor.getValue().getPayload().path("tags").get(0).asString());
    }
}