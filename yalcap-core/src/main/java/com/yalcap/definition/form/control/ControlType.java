package com.yalcap.definition.form.control;

import java.util.Optional;

public interface ControlType {

    String type();

    ControlTypeDescriptor descriptor();

    default void validate(ControlTypeValidationContext context) {
        // Optional for plugins that need publish-time validation.
    }

    default Optional<ControlTypeRenderSpec> render(ControlTypeRenderContext context) {
        return Optional.empty();
    }
}
