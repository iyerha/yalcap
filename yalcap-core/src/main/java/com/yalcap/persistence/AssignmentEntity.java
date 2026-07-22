package com.yalcap.persistence;

import com.yalcap.engine.AssigneeType;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Table("workflow_instance_assignments")
public class AssignmentEntity {

    @Id
    private UUID id;

    @Column("instance_id")
    private UUID instanceId;

    @Column("step_id")
    private String stepId;

    @Column("tenant_id")
    private UUID tenantId;

    @Column("assignee_type")
    private String assigneeType;

    @Column("assignee_id")
    private String assigneeId;

    private boolean active;

    @Column("assigned_at")
    private OffsetDateTime assignedAt;

    @Column("completed_at")
    private OffsetDateTime completedAt;

    public AssignmentEntity() {}

    public AssignmentEntity(UUID id, String stepId, String assigneeType, String assigneeId, boolean active) {
        this.id = id;
        this.stepId = stepId;
        this.assigneeType = assigneeType;
        this.assigneeId = assigneeId;
        this.active = active;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getInstanceId() { return instanceId; }
    public void setInstanceId(UUID instanceId) { this.instanceId = instanceId; }
    public String getStepId() { return stepId; }
    public void setStepId(String stepId) { this.stepId = stepId; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getAssigneeType() { return assigneeType; }
    public AssigneeType getAssigneeTypeValue() { return AssigneeType.valueOf(assigneeType); }
    public void setAssigneeType(String assigneeType) { this.assigneeType = assigneeType; }
    public void setAssigneeType(AssigneeType assigneeType) { this.assigneeType = assigneeType.name(); }
    public String getAssigneeId() { return assigneeId; }
    public void setAssigneeId(String assigneeId) { this.assigneeId = assigneeId; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public OffsetDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(OffsetDateTime assignedAt) { this.assignedAt = assignedAt; }
    public OffsetDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(OffsetDateTime completedAt) { this.completedAt = completedAt; }
}
