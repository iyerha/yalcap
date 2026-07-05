package com.yalcap.manifest;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkflowManifestRepository extends CrudRepository<WorkflowManifestEntity, UUID> {

    Optional<WorkflowManifestEntity> findByManifestKeyAndActiveTrue(String manifestKey);

    Optional<WorkflowManifestEntity> findByManifestKeyAndVersionNumber(String manifestKey, Integer versionNumber);

    List<WorkflowManifestEntity> findByManifestKeyOrderByVersionNumberDesc(String manifestKey);
}
