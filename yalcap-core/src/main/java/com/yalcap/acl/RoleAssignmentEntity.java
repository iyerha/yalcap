package com.yalcap.acl;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import com.yalcap.persistence.TenantAware;

import java.time.OffsetDateTime;
import java.util.UUID;

@Table("role_assignment")
public class RoleAssignmentEntity implements TenantAware {

    @Id
    private UUID id;

    @Column("tenant_id")
    private UUID tenantId;

    @Column("scope_resource_id")
    private UUID scopeResourceId;

    @Column("principal_type")
    private String principalType;

    @Column("principal_key")
    private String principalKey;

    @Column("role_id")
    private UUID roleId;

    @Column("granted_by")
    private String grantedBy;

    @Column("granted_at")
    private OffsetDateTime grantedAt;

    @Column("expires_at")
    private OffsetDateTime expiresAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public UUID getScopeResourceId() {
        return scopeResourceId;
    }

    public void setScopeResourceId(UUID scopeResourceId) {
        this.scopeResourceId = scopeResourceId;
    }

    public String getPrincipalType() {
        return principalType;
    }

    public void setPrincipalType(String principalType) {
        this.principalType = principalType;
    }

    public String getPrincipalKey() {
        return principalKey;
    }

    public void setPrincipalKey(String principalKey) {
        this.principalKey = principalKey;
    }

    public UUID getRoleId() {
        return roleId;
    }

    public void setRoleId(UUID roleId) {
        this.roleId = roleId;
    }

    public String getGrantedBy() {
        return grantedBy;
    }

    public void setGrantedBy(String grantedBy) {
        this.grantedBy = grantedBy;
    }

    public OffsetDateTime getGrantedAt() {
        return grantedAt;
    }

    public void setGrantedAt(OffsetDateTime grantedAt) {
        this.grantedAt = grantedAt;
    }

    public OffsetDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(OffsetDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }
}
