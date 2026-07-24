package com.yalcap.security;

import org.jspecify.annotations.Nullable;

import java.util.UUID;

public interface TenantSubjectProviderResolver {

    SubjectProvider resolve(@Nullable UUID tenantId);
}