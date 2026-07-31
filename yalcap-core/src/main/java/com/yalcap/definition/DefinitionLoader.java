package com.yalcap.definition;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DefinitionLoader {
    
    @Value("${yalcap.definitions.workflows-path:definitions/workflows}")
    private String workflowsPath;
    
    @Value("${yalcap.definitions.forms-path:definitions/forms}")
    private String formsPath;
    
    private final ConcurrentHashMap<String, String> formArtifacts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> workflowArtifacts = new ConcurrentHashMap<>();
    
    @EventListener(ApplicationReadyEvent.class)
    public void loadDefinitions() throws IOException {
        loadFormDefinitions();
        loadWorkflowDefinitions();
    }
    
    private void loadFormDefinitions() throws IOException {
        Path path = Paths.get("src/main/resources/" + formsPath);
        if (!Files.exists(path)) {
            Files.createDirectories(path);
            return;
        }
        
        Files.list(path)
            .filter(p -> p.toString().endsWith(".html"))
            .forEach(p -> {
                try {
                    String key = p.getFileName().toString().replace(".html", "");
                    String content = new String(Files.readAllBytes(p));
                    formArtifacts.put(key, content);
                } catch (IOException e) {
                    throw new RuntimeException("Failed to load form artifact: " + p, e);
                }
            });
    }
    
    private void loadWorkflowDefinitions() throws IOException {
        Path path = Paths.get("src/main/resources/" + workflowsPath);
        if (!Files.exists(path)) {
            Files.createDirectories(path);
            return;
        }
        
        Files.list(path)
            .filter(p -> p.toString().endsWith(".yaml"))
            .forEach(p -> {
                try {
                    String key = p.getFileName().toString().replace(".yaml", "");
                    String content = new String(Files.readAllBytes(p));
                    workflowArtifacts.put(key, content);
                } catch (IOException e) {
                    throw new RuntimeException("Failed to load workflow artifact: " + p, e);
                }
            });
    }
    
    public String getFormDefinition(String key) {
        return formArtifacts.get(key);
    }
    
    public String getWorkflowDefinition(String key) {
        return workflowArtifacts.get(key);
    }
}
