package com.yalcap.definition.form.load;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FormLoadDataServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void hydrate_usesAnnotatedHandlerForPhase() {
        FormLoadDataService service = new FormLoadDataService(
                List.of(new AnnotatedProvider(objectMapper)),
                objectMapper
        );

        ObjectNode base = objectMapper.createObjectNode();
        FormLoadDataContext context = new FormLoadDataContext(
                "sample",
                "review",
                "user-1",
                List.of("ops"),
                UUID.randomUUID(),
                base,
                FormLoadDataPhase.PRE_TASK_CREATE
        );

        ObjectNode hydrated = service.load(context);
        assertEquals("pre-create", hydrated.path("phaseValue").asString(""));
    }

    @Test
        void constructor_rejectsProviderWithoutAnnotatedHandlers() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> new FormLoadDataService(List.of(new NoAnnotationProvider()), objectMapper));

        assertEquals("Form load provider must declare at least one @FormLoadPhaseHandler method: no-annotation-provider", ex.getMessage());
    }

    private static final class AnnotatedProvider implements FormLoadDataProvider {

        private final ObjectMapper objectMapper;

        private AnnotatedProvider(ObjectMapper objectMapper) {
            this.objectMapper = objectMapper;
        }

        @Override
        public String id() {
            return "annotated-provider";
        }

        @FormLoadPhaseHandler(FormLoadDataPhase.PRE_TASK_CREATE)
        public ObjectNode preCreate(FormLoadDataContext context) {
            ObjectNode out = objectMapper.createObjectNode();
            out.put("phaseValue", "pre-create");
            return out;
        }

    }

    private static final class NoAnnotationProvider implements FormLoadDataProvider {

        @Override
        public String id() {
            return "no-annotation-provider";
        }
    }
}
