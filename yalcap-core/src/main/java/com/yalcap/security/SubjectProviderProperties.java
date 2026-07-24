package com.yalcap.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Map;
import java.util.UUID;

@ConfigurationProperties(prefix = "yalcap.security.subject-provider")
public record SubjectProviderProperties(
        String defaultProviderKey,
        Map<UUID, String> tenantProviderKeys
) {
    public SubjectProviderProperties {
        defaultProviderKey = (defaultProviderKey == null || defaultProviderKey.isBlank()) ? "acl" : defaultProviderKey;
        tenantProviderKeys = tenantProviderKeys == null ? Map.of() : Map.copyOf(tenantProviderKeys);
    }
}