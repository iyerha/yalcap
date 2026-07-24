package com.yalcap.security;

import java.util.Map;

public class SubjectProviderRegistry {

    private final Map<String, SubjectProvider> providers;

    public SubjectProviderRegistry(Map<String, SubjectProvider> providers) {
        this.providers = Map.copyOf(providers);
    }

    public SubjectProvider getRequired(String providerKey) {
        SubjectProvider provider = providers.get(providerKey);
        if (provider == null) {
            throw new IllegalStateException("SubjectProvider bean not found for key '" + providerKey + "'");
        }
        return provider;
    }
}