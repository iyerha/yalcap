package com.yalcap.persistence;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends CrudRepository<DocumentEntity, UUID> {
    List<DocumentEntity> findByInstanceIdOrderByUploadedAtDesc(UUID instanceId);
}
