package com.yalcap.manifest;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import tools.jackson.databind.JsonNode;

import java.time.OffsetDateTime;
import java.util.UUID;

@Table("workflow_manifest")
public class WorkflowManifestEntity {

    @Id
    private UUID id;

    @Column("manifest_key")
    private String manifestKey;

    @Column("manifest")
    private JsonNode manifest;

    @Column("version_number")
    private Integer versionNumber;

    private Boolean active;

    @Column("tenant_id")
    private UUID tenantId;

    @Column("change_message")
    private String changeMessage;

    @Column("created_by")
    private String createdBy;

    @Column("created_at")
    private OffsetDateTime createdAt;

    public WorkflowManifestEntity() {}

    public WorkflowManifestEntity(UUID id,
                                  String manifestKey,
                                  JsonNode manifest,
                                  Integer versionNumber,
                                  Boolean active,
                                  UUID tenantId,
                                  String createdBy,
                                  String changeMessage) {
        this.id = id;
        this.manifestKey = manifestKey;
        this.manifest = manifest;
        this.versionNumber = versionNumber;
        this.active = active;
        this.tenantId = tenantId;
        this.createdBy = createdBy;
        this.changeMessage = changeMessage;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getManifestKey() {
        return manifestKey;
    }

    public void setManifestKey(String manifestKey) {
        this.manifestKey = manifestKey;
    }

    public JsonNode getManifest() {
        return manifest;
    }

    public void setManifest(JsonNode manifest) {
        this.manifest = manifest;
    }

    public Integer getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(Integer versionNumber) {
        this.versionNumber = versionNumber;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public String getChangeMessage() {
        return changeMessage;
    }

    public void setChangeMessage(String changeMessage) {
        this.changeMessage = changeMessage;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
