package com.yalcap.definition.form.control;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class ControlTypeRegistry {

    private final Map<String, ControlType> byType;

    public ControlTypeRegistry(List<ControlType> plugins) {
        Map<String, ControlType> map = new LinkedHashMap<>();

        for (ControlType plugin : plugins) {
            if (plugin == null) {
                continue;
            }

            String key = normalizeType(plugin.type());
            if (key.isEmpty()) {
                throw new IllegalStateException("ControlTypePlugin type must not be blank: " + plugin.getClass().getName());
            }
            if (map.containsKey(key)) {
                throw new IllegalStateException("Duplicate ControlTypePlugin registration for type '" + key + "': "
                        + map.get(key).getClass().getName() + " and " + plugin.getClass().getName());
            }

            map.put(key, plugin);
        }

        this.byType = Map.copyOf(map);
    }

    public Optional<ControlType> find(String type) {
        return Optional.ofNullable(byType.get(normalizeType(type)));
    }

    public boolean isRegistered(String type) {
        return find(type).isPresent();
    }

    public Collection<ControlType> all() {
        return byType.values();
    }

    public List<ControlTypeDescriptor> descriptors() {
        return byType.values().stream()
                .map(ControlType::descriptor)
                .toList();
    }

    private String normalizeType(String type) {
        if (type == null) {
            return "";
        }
        return type.trim().toLowerCase(Locale.ROOT);
    }
}
