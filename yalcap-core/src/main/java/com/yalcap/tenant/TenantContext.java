package com.yalcap.tenant;

import java.util.UUID;
import java.util.Optional;

public final class TenantContext {
    private static final ScopedValue<UUID> TENANT_ID = ScopedValue.newInstance();

    private TenantContext() {}

    public static boolean isBound() {
        return TENANT_ID.isBound();
    }

    public static Optional<UUID> getTenantId() {
        return isBound() ? Optional.of(TENANT_ID.get()) : Optional.empty();
    }

    public static UUID requireTenantId() {
        if (!isBound()) {
            throw new IllegalStateException("Tenant ID not set in context");
        }
        return TENANT_ID.get();
    }

    public static void runWithTenantId(UUID tenantId, Runnable action) {
        ScopedValue.where(TENANT_ID, tenantId).run(action);
    }

    public static <T, X extends Throwable> T callWithTenantId(UUID tenantId, ScopedValue.CallableOp<T, X> action) throws X {
        return ScopedValue.where(TENANT_ID, tenantId).call(action);
    }
}
