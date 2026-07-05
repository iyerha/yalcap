package com.yalcap.persistence;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.MappedCollection;
import org.springframework.data.relational.core.mapping.Table;

import tools.jackson.databind.JsonNode;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Table("workflow_instance")
public class WorkflowInstanceEntity implements TenantAware {

    @Id
    private UUID id;

    @Column("tenant_id")
    private UUID tenantId;

    @Column("definition_id")
    private UUID definitionId;

    private JsonNode data;

    private int currentStep;

    private String status;

    private String assignee;

    @MappedCollection(idColumn = "instance_id")
    private Set<AssignmentEntity> assignments = new LinkedHashSet<>();

    public WorkflowInstanceEntity() {}

    public WorkflowInstanceEntity(UUID id, UUID definitionId) {
        this.id = id;
        this.definitionId = definitionId;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public UUID getDefinitionId() { return definitionId; }
    public void setDefinitionId(UUID definitionId) { this.definitionId = definitionId; }
    public UUID getManifestId() { return getDefinitionId(); }
    public void setManifestId(UUID manifestId) { setDefinitionId(manifestId); }
    public JsonNode getData() { return data; }
    public void setData(JsonNode data) { this.data = data; }
    public int getCurrentStep() { return currentStep; }
    public void setCurrentStep(int currentStep) { this.currentStep = currentStep; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAssignee() { return assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; }
    public Set<AssignmentEntity> getAssignments() { return assignments; }
    public void setAssignments(Set<AssignmentEntity> assignments) { this.assignments = assignments; }
}
