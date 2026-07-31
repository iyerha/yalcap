package com.yalcap.engine.internal;

import org.springframework.stereotype.Repository;
import com.yalcap.tenant.TenantContext;
import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import java.util.Optional;

import java.util.UUID;

@Repository
public class WorkflowInstanceRepository {
    private final JdbcAggregateTemplate template;

    public WorkflowInstanceRepository(JdbcAggregateTemplate template) {
        this.template = template;
    }

    private UUID getTenantId() {
        return TenantContext.requireTenantId();
    }

    public Optional<WorkflowInstanceEntity> findById(UUID id) {
        WorkflowInstanceEntity entity = template.findById(id, WorkflowInstanceEntity.class);
        return Optional.ofNullable(entity);
    }

    public WorkflowInstanceEntity save(WorkflowInstanceEntity entity) {
        return template.save(entity);
    }

}
