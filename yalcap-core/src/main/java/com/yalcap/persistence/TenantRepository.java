package com.yalcap.persistence;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface TenantRepository extends CrudRepository<TenantEntity, UUID> {
    Optional<TenantEntity> findByTenantKey(String tenantKey);
}