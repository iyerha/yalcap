package com.yalcap.definition.form;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class FormDefinitionServiceTest {

    private final FormDefinitionRepository repository = Mockito.mock(FormDefinitionRepository.class);
    private final FormDefinitionService service = new FormDefinitionService(repository);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void publish_acceptsDateDateTimeAndAutocompleteControls() throws Exception {
        when(repository.findByFormKeyAndActiveTrue("sample-form")).thenReturn(Optional.empty());
        when(repository.save(any(FormDefinitionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        JsonNode definition = objectMapper.readTree("""
                {
                  "kind": "form",
                  "form": {
                    "dataSchema": {
                      "type": "object",
                      "properties": {
                        "startDate": {"type": "string", "format": "date"},
                        "startAt": {"type": "string", "format": "date-time"},
                        "city": {"type": "string", "enum": ["nyc", "ldn"]}
                      }
                    },
                    "controlSchema": {
                      "layout": [
                        {"pointer": "#/properties/startDate", "stateKey": "startDate", "widget": "date", "label": "Start date", "minDate": "2026-01-01", "maxDate": "2026-12-31"},
                        {"pointer": "#/properties/startAt", "stateKey": "startAt", "widget": "datetime", "label": "Start at", "minDateTime": "2026-01-01T09:00", "maxDateTime": "2026-12-31T17:00"},
                        {"pointer": "#/properties/city", "stateKey": "city", "widget": "autocomplete", "label": "City", "options": [{"label": "New York", "value": "nyc"}, {"label": "London", "value": "ldn"}]}
                      ]
                    }
                  }
                }
                """);

        FormDefinitionEntity published = service.publish("sample-form", definition, "tester", "add widgets");

        assertEquals("sample-form", published.getFormKey());
        assertEquals(definition, published.getDefinition());
    }

    @Test
    void publish_acceptsRemoteAutocompleteWithoutStaticOptions() throws Exception {
        when(repository.findByFormKeyAndActiveTrue("sample-form")).thenReturn(Optional.empty());
        when(repository.save(any(FormDefinitionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        JsonNode definition = objectMapper.readTree("""
                {
                  "kind": "form",
                  "form": {
                    "dataSchema": {
                      "type": "object",
                      "properties": {
                        "city": {"type": "string"}
                      }
                    },
                    "controlSchema": {
                      "layout": [
                        {"pointer": "#/properties/city", "stateKey": "city", "widget": "autocomplete", "label": "City", "autocompleteSourceType": "remote", "autocompleteSourceUrl": "/api/lookups/cities", "autocompleteLabelField": "label", "autocompleteValueField": "value", "autocompleteSearchParam": "q", "options": []}
                      ]
                    }
                  }
                }
                """);

        FormDefinitionEntity published = service.publish("sample-form", definition, "tester", "remote autocomplete");

        assertEquals("sample-form", published.getFormKey());
    }

    @Test
    void publish_rejectsDateBoundsWhereMaxBeforeMin() throws Exception {
        JsonNode definition = objectMapper.readTree("""
                {
                  "kind": "form",
                  "form": {
                    "dataSchema": {"type": "object", "properties": {"startDate": {"type": "string", "format": "date"}}},
                    "controlSchema": {
                      "layout": [
                        {"pointer": "#/properties/startDate", "stateKey": "startDate", "widget": "date", "label": "Start date", "minDate": "2026-12-31", "maxDate": "2026-01-01"}
                      ]
                    }
                  }
                }
                """);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.publish("sample-form", definition, "tester", "invalid dates"));

        assertEquals("form.controlSchema.layout[0].maxDate must be greater than or equal to minDate", ex.getMessage());
    }

    @Test
    void publish_rejectsAutocompleteWithoutOptions() throws Exception {
        JsonNode definition = objectMapper.readTree("""
                {
                  "kind": "form",
                  "form": {
                    "dataSchema": {"type": "object", "properties": {"city": {"type": "string"}}},
                    "controlSchema": {
                      "layout": [
                        {"pointer": "#/properties/city", "stateKey": "city", "widget": "autocomplete", "label": "City", "options": []}
                      ]
                    }
                  }
                }
                """);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.publish("sample-form", definition, "tester", "invalid autocomplete"));

        assertEquals("form.controlSchema.layout[0].options is required for autocomplete widget", ex.getMessage());
    }

    @Test
    void publish_rejectsRemoteAutocompleteWithoutSourceUrl() throws Exception {
        JsonNode definition = objectMapper.readTree("""
                {
                  "kind": "form",
                  "form": {
                    "dataSchema": {"type": "object", "properties": {"city": {"type": "string"}}},
                    "controlSchema": {
                      "layout": [
                        {"pointer": "#/properties/city", "stateKey": "city", "widget": "autocomplete", "label": "City", "autocompleteSourceType": "remote", "options": []}
                      ]
                    }
                  }
                }
                """);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.publish("sample-form", definition, "tester", "invalid remote autocomplete"));

        assertEquals("form.controlSchema.layout[0].autocompleteSourceUrl is required for remote autocomplete widget", ex.getMessage());
    }
}