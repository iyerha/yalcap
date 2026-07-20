package com.yalcap.definition.form.load;

import org.jspecify.annotations.Nullable;
import tools.jackson.databind.node.ObjectNode;

public interface FormLoadDataProvider {

    String id();

    default int order() {
        return 0;
    }

    default boolean supports(FormLoadDataContext context) {
        return true;
    }

    default boolean supportsPhase(FormLoadDataPhase phase) {
        return phase == FormLoadDataPhase.FORM_OPEN;
    }

    @Nullable ObjectNode load(FormLoadDataContext context);
}
