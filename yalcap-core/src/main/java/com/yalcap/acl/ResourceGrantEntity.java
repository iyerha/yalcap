package com.yalcap.acl;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import com.yalcap.persistence.TenantAware;

import java.time.OffsetDateTime;
import java.util.UUID;

@Table("resource_grant")
public class ResourceGrantEntity implements TenantAware {

    @Id
    private UUID id;

    @Column("tenant_id")
    private UUID tenantId;

    @Column("resource_id")
    private UUID resourceId;

    @Column("subject_type")
    private String subjectType;

    @Column("subject_key")
    private String subjectKey;

    @Column("permission_key")
    private String permissionKey;

    private String effect;

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

    public UUID getResourceId() {
        return resourceId;
    }

    public void setResourceId(UUID resourceId) {
        this.resourceId = resourceId;
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

    public String getPermissionKey() {
        return permissionKey;
    }

    public void setPermissionKey(String permissionKey) {
        this.permissionKey = permissionKey;
    }

    public String getEffect() {
        return effect;
    }

    public void setEffect(String effect) {
        this.effect = effect;
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
