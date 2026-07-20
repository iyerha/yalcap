package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends CrudRepository<RoleEntity, UUID> {
    Optional<RoleEntity> findByRoleKey(String roleKey);
}