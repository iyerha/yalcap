package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface GroupRepository extends CrudRepository<GroupEntity, UUID> {
    Optional<GroupEntity> findByGroupKey(String groupKey);
}