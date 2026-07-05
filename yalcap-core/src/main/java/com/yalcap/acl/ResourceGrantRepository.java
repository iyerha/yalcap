package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface ResourceGrantRepository extends CrudRepository<ResourceGrantEntity, UUID> {
    List<ResourceGrantEntity> findByResourceIdAndPrincipalTypeAndPrincipalKey(UUID resourceId, String principalType, String principalKey);
}
