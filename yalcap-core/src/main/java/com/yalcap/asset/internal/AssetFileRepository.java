package com.yalcap.asset.internal;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import org.springframework.data.relational.core.query.Criteria;
import org.springframework.data.relational.core.query.Query;
import org.springframework.stereotype.Repository;

import com.yalcap.tenant.TenantContext;

@Repository
public class AssetFileRepository  {
    private final JdbcAggregateTemplate template;
    public AssetFileRepository(JdbcAggregateTemplate template) {
        this.template = template;
    }
    private UUID getTenantId() {
        return TenantContext.requireTenantId();
    }

    public Optional<AssetFileEntity> findLatestByAssetKey(String assetKey) {
        Query query = Query.query(
                Criteria.where("tenant_id").is(getTenantId())
                        .and("asset_key").is(assetKey)
        ).sort(Sort.by(Direction.DESC, "version_number"));

        return template.findAll(query, AssetFileEntity.class)
                .stream()
                .findFirst();
    }

    public Optional<AssetFileEntity> findByAssetKeyAndVersionNumber(String assetKey, Integer versionNumber) {
        Query query = Query.query(
                        Criteria.where("tenant_id").is(getTenantId())
                                .and("asset_key").is(assetKey)
                                .and("version_number").is(versionNumber)
        );

        return template.findOne(query, AssetFileEntity.class);
    }

    public AssetFileEntity save(AssetFileEntity entity) {
        return template.save(entity);
    }
}
