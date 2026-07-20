package com.yalcap.acl.external;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface ExternalParticipantRepository extends CrudRepository<ExternalParticipantEntity, UUID> {

    Optional<ExternalParticipantEntity> findByTenantIdAndPrimaryEmail(UUID tenantId, String primaryEmail);
}