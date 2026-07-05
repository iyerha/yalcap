package com.yalcap.persistence;

import java.util.UUID;

public interface TenantAware {
    UUID getTenantId();
    void setTenantId(UUID tenantId);
}
