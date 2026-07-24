package com.yalcap.security.adapter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.yalcap.acl.GroupRepository;
import com.yalcap.acl.UserEntity;
import com.yalcap.acl.UserRepository;
import com.yalcap.acl.external.ExternalParticipantRepository;
import com.yalcap.security.SubjectIdentity;
import com.yalcap.security.SubjectReference;
import com.yalcap.security.SubjectRequestContext;
import com.yalcap.security.SubjectType;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

class AclSubjectProviderAttributesTest {
        private final UserRepository userRepository = Mockito.mock(UserRepository.class);
    private final GroupRepository groupRepository = Mockito.mock(GroupRepository.class);
    private final ExternalParticipantRepository externalParticipantRepository = Mockito.mock(ExternalParticipantRepository.class);

    private final AclSubjectProvider provider = new AclSubjectProvider(
            userRepository,
            groupRepository,
            externalParticipantRepository,
            new ObjectMapper()
    );

    @Test
    void mapsUserAttributesJsonToSubjectIdentityAttributesMap() {
        UUID tenantId = UUID.randomUUID();

        ObjectNode attrs = JsonNodeFactory.instance.objectNode();
        attrs.put("department", "Finance");
        attrs.put("level", 4);

        UserEntity user = new UserEntity();
        user.setTenantId(tenantId);
        user.setUserKey("alice");
        user.setDisplayName("Alice");
        user.setPrimaryEmail("alice@example.com");
        user.setAttributes(attrs);

        when(userRepository.findByTenantIdAndUserKey(tenantId, "alice"))
                .thenReturn(Optional.of(user));

        Optional<SubjectIdentity> result = provider.resolveSubject(
                new SubjectReference(SubjectType.USER, "alice"),
                new SubjectRequestContext(tenantId)
        );

        assertTrue(result.isPresent());
        assertEquals("Finance", result.get().attributes().get("department"));
        assertEquals(4, result.get().attributes().get("level"));
    }
}
