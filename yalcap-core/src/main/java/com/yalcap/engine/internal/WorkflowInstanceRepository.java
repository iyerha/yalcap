package com.yalcap.engine.internal;

import org.springframework.data.repository.CrudRepository;

import java.util.UUID;

public interface WorkflowInstanceRepository extends CrudRepository<WorkflowInstanceEntity, UUID> {

}
