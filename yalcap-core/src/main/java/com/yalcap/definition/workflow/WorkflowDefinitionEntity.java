package com.yalcap.definition.workflow;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import com.yalcap.persistence.TenantAware;
import tools.jackson.databind.JsonNode;

import java.time.OffsetDateTime;
import java.util.UUID;

@Table("workflow_definition")
public class WorkflowDefinitionEntity implements TenantAware {

    @Id
    private UUID id;

    @Column("definition_key")
    private String definitionKey;

    @Column("definition")
    private JsonNode definition;

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

    public WorkflowDefinitionEntity() {}

    public WorkflowDefinitionEntity(UUID id,
                                  String definitionKey,
                                  JsonNode definition,
                                  Integer versionNumber,
                                  Boolean active,
                                  UUID tenantId,
                                  String createdBy,
                                  String changeMessage) {
        this.id = id;
        this.definitionKey = definitionKey;
        this.definition = definition;
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

    public String getDefinitionKey() {
        return definitionKey;
    }

    public void setDefinitionKey(String definitionKey) {
        this.definitionKey = definitionKey;
    }

    public JsonNode getDefinition() {
        return definition;
    }

    public void setDefinition(JsonNode definition) {
        this.definition = definition;
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