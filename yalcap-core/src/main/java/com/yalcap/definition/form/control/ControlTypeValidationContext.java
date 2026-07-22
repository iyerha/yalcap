package com.yalcap.definition.form.control;

import tools.jackson.databind.JsonNode;

import java.util.Locale;

public record ControlTypeValidationContext(
        JsonNode control,
        String controlPath,
        ControlTypeValidationErrors errors,
        Locale locale,
        ControlTextDirection direction
) {
}
