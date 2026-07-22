package com.yalcap.engine;

import com.yalcap.definition.form.load.FormLoadDataContext;
import com.yalcap.definition.form.load.FormLoadDataService;
import com.yalcap.definition.form.load.FormLoadDataPhase;
import com.yalcap.persistence.AssignmentEntity;
import com.yalcap.persistence.AssignmentRepository;
import com.yalcap.persistence.EventEntity;
import com.yalcap.persistence.EventRepository;
import com.yalcap.persistence.WorkflowInstanceEntity;
import com.yalcap.persistence.WorkflowInstanceRepository;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WorkflowTaskLifecycleService {

    private static final UUID DEFAULT_TENANT_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    private final WorkflowInstanceRepository workflowInstanceRepository;
    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final TaskAssignmentResolver taskAssignmentResolver;
    private final FormLoadDataService formLoadDataHydrationService;
    private final ObjectMapper objectMapper;

    public WorkflowTaskLifecycleService(WorkflowInstanceRepository workflowInstanceRepository,
                                        AssignmentRepository assignmentRepository,
                                        EventRepository eventRepository,
                                        TaskAssignmentResolver taskAssignmentResolver,
                                        FormLoadDataService formLoadDataHydrationService,
                                        ObjectMapper objectMapper) {
        this.workflowInstanceRepository = workflowInstanceRepository;
        this.assignmentRepository = assignmentRepository;
        this.eventRepository = eventRepository;
        this.taskAssignmentResolver = taskAssignmentResolver;
        this.formLoadDataHydrationService = formLoadDataHydrationService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CreateTaskResult createUserTask(CreateTaskCommand command) {
        WorkflowInstanceEntity instance = loadInstance(command.instanceId());
        UUID tenantId = resolveTenantId(instance.getTenantId());

        ObjectNode workingData = asObjectNode(instance.getData()).deepCopy();
        ObjectNode hydratedData = formLoadDataHydrationService.load(
                new FormLoadDataContext(
                        command.definitionKey(),
                        command.stepId(),
                        command.actorId(),
                        command.actorGroups(),
                        tenantId,
                        workingData.deepCopy(),
                        FormLoadDataPhase.PRE_TASK_CREATE
                )
        );

        ObjectNode mergedData = mergeData(workingData, hydratedData);
        instance.setData(mergedData);

        TaskAssignmentResolution resolution = taskAssignmentResolver.resolve(tenantId, command.assignmentIntent());
        instance.setAssignee(resolution.assigneeId());
        workflowInstanceRepository.save(instance);

        OffsetDateTime now = OffsetDateTime.now();
        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setId(UUID.randomUUID());
        assignment.setInstanceId(instance.getId());
        assignment.setStepId(command.stepId());
        assignment.setTenantId(tenantId);
        assignment.setAssigneeType(resolution.assigneeType().name());
        assignment.setAssigneeId(resolution.assigneeId());
        assignment.setActive(true);
        assignment.setAssignedAt(now);
        assignmentRepository.save(assignment);

        EventEntity createdEvent = new EventEntity();
        createdEvent.setId(UUID.randomUUID());
        createdEvent.setTenantId(tenantId);
        createdEvent.setInstanceId(instance.getId());
        createdEvent.setStepId(command.stepId());
        createdEvent.setEventType("TASK_CREATED");
        createdEvent.setActorId(command.actorId());
        createdEvent.setActorType(command.actorType().name());
        createdEvent.setPayload(createTaskPayload(resolution, mergedData));
        createdEvent.setCreatedAt(now);
        eventRepository.save(createdEvent);

        return new CreateTaskResult(
                assignment.getId(),
                resolution.assigneeType(),
                resolution.assigneeId(),
                resolution.deliveryEmail(),
                mergedData
        );
    }

    @Transactional
    public CompleteTaskResult completeUserTask(CompleteTaskCommand command) {
        WorkflowInstanceEntity instance = loadInstance(command.instanceId());
        UUID tenantId = resolveTenantId(instance.getTenantId());

        ObjectNode instanceData = asObjectNode(instance.getData()).deepCopy();
        ObjectNode submittedData = asObjectNode(command.submittedData()).deepCopy();
        ObjectNode mergedInput = mergeData(instanceData, submittedData);

        ObjectNode hydratedData = formLoadDataHydrationService.load(
                new FormLoadDataContext(
                        command.definitionKey(),
                        command.stepId(),
                        command.actorId(),
                        command.actorGroups(),
                        tenantId,
                        mergedInput.deepCopy(),
                        FormLoadDataPhase.PRE_TASK_COMPLETE
                )
        );

        ObjectNode finalData = mergeData(mergedInput, hydratedData);
        instance.setData(finalData);
        workflowInstanceRepository.save(instance);

        List<AssignmentEntity> activeAssignments = assignmentRepository.findByInstanceIdAndActiveTrue(command.instanceId());
        OffsetDateTime now = OffsetDateTime.now();
        int completedCount = 0;
        for (AssignmentEntity assignment : activeAssignments) {
            if (!command.stepId().equals(assignment.getStepId())) {
                continue;
            }

            assignment.setActive(false);
            assignment.setCompletedAt(now);
            assignmentRepository.save(assignment);
            completedCount += 1;
        }

        EventEntity completedEvent = new EventEntity();
        completedEvent.setId(UUID.randomUUID());
        completedEvent.setTenantId(tenantId);
        completedEvent.setInstanceId(instance.getId());
        completedEvent.setStepId(command.stepId());
        completedEvent.setEventType("TASK_COMPLETED");
        completedEvent.setActorId(command.actorId());
        completedEvent.setActorType(command.actorType().name());
        completedEvent.setPayload(finalData.deepCopy());
        completedEvent.setCreatedAt(now);
        eventRepository.save(completedEvent);

        return new CompleteTaskResult(completedCount, finalData);
    }

    private WorkflowInstanceEntity loadInstance(UUID instanceId) {
        return workflowInstanceRepository.findById(instanceId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow instance not found: " + instanceId));
    }

    private UUID resolveTenantId(@Nullable UUID tenantId) {
        return tenantId != null ? tenantId : DEFAULT_TENANT_ID;
    }

    private ObjectNode createTaskPayload(TaskAssignmentResolution resolution, ObjectNode mergedData) {
        ObjectNode payload = objectMapper.createObjectNode();
        payload.put("assigneeType", resolution.assigneeType().name());
        payload.put("assigneeId", resolution.assigneeId());
        if (resolution.deliveryEmail() != null && !resolution.deliveryEmail().isBlank()) {
            payload.put("deliveryEmail", resolution.deliveryEmail());
        }
        payload.set("data", mergedData.deepCopy());
        return payload;
    }

    private ObjectNode asObjectNode(@Nullable JsonNode node) {
        if (node == null || node.isNull() || !node.isObject()) {
            return objectMapper.createObjectNode();
        }
        return (ObjectNode) node;
    }

    private ObjectNode mergeData(ObjectNode base, ObjectNode contribution) {
        ObjectNode merged = base.deepCopy();
        merged.setAll(contribution);
        return merged;
    }

    public record CreateTaskCommand(
            UUID instanceId,
            String definitionKey,
            String stepId,
            TaskAssignmentIntent assignmentIntent,
            String actorId,
                ActorType actorType,
            List<String> actorGroups
    ) {
        public CreateTaskCommand {
            actorGroups = actorGroups == null ? List.of() : List.copyOf(actorGroups);
        }
    }

    public record CreateTaskResult(
            UUID assignmentId,
            AssigneeType assigneeType,
            String assigneeId,
            @Nullable String deliveryEmail,
            ObjectNode data
    ) {
    }

    public record CompleteTaskCommand(
            UUID instanceId,
            String definitionKey,
            String stepId,
            String actorId,
                ActorType actorType,
            List<String> actorGroups,
            @Nullable ObjectNode submittedData
    ) {
        public CompleteTaskCommand {
            actorGroups = actorGroups == null ? List.of() : List.copyOf(actorGroups);
            submittedData = submittedData == null ? null : submittedData.deepCopy();
        }
    }

    public record CompleteTaskResult(
            int completedAssignmentCount,
            ObjectNode data
    ) {
    }
}