package com.yalcap.engine;

import java.util.UUID;

public final class WorkflowDefinition {

    private final UUID id;
    private final String title;
    private final String version;
    private final String rawDefinition;

    public WorkflowDefinition(UUID id, String title, String version, String rawDefinition) {
        this.id = id;
        this.title = title;
        this.version = version;
        this.rawDefinition = rawDefinition;
    }

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getVersion() {
        return version;
    }

    public String getRawDefinition() {
        return rawDefinition;
    }

}
