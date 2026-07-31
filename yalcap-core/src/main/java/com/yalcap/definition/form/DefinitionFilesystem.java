package com.yalcap.definition.form;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class DefinitionFilesystem {
    
    @Value("${yalcap.definitions.forms-path:definitions/forms}")
    private String formsPath;
    
    @Value("${yalcap.definitions.workflows-path:definitions/workflows}")
    private String workflowsPath;
    
    public void writeFormControlSchema(String formKey, String htmlContent) throws IOException {
        Path dir = Paths.get("src/main/resources/" + formsPath);
        Files.createDirectories(dir);
        
        Path filePath = dir.resolve(formKey + ".html");
        Files.write(filePath, htmlContent.getBytes(StandardCharsets.UTF_8));
    }

    public String readFormControlSchema(String formKey) throws IOException {
        Path filePath = Paths.get("src/main/resources/" + formsPath + "/" + formKey + ".html");
        if (!Files.exists(filePath)) {
            throw new IOException("Form control schema not found: " + formKey);
        }
        return Files.readString(filePath);
    }

    public void writeFormDataSchema(String formKey, String yamlContent) throws IOException {
        Path dir = Paths.get("src/main/resources/" + formsPath);
        Files.createDirectories(dir);
        
        Path filePath = dir.resolve(formKey + ".schema.yaml");
        Files.write(filePath, yamlContent.getBytes(StandardCharsets.UTF_8));
    }

    public String readFormDataSchema(String formKey) throws IOException {
        Path filePath = Paths.get("src/main/resources/" + formsPath + "/" + formKey + ".schema.yaml");
        if (!Files.exists(filePath)) {
            throw new IOException("Form data schema not found: " + formKey);
        }
        return Files.readString(filePath);
    }
    
    public void writeWorkflowDefinition(String workflowKey, String yamlContent) throws IOException {
        Path dir = Paths.get("src/main/resources/" + workflowsPath);
        Files.createDirectories(dir);
        
        Path filePath = dir.resolve(workflowKey + ".yaml");
        Files.write(filePath, yamlContent.getBytes(StandardCharsets.UTF_8));
    }
    
    public String readWorkflowDefinition(String workflowKey) throws IOException {
        Path filePath = Paths.get("src/main/resources/" + workflowsPath + "/" + workflowKey + ".yaml");
        if (!Files.exists(filePath)) {
            throw new IOException("Workflow definition not found: " + workflowKey);
        }
        return Files.readString(filePath);
    }
}