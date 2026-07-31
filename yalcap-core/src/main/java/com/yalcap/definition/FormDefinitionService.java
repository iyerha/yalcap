package com.yalcap.definition;

import com.yalcap.definition.form.control.ControlType;
import com.yalcap.definition.form.DefinitionFilesystem;
import com.yalcap.definition.form.FormDefinition;
import com.yalcap.definition.form.FormDefinitionEntity;
import com.yalcap.definition.form.FormDefinitionRepository;
import com.yalcap.definition.form.control.ControlTextDirection;
import com.yalcap.definition.form.control.ControlTypeRegistry;
import com.yalcap.definition.form.control.ControlTypeValidationContext;
import com.yalcap.definition.form.control.ControlTypeValidationErrors;
import com.yalcap.tenant.TenantContext;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;
import org.springframework.context.i18n.LocaleContextHolder;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class FormDefinitionService {

    private static final Set<String> RTL_LANGUAGES = Set.of("ar", "fa", "he", "ur");

    private final DefinitionFilesystem definitionFilesystem;
    private final FormDefinitionRepository formDefinitionRepository;
    private final ControlTypeRegistry controlTypeRegistry;
    private final ObjectMapper objectMapper;

    public FormDefinitionService(DefinitionFilesystem definitionFilesystem,
                                FormDefinitionRepository formDefinitionRepository,
                                ControlTypeRegistry controlTypeRegistry,
                                ObjectMapper objectMapper) {
        this.definitionFilesystem = definitionFilesystem;
        this.formDefinitionRepository = formDefinitionRepository;
        this.controlTypeRegistry = controlTypeRegistry;
        this.objectMapper = objectMapper;
    }

    public FormDefinition getFormDefinition(String formKey) {
        return formDefinitionRepository.findActiveByFormKey(formKey)
                .map(entity -> new FormDefinition(entity.getControlSchema(), entity.getDataSchema()))
                .orElseThrow(() -> new IllegalArgumentException("Form definition not found: " + formKey));
    }

    public Optional<FormDefinitionEntity> getActiveDefinition(String formKey) {
        return formDefinitionRepository.findActiveByFormKey(formKey);
    }

    public FormDefinitionEntity publish(String formKey, String htmlControlSchema, String yamlDataSchema, String createdBy, String changeMessage) throws IOException {
        // Parse and validate YAML
        JsonNode dataSchemaNode = parseYamlToJson(yamlDataSchema);
        validateDataSchema(dataSchemaNode);
        
        // Validate HTML
        validateFormHtml(htmlControlSchema);
        
        // Validate binding between HTML and dataSchema
        validateBinding(htmlControlSchema, dataSchemaNode);
        
        // Write both to filesystem
        definitionFilesystem.writeFormControlSchema(formKey, htmlControlSchema);
        definitionFilesystem.writeFormDataSchema(formKey, yamlDataSchema);
        
        // Save to database
        Optional<FormDefinitionEntity> activeForm = formDefinitionRepository.findActiveByFormKey(formKey);
        int nextVersion = activeForm.map(f -> f.getVersionNumber() + 1).orElse(1);
        
        activeForm.ifPresent(entity -> {
            entity.setActive(false);
            formDefinitionRepository.save(entity);
        });
        
        FormDefinitionEntity published = new FormDefinitionEntity(
                null, formKey, htmlControlSchema, dataSchemaNode, nextVersion, true, 
                TenantContext.getTenantId().orElse(UUID.fromString("00000000-0000-0000-0000-000000000000")),
                createdBy, changeMessage);
        return formDefinitionRepository.save(published);
    }

    private JsonNode parseYamlToJson(String yaml) throws IOException {
        ObjectMapper yamlMapper = new ObjectMapper(new tools.jackson.dataformat.yaml.YAMLFactory());
        return yamlMapper.readTree(yaml);
    }

    private void validateDataSchema(JsonNode dataSchema) {
        if (dataSchema == null || !dataSchema.isObject()) {
            throw new IllegalArgumentException("dataSchema must be a JSON object");
        }
        
        JsonNode properties = dataSchema.path("properties");
        if (!properties.isObject()) {
            throw new IllegalArgumentException("dataSchema.properties must be an object");
        }
    }

    private void validateBinding(String htmlControlSchema, JsonNode dataSchema) {
        Set<String> htmlFieldNames = extractHtmlFieldNames(htmlControlSchema);
        Set<String> schemaFieldNames = extractSchemaFieldNames(dataSchema);
        
        // All HTML fields must exist in schema
        Set<String> missingInSchema = new java.util.HashSet<>(htmlFieldNames);
        missingInSchema.removeAll(schemaFieldNames);
        if (!missingInSchema.isEmpty()) {
            throw new IllegalArgumentException("HTML fields not in dataSchema: " + missingInSchema);
        }
    }

    private Set<String> extractHtmlFieldNames(String htmlContent) {
        Set<String> fieldNames = new java.util.HashSet<>();
        Document doc = Jsoup.parse(htmlContent);
        
        // Extract from input[name], select[name], textarea[name]
        Elements inputs = doc.select("input[name], select[name], textarea[name]");
        for (Element elem : inputs) {
            String name = elem.attr("name");
            if (!name.isEmpty()) {
                fieldNames.add(name);
            }
        }
        
        return fieldNames;
    }

    private Set<String> extractSchemaFieldNames(JsonNode dataSchema) {
        Set<String> fieldNames = new java.util.HashSet<>();
        JsonNode properties = dataSchema.path("properties");
        if (properties.isObject()) {
            var iterator = properties.propertyNames().iterator();
            while (iterator.hasNext()) {
                fieldNames.add(iterator.next());
            }
        }
        return fieldNames;
    }

    private void validateFormHtml(String htmlContent) {
        Document doc = Jsoup.parse(htmlContent);
        
        // Validate form structure
        Element form = doc.selectFirst("form[th:fragment=form]");
        if (form == null) {
            throw new IllegalArgumentException("Form must have th:fragment=\"form\" attribute");
        }
        
        // Validate controls
        Elements controls = form.select("[data-widget]");
        for (Element control : controls) {
            String widget = control.attr("data-widget");
            if (widget.isEmpty()) {
                throw new IllegalArgumentException("Control must have data-widget attribute");
            }
            
            validateControl(control, widget);
        }
    }

    private void validateControl(Element control, String widget) {
        ControlType controlType = controlTypeRegistry.find(widget).orElse(null);
        if (controlType == null) {
            // Unknown widget type, skip validation
            return;
        }
        
        // Extract control metadata from data-* attributes
        ObjectNode controlDef = objectMapper.createObjectNode();
        controlDef.put("widget", widget);
        
        String controlId = control.attr("data-control-id");
        if (!controlId.isEmpty()) {
            controlDef.put("id", controlId);
        }
        
        Element labelElement = control.selectFirst("label");
        if (labelElement != null) {
            controlDef.put("label", labelElement.text());
        }
        
        // Validate using ControlType
        Locale locale = LocaleContextHolder.getLocale();
        ControlTextDirection direction = inferDirection(locale);
        ControlTypeValidationErrors errors = new ControlTypeValidationErrors();
        controlType.validate(new ControlTypeValidationContext(controlDef, "", errors, locale, direction));
        
        if (errors.hasErrors()) {
            throw new IllegalArgumentException(String.join("; ", errors.all()));
        }
    }

    private ControlTextDirection inferDirection(Locale locale) {
        if (locale == null) {
            return ControlTextDirection.LTR;
        }
        String language = locale.getLanguage();
        if (language == null) {
            return ControlTextDirection.LTR;
        }
        return RTL_LANGUAGES.contains(language.toLowerCase(Locale.ROOT))
                ? ControlTextDirection.RTL
                : ControlTextDirection.LTR;
    }
}