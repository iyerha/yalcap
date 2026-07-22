package com.yalcap.definition.form.control;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RuntimeControlTemplateSemanticsTest {

    @Test
    void selectTemplate_supportsArrayNamingAndMultipleAttribute() throws Exception {
        String html = readTemplate("/templates/runtime/controls/select.html");

        assertTrue(html.contains("name=${multiple ? control.stateKey + '[]' : control.stateKey}"));
        assertTrue(html.contains("multiple=${multiple ? 'multiple' : null}"));
    }

    @Test
    void checkboxTemplate_usesArrayNamingForGroupSubmission() throws Exception {
        String html = readTemplate("/templates/runtime/controls/checkbox.html");

        assertTrue(html.contains("name=${control.stateKey + '[]'}"));
    }

    @Test
    void autocompleteTemplate_includesRemoteHydrationHooks() throws Exception {
        String html = readTemplate("/templates/runtime/controls/autocomplete.html");

        assertTrue(html.contains("type=\"hidden\""));
        assertTrue(html.contains("name=${control.stateKey}"));
        assertTrue(html.contains("name=${control.stateKey + '__display'}"));
        assertTrue(html.contains("role='combobox'"));
        assertTrue(html.contains("aria-autocomplete='list'"));
        assertTrue(html.contains("aria-haspopup='listbox'"));
        assertTrue(html.contains("aria-controls=${listboxId}"));
        assertTrue(html.contains("data-autocomplete-source-type=${sourceType}"));
        assertTrue(html.contains("data-autocomplete-source-url=${sourceType == 'remote' ? sourceUrl : null}"));
        assertTrue(html.contains("data-autocomplete-list-id=${listId}"));
        assertTrue(html.contains("data-autocomplete-listbox-id=${listboxId}"));
        assertTrue(html.contains("data-autocomplete-value-id=${valueInputId}"));
        assertTrue(html.contains("data-autocomplete-min-chars=${minChars}"));
        assertTrue(html.contains("data-autocomplete-max-results=${maxResults}"));
        assertTrue(html.contains("data-autocomplete-allow-free-text=${allowFreeText ? 'true' : 'false'}"));
        assertTrue(html.contains("class=\"runtime-autocomplete-menu hidden\""));
        assertTrue(html.contains("data-autocomplete-menu-for=${valueInputId}"));
        assertTrue(html.contains("role=\"listbox\""));
        assertTrue(html.contains("class=\"runtime-autocomplete-spinner hidden\""));
        assertTrue(html.contains("class=\"runtime-autocomplete-status\""));
        assertTrue(html.contains("data-autocomplete-status-for=${valueInputId}"));
        assertTrue(html.contains("sourceType == 'remote' or (options != null and !#lists.isEmpty(options))"));
        assertTrue(html.contains("data-submit-value=${opt['value']}"));
    }

    @Test
    void sectionTemplate_exposesContainerMetadata() throws Exception {
        String html = readTemplate("/templates/runtime/controls/section.html");

        assertTrue(html.contains("data-collapsible=${control.renderModel != null and control.renderModel['collapsible'] == true ? 'true' : 'false'}"));
        assertTrue(html.contains("data-default-expanded=${control.renderModel != null and control.renderModel['defaultExpanded'] == true ? 'true' : 'false'}"));
    }

    @Test
    void groupTemplate_exposesGroupNameMetadata() throws Exception {
        String html = readTemplate("/templates/runtime/controls/group.html");

        assertTrue(html.contains("data-group-name=${control.renderModel != null ? control.renderModel['name'] : ''}"));
    }

    @Test
    void repeatTemplate_exposesRepeatMetadataAndControls() throws Exception {
        String html = readTemplate("/templates/runtime/controls/repeat.html");

        assertTrue(html.contains("data-repeat-renderer=${control.renderModel != null ? control.renderModel['renderer'] : 'table'}"));
        assertTrue(html.contains("data-repeat-min-items=${control.renderModel != null ? control.renderModel['minItems'] : 0}"));
        assertTrue(html.contains("data-repeat-max-items=${control.renderModel != null ? control.renderModel['maxItems'] : 0}"));
        assertTrue(html.contains("data-repeat-add"));
    }

    @Test
    void resolvedFormTemplate_includesSectionCollapseBindings() throws Exception {
        String html = readTemplate("/templates/runtime/resolved-form.html");

        assertTrue(html.contains("data-runtime-js-assets=${runtimeJsAssets != null ? #strings.listJoin(runtimeJsAssets, ',') : ''}"));
        assertTrue(html.contains("data-runtime-css-assets=${runtimeCssAssets != null ? #strings.listJoin(runtimeCssAssets, ',') : ''}"));
        assertTrue(html.contains("data-section-collapsible=${control.widget == 'section'"));
        assertTrue(html.contains("data-section-collapsed=${control.widget == 'section'"));
        assertTrue(html.contains("data-repeat-min-items=${control.widget == 'repeat'"));
        assertTrue(html.contains("data-repeat-max-items=${control.widget == 'repeat'"));
        assertTrue(html.contains("control.widget != 'repeat' and control.widget != 'section' and control.widget != 'group'"));
        assertTrue(html.contains("data-section-toggle"));
        assertTrue(html.contains("aria-expanded=${control.renderModel != null and control.renderModel['collapsed'] == true ? 'false' : 'true'}"));
        assertTrue(html.contains("hidden=${control.widget == 'section' and control.renderModel != null and control.renderModel['collapsed'] == true ? 'hidden' : null}"));
        assertTrue(html.contains("data-repeat-template=${control.widget == 'repeat' ? 'true' : null}"));
    }

    private String readTemplate(String path) throws IOException {
        try (InputStream stream = getClass().getResourceAsStream(path)) {
            assertNotNull(stream, "Template not found: " + path);
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
