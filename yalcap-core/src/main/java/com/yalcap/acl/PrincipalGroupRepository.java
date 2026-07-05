package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface PrincipalGroupRepository extends CrudRepository<PrincipalGroupEntity, UUID> {
    Optional<PrincipalGroupEntity> findByGroupKey(String groupKey);
}
