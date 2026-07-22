package com.yalcap.web;

import com.yalcap.definition.form.control.ControlTypeDescriptor;
import com.yalcap.definition.form.control.ControlTypeRegistry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/control-types")
public class ControlTypeController {

    private final ControlTypeRegistry controlTypeRegistry;

    public ControlTypeController(ControlTypeRegistry controlTypeRegistry) {
        this.controlTypeRegistry = controlTypeRegistry;
    }

    @GetMapping
    public ResponseEntity<List<ControlTypeDescriptor>> listControlTypes() {
        return ResponseEntity.ok(controlTypeRegistry.descriptors());
    }
}
