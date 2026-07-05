package com.yalcap.persistence;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface AssignmentRepository extends CrudRepository<AssignmentEntity, UUID> {
    List<AssignmentEntity> findByInstanceIdAndActiveTrue(UUID instanceId);
}
