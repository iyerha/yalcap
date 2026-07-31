package com.yalcap.engine.internal;

import org.springframework.stereotype.Repository;
import com.yalcap.tenant.TenantContext;
import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import org.springframework.data.domain.Sort;
import org.springframework.data.relational.core.query.Criteria;
import org.springframework.data.relational.core.query.Query;
import java.util.List;
import java.util.UUID;

@Repository
public class EventRepository {
    private final JdbcAggregateTemplate template;

    public EventRepository(JdbcAggregateTemplate template) {
        this.template = template;
    }

    private UUID getTenantId() {
        return TenantContext.requireTenantId();
    }

    public List<EventEntity> findByInstanceIdOrderByCreatedAtAsc(UUID instanceId) {
        return template.findAll(Query.query(
                Criteria.where("tenant_id").is(getTenantId())
                        .and("instance_id").is(instanceId)
        ).sort(Sort.by(Sort.Direction.ASC, "created_at")), EventEntity.class).stream().toList();
    }

    public EventEntity save(EventEntity entity) {
        return template.save(entity);
    }
}
