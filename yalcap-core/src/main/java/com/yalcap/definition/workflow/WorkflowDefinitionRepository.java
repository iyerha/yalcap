package com.yalcap.definition.workflow;

import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import org.springframework.data.relational.core.query.Criteria;
import org.springframework.data.relational.core.query.Query;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import com.yalcap.tenant.TenantContext;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class WorkflowDefinitionRepository {
    private final JdbcAggregateTemplate template;
    public WorkflowDefinitionRepository(JdbcAggregateTemplate template) {
        this.template = template;
    }

    private UUID getTenantId() {
        return TenantContext.requireTenantId();
    }

    public Optional<WorkflowDefinitionEntity> findActiveByDefinitionKey(String definitionKey) {
        Query query = Query.query(
                Criteria.where("tenant_id").is(getTenantId())
                        .and("definition_key").is(definitionKey)
                        .and("active").is(true)
        );
        return template.findOne(query, WorkflowDefinitionEntity.class);
    }

    public Optional<WorkflowDefinitionEntity> findByDefinitionKeyAndVersionNumber(String definitionKey, Integer versionNumber) {
        Query query = Query.query(
                Criteria.where("tenant_id").is(getTenantId())
                        .and("definition_key").is(definitionKey)
                        .and("version_number").is(versionNumber)
        );
        return template.findOne(query, WorkflowDefinitionEntity.class);
    }

    public List<WorkflowDefinitionEntity> findByDefinitionKeyOrderByVersionNumberDesc(String definitionKey) {
        Query query = Query.query(
                Criteria.where("tenant_id").is(getTenantId())
                        .and("definition_key").is(definitionKey)
        ).sort(Sort.by(Sort.Order.desc("version_number")));
        return template.findAll(query, WorkflowDefinitionEntity.class);
    }

    public WorkflowDefinitionEntity save(WorkflowDefinitionEntity entity) {
        return template.save(entity);
    }
}