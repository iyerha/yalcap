package com.yalcap.web;

import com.yalcap.definition.workflow.step.StepTypeDescriptor;
import com.yalcap.definition.workflow.step.StepTypeRegistry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/step-types")
public class StepTypeController {

    private final StepTypeRegistry stepTypeRegistry;

    public StepTypeController(StepTypeRegistry stepTypeRegistry) {
        this.stepTypeRegistry = stepTypeRegistry;
    }

    @GetMapping
    public ResponseEntity<List<StepTypeDescriptor>> listStepTypes() {
        return ResponseEntity.ok(stepTypeRegistry.descriptors());
    }
}
