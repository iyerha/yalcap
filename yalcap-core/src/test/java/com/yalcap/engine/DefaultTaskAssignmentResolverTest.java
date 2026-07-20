package com.yalcap.engine;

import com.yalcap.acl.external.ExternalParticipantEntity;
import com.yalcap.acl.external.ExternalParticipantRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

class DefaultTaskAssignmentResolverTest {

    private final ExternalParticipantRepository repository = Mockito.mock(ExternalParticipantRepository.class);
    private final DefaultTaskAssignmentResolver resolver = new DefaultTaskAssignmentResolver(repository);

    @Test
    void resolvesInternalUserWithoutRepositoryLookup() {
        UUID tenantId = UUID.randomUUID();
        TaskAssignmentResolution resolution = resolver.resolve(
                tenantId,
                new TaskAssignmentIntent(TaskAssigneeKind.INTERNAL_USER, "alice")
        );

        assertEquals(AssigneeType.USER, resolution.assigneeType());
        assertEquals("alice", resolution.assigneeId());
        assertEquals(null, resolution.deliveryEmail());
    }

    @Test
    void resolvesExternalEmailByCreatingParticipantWhenMissing() {
        UUID tenantId = UUID.randomUUID();
        ExternalParticipantEntity participant = new ExternalParticipantEntity();
        participant.setId(UUID.randomUUID());
        participant.setTenantId(tenantId);
        participant.setPrimaryEmail("vendor@example.com");
        when(repository.findByTenantIdAndPrimaryEmail(tenantId, "vendor@example.com")).thenReturn(java.util.Optional.empty());
        when(repository.save(Mockito.any(ExternalParticipantEntity.class))).thenReturn(participant);

        TaskAssignmentResolution resolution = resolver.resolve(
                tenantId,
                new TaskAssignmentIntent(TaskAssigneeKind.EXTERNAL_EMAIL, "Vendor@Example.com")
        );

        assertEquals(AssigneeType.EXTERNAL_PARTICIPANT, resolution.assigneeType());
        assertNotNull(resolution.assigneeId());
        assertEquals("vendor@example.com", resolution.deliveryEmail());
    }

    @Test
    void rejectsInvalidExternalEmail() {
        UUID tenantId = UUID.randomUUID();

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> resolver.resolve(tenantId, new TaskAssignmentIntent(TaskAssigneeKind.EXTERNAL_EMAIL, "invalid-email"))
        );

        assertEquals("External assignee email is invalid", ex.getMessage());
    }
}