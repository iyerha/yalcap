package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends CrudRepository<ProjectEntity, UUID> {
    Optional<ProjectEntity> findByProjectKey(String projectKey);
}
