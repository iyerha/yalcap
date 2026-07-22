package com.yalcap.definition.form.load;

import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
public class FormLoadDataService {

    private final List<RegisteredProvider> providers;
    private final ObjectMapper objectMapper;

    public FormLoadDataService(@Nullable List<FormLoadDataProvider> providers,
                                        ObjectMapper objectMapper) {
        if (providers == null || providers.isEmpty()) {
            this.providers = List.of();
        } else {
            List<RegisteredProvider> nonNullProviders = new ArrayList<>(providers.size());
            for (FormLoadDataProvider provider : providers) {
                if (provider != null) {
                    Map<FormLoadDataPhase, List<AnnotatedHandler>> handlersByPhase = discoverAnnotatedHandlers(provider);
                    if (handlersByPhase.isEmpty()) {
                        throw new IllegalStateException("Form load provider must declare at least one @FormLoadPhaseHandler method: "
                                + provider.id());
                    }
                    nonNullProviders.add(new RegisteredProvider(provider, handlersByPhase));
                }
            }
            this.providers = List.copyOf(nonNullProviders);
        }
        this.objectMapper = objectMapper;
    }

    public ObjectNode load(FormLoadDataContext context) {
        ObjectNode merged = objectMapper.createObjectNode();
        FormLoadDataPhase phase = context.phase();
        List<RegisteredProvider> ordered = new ArrayList<>(providers);
        ordered.sort(Comparator
            .comparingInt((RegisteredProvider entry) -> entry.provider().order())
            .thenComparing(entry -> entry.provider().id()));

        for (RegisteredProvider registered : ordered) {
            FormLoadDataProvider provider = registered.provider();
            if (!provider.supports(context)) {
                continue;
            }

            ObjectNode contribution = objectMapper.createObjectNode();
            List<AnnotatedHandler> handlers = registered.handlersByPhase().get(phase);
            if (handlers == null || handlers.isEmpty()) {
                continue;
            }

            for (AnnotatedHandler handler : handlers) {
                ObjectNode handlerContribution = invokeAnnotatedHandler(provider, handler.method(), context);
                if (handlerContribution != null) {
                    contribution.setAll(handlerContribution);
                }
            }

            if (contribution != null) {
                merged.setAll(contribution);
            }
        }

        return merged;
    }

    public ObjectNode load(FormLoadDataContext context, FormLoadDataPhase phase) {
        FormLoadDataContext phasedContext = new FormLoadDataContext(
                context.definitionKey(),
                context.stepId(),
                context.userId(),
                context.userGroups(),
                context.tenantId(),
                context.data(),
                phase
        );
        return load(phasedContext);
    }

    private Map<FormLoadDataPhase, List<AnnotatedHandler>> discoverAnnotatedHandlers(FormLoadDataProvider provider) {
        Map<FormLoadDataPhase, List<AnnotatedHandler>> handlersByPhase = new HashMap<>();
        for (Method method : provider.getClass().getMethods()) {
            FormLoadPhaseHandler annotation = method.getAnnotation(FormLoadPhaseHandler.class);
            if (annotation == null) {
                continue;
            }

            validateHandlerMethod(provider, method);
            method.setAccessible(true);
            AnnotatedHandler handler = new AnnotatedHandler(method, annotation.order());
            for (FormLoadDataPhase phase : annotation.value()) {
                handlersByPhase.computeIfAbsent(phase, ignored -> new ArrayList<>()).add(handler);
            }
        }

        handlersByPhase.values().forEach(list -> list.sort(Comparator.comparingInt(AnnotatedHandler::order)));
        return handlersByPhase;
    }

    private void validateHandlerMethod(FormLoadDataProvider provider, Method method) {
        Class<?>[] parameterTypes = method.getParameterTypes();
        if (parameterTypes.length != 1 || !FormLoadDataContext.class.equals(parameterTypes[0])) {
            throw new IllegalStateException("Invalid @FormLoadPhaseHandler signature on "
                    + provider.id() + "#" + method.getName()
                    + ": expected exactly one FormLoadDataContext parameter");
        }

        if (!ObjectNode.class.isAssignableFrom(method.getReturnType())) {
            throw new IllegalStateException("Invalid @FormLoadPhaseHandler return type on "
                    + provider.id() + "#" + method.getName()
                    + ": expected ObjectNode return type");
        }
    }

    private ObjectNode invokeAnnotatedHandler(FormLoadDataProvider provider,
                                              Method method,
                                              FormLoadDataContext context) {
        try {
            return (ObjectNode) method.invoke(provider, context);
        } catch (InvocationTargetException ex) {
            Throwable cause = ex.getCause() == null ? ex : ex.getCause();
            throw new IllegalStateException("Form load phase handler failed: "
                    + provider.id() + "#" + method.getName(), cause);
        } catch (IllegalAccessException ex) {
            throw new IllegalStateException("Cannot access form load phase handler: "
                    + provider.id() + "#" + method.getName(), ex);
        }
    }

    private record RegisteredProvider(
            FormLoadDataProvider provider,
            Map<FormLoadDataPhase, List<AnnotatedHandler>> handlersByPhase
    ) {
    }

    private record AnnotatedHandler(
            Method method,
            int order
    ) {
    }
}
