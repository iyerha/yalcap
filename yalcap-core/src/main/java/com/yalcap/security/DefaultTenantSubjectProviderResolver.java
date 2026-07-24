package com.yalcap.security;

import org.jspecify.annotations.Nullable;

import java.util.UUID;

public class DefaultTenantSubjectProviderResolver implements TenantSubjectProviderResolver {

    private final SubjectProviderRegistry registry;
    private final SubjectProviderProperties properties;
    private final SubjectProvider defaultProvider;

    public DefaultTenantSubjectProviderResolver(SubjectProviderRegistry registry,
                                                SubjectProviderProperties properties) {
        this.registry = registry;
        this.properties = properties;
        this.defaultProvider = registry.getRequired(properties.defaultProviderKey());
    }

    @Override
    public SubjectProvider resolve(@Nullable UUID tenantId) {
        if (tenantId == null) {
            return defaultProvider;
        }

        String providerKey = properties.tenantProviderKeys().get(tenantId);
        if (providerKey == null || providerKey.isBlank()) {
            return defaultProvider;
        }

        return registry.getRequired(providerKey);
    }
}