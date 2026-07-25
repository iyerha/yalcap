package com.yalcap.engine.internal;

import java.util.UUID;

public record Document(UUID id,
                       UUID instanceId,
                       String stepId,
                       UUID documentId,
                       String storageRef,
                       String documentType,
                       String mimeType,
                       String uploadedBy,
                       String uploadedAt,
                       String metadataJson) {}
