package com.yalcap.asset;

public interface AssetBinaryStore {
    String store(String tenantSegment,
                 String assetKey,
                 int version,
                 String originalFilename,
                 byte[] bytes);
}
