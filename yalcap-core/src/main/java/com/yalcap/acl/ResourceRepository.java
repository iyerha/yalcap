package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ResourceRepository extends CrudRepository<ResourceEntity, UUID> {
    Optional<ResourceEntity> findByResourceTypeAndResourceKey(String resourceType, String resourceKey);
    List<ResourceEntity> findByProjectIdAndResourceType(UUID projectId, String resourceType);
}
