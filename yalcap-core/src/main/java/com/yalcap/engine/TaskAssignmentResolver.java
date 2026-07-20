package com.yalcap.engine;

import java.util.UUID;

public interface TaskAssignmentResolver {

    TaskAssignmentResolution resolve(UUID tenantId, TaskAssignmentIntent intent);
}