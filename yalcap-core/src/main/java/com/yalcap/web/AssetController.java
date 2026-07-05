package com.yalcap.web;

import com.yalcap.asset.AssetStorageService;
import com.yalcap.asset.AssetUploadResult;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/assets", "/t/{tenantId}/api/assets"})
public class AssetController {

    private final AssetStorageService storageService;

    public AssetController(AssetStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> upload(@PathVariable(value = "tenantId", required = false) UUID tenantId,
                                                      @RequestParam("file") MultipartFile file,
                                                      @RequestParam(value = "assetKey", required = false) String assetKey,
                                                      @RequestParam(value = "createdBy", required = false) String createdBy) {
        AssetUploadResult result = storageService.store(file, assetKey, createdBy);

        Map<String, Object> payload = new HashMap<>();
        payload.put("assetKey", result.assetKey());
        payload.put("version", result.version());
        payload.put("sha256", result.sha256());
        payload.put("mimeType", result.mimeType());
        payload.put("byteSize", result.byteSize());
        payload.put("width", result.width());
        payload.put("height", result.height());
        return ResponseEntity.ok(payload);
    }
}
