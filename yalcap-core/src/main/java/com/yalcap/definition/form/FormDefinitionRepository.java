package com.yalcap.definition.form;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FormDefinitionRepository extends CrudRepository<FormDefinitionEntity, UUID> {

    Optional<FormDefinitionEntity> findByFormKeyAndActiveTrue(String formKey);

    Optional<FormDefinitionEntity> findByFormKeyAndVersionNumber(String formKey, Integer versionNumber);

    List<FormDefinitionEntity> findByFormKeyOrderByVersionNumberDesc(String formKey);
}