package com.yalcap.tenant;

import java.util.Optional;
import java.util.UUID;

public final class TenantContext {
    private static final ThreadLocal<UUID> TL = new ThreadLocal<>();

    private TenantContext() {}

    public static void setTenantId(UUID id) { TL.set(id); }
    public static Optional<UUID> getTenantId() { return Optional.ofNullable(TL.get()); }
    public static UUID requireTenantId() {
        return getTenantId().orElseThrow(() -> new IllegalStateException("Tenant ID not set in context"));
    }
    public static void clear() { TL.remove(); }
}
