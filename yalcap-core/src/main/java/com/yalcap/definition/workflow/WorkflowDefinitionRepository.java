package com.yalcap.definition.workflow;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkflowDefinitionRepository extends CrudRepository<WorkflowDefinitionEntity, UUID> {

    Optional<WorkflowDefinitionEntity> findByDefinitionKeyAndActiveTrue(String definitionKey);

    Optional<WorkflowDefinitionEntity> findByDefinitionKeyAndVersionNumber(String definitionKey, Integer versionNumber);

    List<WorkflowDefinitionEntity> findByDefinitionKeyOrderByVersionNumberDesc(String definitionKey);
}