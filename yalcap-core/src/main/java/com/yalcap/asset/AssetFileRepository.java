package com.yalcap.asset;

import org.springframework.data.repository.CrudRepository;

import java.util.Optional;
import java.util.UUID;

public interface AssetFileRepository extends CrudRepository<AssetFileEntity, UUID> {
    Optional<AssetFileEntity> findTopByAssetKeyOrderByVersionNumberDesc(String assetKey);
    Optional<AssetFileEntity> findByAssetKeyAndVersionNumber(String assetKey, Integer versionNumber);
}
