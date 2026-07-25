package com.yalcap.definition.workflow;

import org.springframework.stereotype.Component;

import com.yalcap.definition.WorkflowSearchSchemaReader;

@Component
class WorkflowSearchSchemaReaderImpl implements WorkflowSearchSchemaReader {

    private final WorkflowDefinitionRepository repository;

    WorkflowSearchSchemaReaderImpl(WorkflowDefinitionRepository repository) {
        this.repository = repository;
    }

    @Override
    public WorkflowSearchSchemaSnapshot findActiveByDefinitionKey(String definitionKey) {
        return repository.findActiveByDefinitionKey(definitionKey)
                .map(entity -> new WorkflowSearchSchemaSnapshot(
                        entity.getDefinitionKey(),
                        entity.getVersionNumber(),
                        entity.getDefinition()
                ))
                .orElse(null);
    }
}
