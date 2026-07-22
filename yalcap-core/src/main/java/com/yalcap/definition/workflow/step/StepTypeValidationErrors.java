package com.yalcap.definition.workflow.step;

import java.util.ArrayList;
import java.util.List;

public class StepTypeValidationErrors {

    private final List<String> errors = new ArrayList<>();

    public void add(String message) {
        if (message == null || message.trim().isEmpty()) {
            return;
        }
        errors.add(message.trim());
    }

    public boolean hasErrors() {
        return !errors.isEmpty();
    }

    public List<String> all() {
        return List.copyOf(errors);
    }
}
