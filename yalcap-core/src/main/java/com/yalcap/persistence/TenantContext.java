package com.yalcap.persistence;

import java.util.Optional;
import java.util.UUID;

public final class TenantContext {
    private static final ThreadLocal<UUID> TL = new ThreadLocal<>();

    private TenantContext() {}

    public static void setTenantId(UUID id) { TL.set(id); }
    public static Optional<UUID> getTenantId() { return Optional.ofNullable(TL.get()); }
    public static void clear() { TL.remove(); }
}
