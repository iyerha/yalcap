package com.yalcap.web;

import com.yalcap.definition.form.FormDefinitionRepository;
import com.yalcap.definition.form.FormDefinitionService;
import com.yalcap.definition.form.control.ControlType;
import com.yalcap.definition.form.control.ControlTypeClientAssets;
import com.yalcap.definition.form.control.ControlTypeDescriptor;
import com.yalcap.definition.form.control.ControlTypeRegistry;
import com.yalcap.definition.form.control.ControlTypeValidationContext;
import com.yalcap.definition.form.load.FormLoadDataService;
import com.yalcap.definition.workflow.step.DecisionStepType;
import com.yalcap.definition.workflow.step.FormStepType;
import com.yalcap.definition.workflow.step.ServiceStepType;
import com.yalcap.definition.workflow.step.StepType;
import com.yalcap.definition.workflow.step.StepTypeClientAssets;
import com.yalcap.definition.workflow.step.StepTypeDescriptor;
import com.yalcap.definition.workflow.step.StepTypeRegistry;
import com.yalcap.definition.workflow.step.StepTypeValidationContext;
import com.yalcap.definition.workflow.WorkflowDefinitionRepository;
import com.yalcap.definition.workflow.WorkflowDefinitionEntity;
import com.yalcap.definition.workflow.WorkflowDefinitionService;
import com.yalcap.definition.workflow.WorkflowRuleEngine;
import com.yalcap.asset.AssetFileRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.ui.Model;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Optional;

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
                new FormLoadDataService(List.of(), objectMapper),
            new StepTypeRegistry(List.of(new FormStepType(), new ServiceStepType(), new DecisionStepType())),
            new WorkflowRuleEngine(objectMapper),
                objectMapper
        );

        ControlTypeRegistry registry = new ControlTypeRegistry(List.of(
                controlTypeWithAssets("a", ControlTypeClientAssets.designerJsOnly("/js/designer/custom-a.js")),
                controlTypeWithAssets("b", ControlTypeClientAssets.designerJsOnly("/js/designer/custom-a.js")),
                controlTypeWithAssets("c", ControlTypeClientAssets.designerCssOnly("/css/designer/custom-a.css"))
        ));

        DesignerController controller = new DesignerController(
                formService,
                workflowService,
                registry,
                new StepTypeRegistry(List.of(new FormStepType(), new ServiceStepType(), new DecisionStepType())),
                objectMapper
        );

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

        @Test
        void workflowDesigner_mergesControlAndStepDesignerAssets() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();

        FormDefinitionRepository formRepository = Mockito.mock(FormDefinitionRepository.class);
        FormDefinitionService formService = new FormDefinitionService(
            formRepository,
            new ControlTypeRegistry(List.of())
        );

        WorkflowDefinitionService workflowService = Mockito.mock(WorkflowDefinitionService.class);
        WorkflowDefinitionEntity active = new WorkflowDefinitionEntity();
        Mockito.when(workflowService.getActiveDefinition("sample")).thenReturn(Optional.of(active));

        ControlTypeRegistry controlRegistry = new ControlTypeRegistry(List.of(
            controlTypeWithAssets("a", ControlTypeClientAssets.designerJsOnly("/js/designer/custom-a.js"))
        ));

        StepTypeRegistry stepRegistry = new StepTypeRegistry(List.of(
            new FormStepType(),
            new ServiceStepType(),
            new DecisionStepType(),
            stepTypeWithAssets("test-step", StepTypeClientAssets.designerJsOnly("/js/designer/workflow/test-step.js")),
            stepTypeWithAssets("test-step-2", StepTypeClientAssets.designerCssOnly("/css/designer/workflow/test-step.css"))
        ));

        DesignerController controller = new DesignerController(
            formService,
            workflowService,
            controlRegistry,
            stepRegistry,
            objectMapper
        );

        Model model = new ExtendedModelMap();
        String view = controller.workflowDesigner(null, "sample", model);

        assertEquals("designer/workflow", view);

        Object jsAssetsValue = model.asMap().get("designerJsAssets");
        assertInstanceOf(List.class, jsAssetsValue);
        @SuppressWarnings("unchecked")
        List<String> jsAssets = (List<String>) jsAssetsValue;
        assertEquals(5, jsAssets.size());
        org.junit.jupiter.api.Assertions.assertTrue(jsAssets.contains("/js/designer/custom-a.js"));
        org.junit.jupiter.api.Assertions.assertTrue(jsAssets.contains("/js/designer/workflow/steps/designer-step-form.js"));
        org.junit.jupiter.api.Assertions.assertTrue(jsAssets.contains("/js/designer/workflow/steps/designer-step-decision.js"));
        org.junit.jupiter.api.Assertions.assertTrue(jsAssets.contains("/js/designer/workflow/steps/designer-step-service.js"));
        org.junit.jupiter.api.Assertions.assertTrue(jsAssets.contains("/js/designer/workflow/test-step.js"));

        Object cssAssetsValue = model.asMap().get("designerCssAssets");
        assertInstanceOf(List.class, cssAssetsValue);
        @SuppressWarnings("unchecked")
        List<String> cssAssets = (List<String>) cssAssetsValue;
        assertEquals(4, cssAssets.size());
        org.junit.jupiter.api.Assertions.assertTrue(cssAssets.contains("/css/designer/workflow/steps/designer-step-form.css"));
        org.junit.jupiter.api.Assertions.assertTrue(cssAssets.contains("/css/designer/workflow/steps/designer-step-decision.css"));
        org.junit.jupiter.api.Assertions.assertTrue(cssAssets.contains("/css/designer/workflow/steps/designer-step-service.css"));
        org.junit.jupiter.api.Assertions.assertTrue(cssAssets.contains("/css/designer/workflow/test-step.css"));
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

    private StepType stepTypeWithAssets(String type, StepTypeClientAssets assets) {
        return new StepType() {
            @Override
            public String type() {
                return type;
            }

            @Override
            public StepTypeDescriptor descriptor() {
                ObjectMapper mapper = new ObjectMapper();
                ObjectNode schema = mapper.createObjectNode();
                schema.put("type", "object");
                ObjectNode defaultConfig = mapper.createObjectNode();
                return new StepTypeDescriptor(type, type, type, 1, schema, defaultConfig, assets);
            }

            @Override
            public void validate(StepTypeValidationContext context) {
                // no-op for test step
            }
        };
    }
}
