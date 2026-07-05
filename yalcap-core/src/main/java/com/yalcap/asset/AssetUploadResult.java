package com.yalcap.asset;

public record AssetUploadResult(
        String assetKey,
        int version,
        String sha256,
        String mimeType,
        long byteSize,
        Integer width,
        Integer height
) {
}
