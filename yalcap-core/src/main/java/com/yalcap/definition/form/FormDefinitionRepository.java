package com.yalcap.definition.form;

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
public class FormDefinitionRepository {
    private final JdbcAggregateTemplate template;
    public FormDefinitionRepository(JdbcAggregateTemplate template) {
        this.template = template;
    }

    private UUID getTenantId() {
        return TenantContext.requireTenantId();
    }

    public Optional<FormDefinitionEntity> findActiveByFormKey(String formKey) {
        Query query = Query.query(
                Criteria.where("tenant_id").is(getTenantId())
                        .and("form_key").is(formKey)
                        .and("active").is(true)
        );

        return template.findOne(query, FormDefinitionEntity.class);
    }

    public Optional<FormDefinitionEntity> findByFormKeyAndVersionNumber(String formKey, Integer versionNumber) {
        Query query = Query.query(
                Criteria.where("tenant_id").is(getTenantId())
                        .and("form_key").is(formKey)
                        .and("version_number").is(versionNumber)
        );

        return template.findOne(query, FormDefinitionEntity.class);
    }

    public List<FormDefinitionEntity> findByFormKeyOrderByVersionNumberDesc(String formKey) {
        Query query = Query.query(
                Criteria.where("tenant_id").is(getTenantId())
                        .and("form_key").is(formKey)
        ).sort(Sort.by(Sort.Direction.DESC, "version_number"));

        return template.findAll(query, FormDefinitionEntity.class).stream().toList();
    }

    public FormDefinitionEntity save(FormDefinitionEntity entity) {
        return template.save(entity);
    }
}