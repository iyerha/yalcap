package com.yalcap.engine.internal;

import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import org.springframework.data.relational.core.query.Criteria;
import org.springframework.data.relational.core.query.Query;
import org.springframework.stereotype.Repository;

import com.yalcap.tenant.TenantContext;

@Repository
public class DocumentRepository {
    private final JdbcAggregateTemplate template;
    public DocumentRepository(JdbcAggregateTemplate template) {
        this.template = template;
    }
    
    private UUID getTenantId() {
        return TenantContext.requireTenantId();
    }

    public List<DocumentEntity> findByInstanceIdOrderByUploadedAtDesc(UUID instanceId) {
        return template.findAll(Query.query(
                Criteria.where("tenant_id").is(getTenantId())
                        .and("instance_id").is(instanceId)
        ).sort(Sort.by(Sort.Direction.DESC, "uploaded_at")), DocumentEntity.class).stream().toList();
    }

    public DocumentEntity save(DocumentEntity entity) {
        return template.save(entity);
    }
}
