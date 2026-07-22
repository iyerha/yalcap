package com.yalcap.definition.form.control;

import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

final class ControlOptionSupport {

    private ControlOptionSupport() {
    }

    static List<Map<String, String>> normalizeOptions(JsonNode optionsNode) {
        List<Map<String, String>> out = new ArrayList<>();
        if (optionsNode == null || !optionsNode.isArray()) {
            return out;
        }

        for (JsonNode option : optionsNode) {
            if (option == null || option.isNull()) {
                continue;
            }

            String label;
            String value;
            if (option.isObject()) {
                label = option.path("label").asString("").trim();
                value = option.path("value").asString("").trim();
                if (label.isEmpty() && !value.isEmpty()) {
                    label = value;
                }
                if (value.isEmpty() && !label.isEmpty()) {
                    value = label;
                }
            } else {
                String text = option.asString("").trim();
                label = text;
                value = text;
            }

            if (label.isEmpty() || value.isEmpty()) {
                continue;
            }

            out.add(Map.of("label", label, "value", value));
        }

        return out;
    }
}
