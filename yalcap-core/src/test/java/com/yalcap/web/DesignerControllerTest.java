package com.yalcap.web;

import com.yalcap.definition.form.FormDefinitionRepository;
import com.yalcap.definition.form.FormDefinitionService;
import com.yalcap.definition.form.control.ControlType;
import com.yalcap.definition.form.control.ControlTypeClientAssets;
import com.yalcap.definition.form.control.ControlTypeDescriptor;
import com.yalcap.definition.form.control.ControlTypeRegistry;
import com.yalcap.definition.form.control.ControlTypeValidationContext;
import com.yalcap.definition.form.load.FormLoadDataHydrationService;
import com.yalcap.definition.workflow.WorkflowDefinitionRepository;
import com.yalcap.definition.workflow.WorkflowDefinitionService;
import com.yalcap.asset.AssetFileRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.ui.Model;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class DesignerControllerTest {

    @Test
    void formDesigner_populatesDesignerAssetListsFromControlDescriptors() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();

        FormDefinitionRepository formRepository = Mockito.mock(FormDefinitionRepository.class);
        FormDefinitionService formService = new FormDefinitionService(
                formRepository,
                new ControlTypeRegistry(List.of())
        );

        WorkflowDefinitionRepository workflowRepository = Mockito.mock(WorkflowDefinitionRepository.class);
        AssetFileRepository assetRepository = Mockito.mock(AssetFileRepository.class);
        WorkflowDefinitionService workflowService = new WorkflowDefinitionService(
                workflowRepository,
                formRepository,
                assetRepository,
                new FormLoadDataHydrationService(List.of(), objectMapper),
                objectMapper
        );

        ControlTypeRegistry registry = new ControlTypeRegistry(List.of(
                controlTypeWithAssets("a", ControlTypeClientAssets.designerJsOnly("/js/designer/custom-a.js")),
                controlTypeWithAssets("b", ControlTypeClientAssets.designerJsOnly("/js/designer/custom-a.js")),
                controlTypeWithAssets("c", ControlTypeClientAssets.designerCssOnly("/css/designer/custom-a.css"))
        ));

        DesignerController controller = new DesignerController(formService, workflowService, registry, objectMapper);

        Model model = new ExtendedModelMap();
        String view = controller.formDesigner(null, "sample", model);

        assertEquals("designer/form", view);

        Object jsAssetsValue = model.asMap().get("designerJsAssets");
        assertInstanceOf(List.class, jsAssetsValue);
        @SuppressWarnings("unchecked")
        List<String> jsAssets = (List<String>) jsAssetsValue;
        assertEquals(List.of("/js/designer/custom-a.js"), jsAssets);

        Object cssAssetsValue = model.asMap().get("designerCssAssets");
        assertInstanceOf(List.class, cssAssetsValue);
        @SuppressWarnings("unchecked")
        List<String> cssAssets = (List<String>) cssAssetsValue;
        assertEquals(List.of("/css/designer/custom-a.css"), cssAssets);
    }

    private ControlType controlTypeWithAssets(String type, ControlTypeClientAssets assets) {
        return new ControlType() {
            @Override
            public String type() {
                return type;
            }

            @Override
            public ControlTypeDescriptor descriptor() {
                ObjectMapper mapper = new ObjectMapper();
                ObjectNode schema = mapper.createObjectNode();
                schema.put("type", "object");
                ObjectNode defaultConfig = mapper.createObjectNode();
                defaultConfig.put("widget", type);
                return new ControlTypeDescriptor(type, type, type, schema, defaultConfig, assets);
            }

            @Override
            public void validate(ControlTypeValidationContext context) {
                // no-op for test control
            }
        };
    }
}
