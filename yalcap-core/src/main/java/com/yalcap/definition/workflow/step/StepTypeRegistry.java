package com.yalcap.definition.workflow.step;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class StepTypeRegistry {

    private final Map<String, StepType> byType;

    public StepTypeRegistry(List<StepType> plugins) {
        Map<String, StepType> map = new LinkedHashMap<>();

        for (StepType plugin : plugins) {
            if (plugin == null) {
                continue;
            }

            String key = normalizeType(plugin.type());
            if (key.isEmpty()) {
                throw new IllegalStateException("StepType type must not be blank: " + plugin.getClass().getName());
            }
            if (map.containsKey(key)) {
                throw new IllegalStateException("Duplicate StepType registration for type '" + key + "': "
                        + map.get(key).getClass().getName() + " and " + plugin.getClass().getName());
            }

            map.put(key, plugin);
        }

        this.byType = Map.copyOf(map);
    }

    public Optional<StepType> find(String type) {
        return Optional.ofNullable(byType.get(normalizeType(type)));
    }

    public Collection<StepType> all() {
        return byType.values();
    }

    public List<StepTypeDescriptor> descriptors() {
        return byType.values().stream()
                .map(StepType::descriptor)
                .toList();
    }

    private String normalizeType(String type) {
        if (type == null) {
            return "";
        }
        return type.trim().toLowerCase(Locale.ROOT);
    }
}
