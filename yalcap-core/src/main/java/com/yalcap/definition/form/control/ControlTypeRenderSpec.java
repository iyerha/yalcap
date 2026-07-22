package com.yalcap.definition.form.control;

import java.util.Map;

public record ControlTypeRenderSpec(
        String fragmentName,
        Map<String, Object> model
) {
}
