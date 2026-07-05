package com.yalcap.asset;

import com.yalcap.persistence.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AssetStorageService {

    private static final Pattern NON_KEY = Pattern.compile("[^a-z0-9._-]+");

    private final AssetFileRepository repository;
    private final ObjectMapper objectMapper;
    private final AssetBinaryStore binaryStore;

    public AssetStorageService(AssetFileRepository repository,
                               ObjectMapper objectMapper,
                               AssetBinaryStore binaryStore) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.binaryStore = binaryStore;
    }

    public AssetUploadResult store(MultipartFile file, String requestedAssetKey, String createdBy) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to read uploaded file", ex);
        }

        String originalName = StringUtils.hasText(file.getOriginalFilename())
                ? file.getOriginalFilename()
                : "upload.bin";
        String assetKey = resolveAssetKey(requestedAssetKey, originalName);
        int nextVersion = repository.findTopByAssetKeyOrderByVersionNumberDesc(assetKey)
                .map(e -> e.getVersionNumber() == null ? 1 : e.getVersionNumber() + 1)
                .orElse(1);

        String sha256 = hash(bytes);
        UUID tenantId = TenantContext.getTenantId().orElse(null);
        String tenantSegment = tenantId != null ? tenantId.toString() : "global";
        String storageRef = binaryStore.store(tenantSegment, assetKey, nextVersion, originalName, bytes);
        Path filePath = Path.of(storageRef);

        Integer width = null;
        Integer height = null;
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image != null) {
                width = image.getWidth();
                height = image.getHeight();
            }
        } catch (IOException ignored) {
            // Non-image uploads are expected.
        }

        String mimeType = StringUtils.hasText(file.getContentType())
                ? file.getContentType()
                : probeMime(filePath).orElse("application/octet-stream");

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("originalFilename", originalName);
        metadata.put("tenant", tenantSegment);

        AssetFileEntity entity = new AssetFileEntity();
        entity.setAssetKey(assetKey);
        entity.setVersionNumber(nextVersion);
        entity.setStorageRef(storageRef);
        entity.setMimeType(mimeType);
        entity.setByteSize((long) bytes.length);
        entity.setSha256(sha256);
        entity.setWidth(width);
        entity.setHeight(height);
        entity.setTenantId(tenantId);
        entity.setCreatedBy(StringUtils.hasText(createdBy) ? createdBy : "designer");
        entity.setMetadata(metadata);
        repository.save(entity);

        return new AssetUploadResult(assetKey, nextVersion, sha256, mimeType, bytes.length, width, height);
    }

    private String resolveAssetKey(String requestedAssetKey, String originalFilename) {
        if (StringUtils.hasText(requestedAssetKey)) {
            return slug(requestedAssetKey);
        }
        String base = originalFilename;
        int dot = base.lastIndexOf('.');
        if (dot > 0) {
            base = base.substring(0, dot);
        }
        return slug(base);
    }

    private String slug(String input) {
        String lowered = input == null ? "" : input.toLowerCase(Locale.ROOT).trim();
        String slug = NON_KEY.matcher(lowered).replaceAll("-").replaceAll("-+", "-");
        slug = slug.replaceAll("^-|-$", "");
        return StringUtils.hasText(slug) ? slug : "asset";
    }

    private String hash(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash file", ex);
        }
    }

    private Optional<String> probeMime(Path path) {
        try {
            return Optional.ofNullable(Files.probeContentType(path));
        } catch (IOException ignored) {
            return Optional.empty();
        }
    }
}
