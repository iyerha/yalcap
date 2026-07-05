package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface RolePermissionRepository extends CrudRepository<RolePermissionEntity, UUID> {
    List<RolePermissionEntity> findByRoleId(UUID roleId);
}
