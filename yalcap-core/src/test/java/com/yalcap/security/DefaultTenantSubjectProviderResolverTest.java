package com.yalcap.security;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DefaultTenantSubjectProviderResolverTest {

    private final SubjectProvider defaultProvider = new StubSubjectProvider();
    private final SubjectProvider tenantProvider = new StubSubjectProvider();

    @Test
    void returnsTenantMappedProviderWhenMappingExists() {
        UUID tenantId = UUID.randomUUID();
        TenantSubjectProviderResolver resolver = new DefaultTenantSubjectProviderResolver(
                new SubjectProviderRegistry(Map.of(
                        "acl", defaultProvider,
                        "custom", tenantProvider
                )),
                new SubjectProviderProperties("acl", Map.of(tenantId, "custom"))
        );

        SubjectProvider resolved = resolver.resolve(tenantId);

        assertSame(tenantProvider, resolved);
    }

    @Test
    void returnsDefaultProviderWhenTenantMappingMissing() {
        TenantSubjectProviderResolver resolver = new DefaultTenantSubjectProviderResolver(
                new SubjectProviderRegistry(Map.of("acl", defaultProvider)),
                new SubjectProviderProperties("acl", Map.of())
        );

        SubjectProvider resolved = resolver.resolve(UUID.randomUUID());

        assertSame(defaultProvider, resolved);
    }

    @Test
    void returnsDefaultProviderForNullTenantId() {
        TenantSubjectProviderResolver resolver = new DefaultTenantSubjectProviderResolver(
                new SubjectProviderRegistry(Map.of("acl", defaultProvider)),
                new SubjectProviderProperties("acl", Map.of())
        );

        SubjectProvider resolved = resolver.resolve(null);

        assertSame(defaultProvider, resolved);
    }

    @Test
    void throwsClearErrorWhenDefaultProviderCannotBeResolved() {
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> new DefaultTenantSubjectProviderResolver(
                        new SubjectProviderRegistry(Map.of("custom", tenantProvider)),
                        new SubjectProviderProperties("missing", Map.of())
                )
        );

        assertEquals("SubjectProvider bean not found for key 'missing'", ex.getMessage());
    }

    private static final class StubSubjectProvider implements SubjectProvider {

        @Override
        public Optional<SubjectIdentity> resolveSubject(SubjectReference subject, SubjectRequestContext requestContext) {
            return Optional.empty();
        }

        @Override
        public List<SubjectSearchResult> searchSubjects(SubjectSearchQuery query, SubjectRequestContext requestContext) {
            return List.of();
        }

        @Override
        public SubjectValidationResult validateSubject(SubjectReference subject, SubjectRequestContext requestContext) {
            return new SubjectValidationResult(subject, false, "stub");
        }
    }
}