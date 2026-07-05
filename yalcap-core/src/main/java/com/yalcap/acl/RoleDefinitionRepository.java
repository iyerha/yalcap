package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleDefinitionRepository extends CrudRepository<RoleDefinitionEntity, UUID> {
    Optional<RoleDefinitionEntity> findByRoleKey(String roleKey);
}
