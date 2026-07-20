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

    @Column("subject_type")
    private String subjectType;

    @Column("subject_key")
    private String subjectKey;

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

    public String getSubjectType() {
        return subjectType;
    }

    public SubjectType getSubjectTypeValue() {
        return SubjectType.valueOf(subjectType);
    }

    public void setSubjectType(String subjectType) {
        this.subjectType = subjectType;
    }

    public void setSubjectType(SubjectType subjectType) {
        this.subjectType = subjectType.name();
    }

    public String getSubjectKey() {
        return subjectKey;
    }

    public void setSubjectKey(String subjectKey) {
        this.subjectKey = subjectKey;
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
