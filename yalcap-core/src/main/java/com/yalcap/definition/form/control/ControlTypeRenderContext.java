package com.yalcap.definition.form.control;

import tools.jackson.databind.JsonNode;

import java.util.Locale;
import java.util.Map;

public record ControlTypeRenderContext(
        JsonNode control,
        JsonNode formData,
        JsonNode runtimeContext,
        Map<String, String> runtimeHtmx,
        Locale locale,
        ControlTextDirection direction
) {
}
