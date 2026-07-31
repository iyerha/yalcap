package com.yalcap.definition.form;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import com.yalcap.IdAware;
import com.yalcap.tenant.TenantAware;

import tools.jackson.databind.JsonNode;

import java.time.OffsetDateTime;
import java.util.UUID;

@Table("form_definition")
public class FormDefinitionEntity implements TenantAware, IdAware {

    @Id
    private UUID id;

    @Column("form_key")
    private String formKey;

    @Column("control_schema")
    private String controlSchema;  // HTML

    @Column("data_schema")
    private JsonNode dataSchema;   // Parsed YAML → JSON

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

    public FormDefinitionEntity() {
    }

    public FormDefinitionEntity(UUID id,
                              String formKey,
                              String controlSchema,
                              JsonNode dataSchema,
                              Integer versionNumber,
                              Boolean active,
                              UUID tenantId,
                              String createdBy,
                              String changeMessage) {
        this.id = id;
        this.formKey = formKey;
        this.controlSchema = controlSchema;
        this.dataSchema = dataSchema;
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

    public String getFormKey() {
        return formKey;
    }

    public void setFormKey(String formKey) {
        this.formKey = formKey;
    }

    public String getControlSchema() {
        return controlSchema;
    }

    public void setControlSchema(String controlSchema) {
        this.controlSchema = controlSchema;
    }

    public JsonNode getDataSchema() {
        return dataSchema;
    }

    public void setDataSchema(JsonNode dataSchema) {
        this.dataSchema = dataSchema;
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