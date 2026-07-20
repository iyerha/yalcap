package com.yalcap.definition.form.load;

import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class FormLoadDataHydrationService {

    private final List<FormLoadDataProvider> providers;
    private final ObjectMapper objectMapper;

    public FormLoadDataHydrationService(@Nullable List<FormLoadDataProvider> providers,
                                        ObjectMapper objectMapper) {
        if (providers == null || providers.isEmpty()) {
            this.providers = List.of();
        } else {
            List<FormLoadDataProvider> nonNullProviders = new ArrayList<>(providers.size());
            for (FormLoadDataProvider provider : providers) {
                if (provider != null) {
                    nonNullProviders.add(provider);
                }
            }
            this.providers = List.copyOf(nonNullProviders);
        }
        this.objectMapper = objectMapper;
    }

    public ObjectNode hydrate(FormLoadDataContext context) {
        ObjectNode merged = objectMapper.createObjectNode();
        FormLoadDataPhase phase = context.phase();
        List<FormLoadDataProvider> ordered = new ArrayList<>(providers);
        ordered.sort(Comparator
                .comparingInt(FormLoadDataProvider::order)
                .thenComparing(FormLoadDataProvider::id, Comparator.nullsLast(String::compareTo)));

        for (FormLoadDataProvider provider : ordered) {
            if (!provider.supportsPhase(phase)) {
                continue;
            }

            if (!provider.supports(context)) {
                continue;
            }

            ObjectNode contribution;
            try {
                contribution = provider.load(context);
            } catch (RuntimeException ex) {
                throw new IllegalStateException("Form load data provider failed: " + provider.id(), ex);
            }

            if (contribution != null) {
                merged.setAll(contribution);
            }
        }

        return merged;
    }

    public ObjectNode hydrate(FormLoadDataContext context, FormLoadDataPhase phase) {
        FormLoadDataContext phasedContext = new FormLoadDataContext(
                context.definitionKey(),
                context.stepId(),
                context.userId(),
                context.userGroups(),
                context.tenantId(),
                context.data(),
                phase
        );
        return hydrate(phasedContext);
    }
}
