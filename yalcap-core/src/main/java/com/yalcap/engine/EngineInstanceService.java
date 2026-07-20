package com.yalcap.engine;

import com.yalcap.definition.form.load.FormLoadDataContext;
import com.yalcap.definition.form.load.FormLoadDataHydrationService;
import com.yalcap.definition.form.load.FormLoadDataPhase;
import com.yalcap.persistence.WorkflowInstanceEntity;
import com.yalcap.persistence.WorkflowInstanceRepository;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class EngineInstanceService {

    private final WorkflowInstanceRepository workflowInstanceRepository;
    private final FormLoadDataHydrationService formLoadDataHydrationService;
    private final WorkflowTaskLifecycleService workflowTaskLifecycleService;
    private final ObjectMapper objectMapper;

    public EngineInstanceService(WorkflowInstanceRepository workflowInstanceRepository,
                                 FormLoadDataHydrationService formLoadDataHydrationService,
                                 WorkflowTaskLifecycleService workflowTaskLifecycleService,
                                 ObjectMapper objectMapper) {
        this.workflowInstanceRepository = workflowInstanceRepository;
        this.formLoadDataHydrationService = formLoadDataHydrationService;
        this.workflowTaskLifecycleService = workflowTaskLifecycleService;
        this.objectMapper = objectMapper;
    }

    public EngineInstance getInstance(UUID instanceId) {
        WorkflowInstanceEntity entity = loadInstance(instanceId);
        Map<String, Object> data = objectMapper.convertValue(asObjectNode(entity.getData()), Map.class);
        return new EngineInstance(
                entity.getId(),
                entity.getDefinitionId(),
                data,
                entity.getCurrentStep(),
                entity.getStatus(),
                entity.getAssignee()
        );
    }

    public FormLoadResult openForm(FormLoadCommand command) {
        WorkflowInstanceEntity instance = loadInstance(command.instanceId());
        ObjectNode instanceData = asObjectNode(instance.getData()).deepCopy();
        ObjectNode mergedInput = mergeData(instanceData, asObjectNode(command.inputData()));

        ObjectNode hydratedData = formLoadDataHydrationService.hydrate(
                new FormLoadDataContext(
                        command.definitionKey(),
                        command.stepId(),
                        command.actorId(),
                        command.actorGroups(),
                        instance.getTenantId(),
                        mergedInput.deepCopy(),
                        FormLoadDataPhase.FORM_OPEN
                )
        );

        return new FormLoadResult(mergeData(mergedInput, hydratedData));
    }

    public WorkflowTaskLifecycleService.CreateTaskResult createUserTask(WorkflowTaskLifecycleService.CreateTaskCommand command) {
        return workflowTaskLifecycleService.createUserTask(command);
    }

    public WorkflowTaskLifecycleService.CompleteTaskResult completeUserTask(WorkflowTaskLifecycleService.CompleteTaskCommand command) {
        return workflowTaskLifecycleService.completeUserTask(command);
    }

    private WorkflowInstanceEntity loadInstance(UUID instanceId) {
        return workflowInstanceRepository.findById(instanceId)
                .orElseThrow(() -> new IllegalArgumentException("Workflow instance not found: " + instanceId));
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

    public record FormLoadCommand(
            UUID instanceId,
            String definitionKey,
            String stepId,
            String actorId,
            List<String> actorGroups,
            @Nullable ObjectNode inputData
    ) {
        public FormLoadCommand {
            actorGroups = actorGroups == null ? List.of() : List.copyOf(actorGroups);
            inputData = inputData == null ? null : inputData.deepCopy();
        }
    }

    public record FormLoadResult(ObjectNode data) {
    }
}