package com.yalcap.asset;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;

@Component
public class LocalFileAssetBinaryStore implements AssetBinaryStore {

    private final Path storageRoot;

    public LocalFileAssetBinaryStore(@Value("${yalcap.storage.root:./var/storage}") String storageRoot) {
        this.storageRoot = Path.of(storageRoot).toAbsolutePath().normalize();
    }

    @Override
    public String store(String tenantSegment,
                        String assetKey,
                        int version,
                        String originalFilename,
                        byte[] bytes) {
        String ext = extension(originalFilename);
        Path dir = storageRoot.resolve("assets").resolve(tenantSegment).resolve(assetKey);
        Path filePath = dir.resolve("v" + version + "-" + UUID.randomUUID() + ext);

        try {
            Files.createDirectories(dir);
            Files.write(filePath, bytes);
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to persist uploaded file", ex);
        }

        return filePath.toString();
    }

    private String extension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        String ext = fileName.substring(dot).toLowerCase(Locale.ROOT);
        if (!ext.matches("\\.[a-z0-9]{1,10}")) {
            return "";
        }
        return ext;
    }
}
