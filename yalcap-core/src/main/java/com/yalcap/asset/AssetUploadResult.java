package com.yalcap.asset;

import com.yalcap.asset.internal.AssetFileEntity;

public record AssetUploadResult(
        String assetKey,
        int version,
        String sha256,
        String mimeType,
        long byteSize,
        Integer width,
        Integer height
) {
        public AssetUploadResult(AssetFileEntity entity) {
                this(entity.getAssetKey(),
                        entity.getVersionNumber(),
                        entity.getSha256(),
                        entity.getMimeType(),
                        entity.getByteSize(),
                        entity.getWidth(),
                        entity.getHeight());
        }
}
