package com.yalcap.engine.internal;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

import com.yalcap.tenant.TenantContext;

import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import org.springframework.data.relational.core.query.Criteria;
import org.springframework.data.relational.core.query.Query;

@Repository
public class AssignmentRepository {
    private final JdbcAggregateTemplate template;
    public AssignmentRepository(JdbcAggregateTemplate template) {
        this.template = template;
    }

    private UUID getTenantId() {
        return TenantContext.requireTenantId();
    }

    public List<AssignmentEntity> findActiveByInstanceId(UUID instanceId) {
        Query query = Query.query(
                Criteria.where("tenant_id").is(getTenantId())
                        .and("instance_id").is(instanceId)
                        .and("active").is(true)
        );
        return template.findAll(query, AssignmentEntity.class).stream().toList();
    }

    public AssignmentEntity save(AssignmentEntity entity) {
        return template.save(entity);
    }
}
