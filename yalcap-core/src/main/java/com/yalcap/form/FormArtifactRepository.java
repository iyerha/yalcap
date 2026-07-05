package com.yalcap.form;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FormArtifactRepository extends CrudRepository<FormArtifactEntity, UUID> {

    Optional<FormArtifactEntity> findByFormKeyAndActiveTrue(String formKey);

    Optional<FormArtifactEntity> findByFormKeyAndVersionNumber(String formKey, Integer versionNumber);

    List<FormArtifactEntity> findByFormKeyOrderByVersionNumberDesc(String formKey);
}
