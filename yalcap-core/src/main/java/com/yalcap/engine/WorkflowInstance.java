package com.yalcap.engine;

import java.util.Map;
import java.util.UUID;

public final class WorkflowInstance {

    private final UUID id;
    private final UUID manifestId;
    private final Map<String, Object> data;
    private final int currentStep;
    private final String status;
    private final String assignee;

    public WorkflowInstance(UUID id, UUID manifestId, Map<String, Object> data, int currentStep, String status, String assignee) {
        this.id = id;
        this.manifestId = manifestId;
        this.data = Map.copyOf(data);
        this.currentStep = currentStep;
        this.status = status;
        this.assignee = assignee;
    }

    public UUID getId() {
        return id;
    }

    public UUID getManifestId() {
        return manifestId;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public int getCurrentStep() {
        return currentStep;
    }

    public String getStatus() {
        return status;
    }

    public String getAssignee() {
        return assignee;
    }
}
