package com.yalcap.definition.workflow.step;

public interface StepType {

    String type();

    StepTypeDescriptor descriptor();

    default void validate(StepTypeValidationContext context) {
        // Optional publish-time validation hook.
    }
}
