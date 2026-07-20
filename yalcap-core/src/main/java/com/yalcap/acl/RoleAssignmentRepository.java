package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface RoleAssignmentRepository extends CrudRepository<RoleAssignmentEntity, UUID> {
    List<RoleAssignmentEntity> findBySubjectTypeAndSubjectKey(String subjectType, String subjectKey);
}
