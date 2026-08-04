package com.yalcap.definition.form;

import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.yalcap.definition.FormDefinitionService;
import com.yalcap.definition.form.control.ControlTypeRegistry;
import com.yalcap.definition.form.control.internal.AutocompleteControlType;
import com.yalcap.definition.form.control.internal.DateControlType;
import com.yalcap.definition.form.control.internal.DateTimeControlType;
import com.yalcap.tenant.TenantContext;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FormDefinitionServiceTest {
  private static final UUID TENANT_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
  private final ObjectMapper objectMapper = new ObjectMapper();
  private final FormDefinitionRepository repository = Mockito.mock(FormDefinitionRepository.class);
  private final DefinitionFilesystem definitionFilesystem = Mockito.mock(DefinitionFilesystem.class);
  private final ControlTypeRegistry controlTypeRegistry = new ControlTypeRegistry(List.of(
      new DateControlType(objectMapper),
      new DateTimeControlType(objectMapper),
      new AutocompleteControlType(objectMapper)));

  private FormDefinitionService service;
  private MockedStatic<TenantContext> mockedTenantContext;
  private final ApplicationEventPublisher eventPublisher = Mockito.mock(ApplicationEventPublisher.class);

  @BeforeEach
  void setUp() {
    mockedTenantContext = mockStatic(TenantContext.class);
    mockedTenantContext.when(TenantContext::getTenantId)
        .thenReturn(Optional.of(TENANT_ID));

    service = new FormDefinitionService(
        definitionFilesystem,
        repository,
        controlTypeRegistry,
        objectMapper,
        eventPublisher);
  }

  @AfterEach
  void tearDown() {
    mockedTenantContext.close();
  }

  @Test
  void publish_acceptsValidHtml() throws IOException {
    when(repository.findActiveByFormKey("sample-form")).thenReturn(Optional.empty());
    when(repository.save(any(FormDefinitionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    String htmlControlSchema = "<form th:fragment=\"form\"><input type='text' name='name' /></form>";
    String yamlDataSchema = """
        properties:
          name:
            type: string
        """;

    FormDefinitionEntity published = service.publish("sample-form", htmlControlSchema, yamlDataSchema, "tester",
        "add form");

    assertEquals("sample-form", published.getFormKey());
    assertEquals(htmlControlSchema, published.getControlSchema());
    assertEquals(1, published.getVersionNumber());
    assertTrue(published.getActive());
  }

  @Test
  void publish_rejectsInvalidHtml() throws IOException {
    String malformedHtml = "<form><input type='text' name='name'>";
    String yamlDataSchema = """
        properties:
          name:
            type: string
        """;

    assertThrows(IllegalArgumentException.class,
        () -> service.publish("sample-form", malformedHtml, yamlDataSchema, "tester", "bad html"));
  }

  @Test
  void publish_rejectsMissingThymeleafFragment() throws IOException {
    String htmlWithoutFragment = "<form><input type='text' name='name' /></form>";
    String yamlDataSchema = """
        properties:
          name:
            type: string
        """;

    assertThrows(IllegalArgumentException.class,
        () -> service.publish("sample-form", htmlWithoutFragment, yamlDataSchema, "tester", "missing fragment"));
  }

  @Test
  void publishValidateBindingBetweenHtmlAndSchema() throws IOException {
    when(repository.findActiveByFormKey("contact-form")).thenReturn(Optional.empty());
    when(repository.save(any(FormDefinitionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
    String htmlControlSchema = """
        <form th:fragment="form">
            <input type="text" name="email" />
            <input type="text" name="status" />
        </form>
        """;

    String yamlDataSchema = """
        properties:
          email:
            type: string
          status:
            type: string
          other:
            type: string
        """;

    FormDefinitionEntity result = service.publish("contact-form", htmlControlSchema, yamlDataSchema, "alice",
        "Initial");

    assertEquals("contact-form", result.getFormKey());
    assertEquals(1, result.getVersionNumber());
    assertTrue(result.getActive());
  }

  @Test
  void publishFailsWhenHtmlFieldNotInSchema() {
    String htmlControlSchema = """
        <form th:fragment="form">
            <input type="text" name="email" />
            <input type="text" name="phone" />
        </form>
        """;

    String yamlDataSchema = """
        properties:
          email:
            type: string
        """;

    assertThrows(IllegalArgumentException.class,
        () -> service.publish("contact-form", htmlControlSchema, yamlDataSchema, "alice", "Initial"));
  }
}