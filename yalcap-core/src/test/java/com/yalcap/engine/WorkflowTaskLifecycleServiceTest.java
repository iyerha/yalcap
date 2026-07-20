package com.yalcap.engine;

import com.yalcap.definition.form.load.FormLoadDataContext;
import com.yalcap.definition.form.load.FormLoadDataHydrationService;
import com.yalcap.definition.form.load.FormLoadDataPhase;
import com.yalcap.definition.form.load.FormLoadDataProvider;
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
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

            @Override
            public boolean supportsPhase(FormLoadDataPhase phase) {
                return phase == FormLoadDataPhase.PRE_TASK_CREATE;
            }

            @Override
            public ObjectNode load(FormLoadDataContext context) {
                ObjectNode node = objectMapper.createObjectNode();
                node.put("riskLevel", "LOW");
                return node;
            }
        };

        FormLoadDataHydrationService hydrationService = new FormLoadDataHydrationService(List.of(provider), objectMapper);
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
}