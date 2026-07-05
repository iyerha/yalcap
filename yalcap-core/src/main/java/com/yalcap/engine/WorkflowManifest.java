package com.yalcap.engine;

import java.util.UUID;

public final class WorkflowManifest {

    private final UUID id;
    private final String title;
    private final String version;
    private final String rawManifest;

    public WorkflowManifest(UUID id, String title, String version, String rawManifest) {
        this.id = id;
        this.title = title;
        this.version = version;
        this.rawManifest = rawManifest;
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

    public String getRawManifest() {
        return rawManifest;
    }
}
