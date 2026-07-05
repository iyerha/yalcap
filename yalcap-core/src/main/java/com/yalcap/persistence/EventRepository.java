package com.yalcap.persistence;

import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface EventRepository extends CrudRepository<EventEntity, UUID> {
    List<EventEntity> findByInstanceIdOrderByCreatedAtAsc(UUID instanceId);
}
