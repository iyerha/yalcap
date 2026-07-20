package com.yalcap.acl;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends CrudRepository<UserEntity, UUID> {

    Optional<UserEntity> findByTenantIdAndUserKey(UUID tenantId, String userKey);

    Optional<UserEntity> findByTenantIdAndLoginName(UUID tenantId, String loginName);

    Optional<UserEntity> findByTenantIdAndPrimaryEmail(UUID tenantId, String primaryEmail);

    Optional<UserEntity> findByTenantIdAndSourceTypeAndExternalRef(UUID tenantId,
                                                                   String sourceType,
                                                                   String externalRef);
}