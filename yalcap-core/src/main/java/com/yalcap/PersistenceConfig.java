package com.yalcap;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.Jsr310Converters;
import org.springframework.data.jdbc.core.convert.JdbcCustomConversions;
import org.springframework.data.jdbc.core.mapping.JdbcValue;
import org.springframework.data.relational.core.mapping.event.BeforeConvertCallback;
import org.springframework.util.IdGenerator;

import com.fasterxml.uuid.Generators;
import com.yalcap.tenant.TenantAware;
import com.yalcap.tenant.TenantContext;

import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.postgresql.util.PGobject;

import java.sql.JDBCType;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Configuration
public class PersistenceConfig {

    @Bean
    public JdbcCustomConversions jdbcCustomConversions(ObjectMapper objectMapper) {
        List<Converter<?, ?>> converters = new ArrayList<>();
        converters.add(new JsonNodeWritingConverter(objectMapper));
        converters.add(new PgObjectToJsonNodeReadingConverter(objectMapper));
        converters.add(new JsonNodeReadingConverter(objectMapper));
        converters.add(new TimestampToOffsetDateTimeConverter());
        converters.add(new OffsetDateTimeToTimestampConverter());
        // include JSR-310 converters for date/time if needed
        converters.addAll(Jsr310Converters.getConvertersToRegister());
        return new JdbcCustomConversions(converters);
    }

    @Bean
    public IdGenerator idGenerator() {
        return new IdGenerator() {
            @Override
            public UUID generateId() {
                return Generators.timeBasedGenerator().generate();
            }
        };
    }

    @Bean
    public BeforeConvertCallback<IdAware> setIdBeforeConvert(IdGenerator idGenerator) {
        return entity -> {
            if (entity.getId() == null) {
                entity.setId(idGenerator.generateId());
            }
            return entity;
        };
    }

    @Bean
    public BeforeConvertCallback<TenantAware> setTenantBeforeConvert() {
        return entity -> {
            if (entity.getTenantId() == null) {
                TenantContext.getTenantId().ifPresent(entity::setTenantId);
            }
            return entity;
        };
    }

    @WritingConverter
    static class JsonNodeWritingConverter implements Converter<JsonNode, JdbcValue> {
        private final ObjectMapper mapper;
        public JsonNodeWritingConverter(ObjectMapper mapper) { this.mapper = mapper; }
        @Override
        public JdbcValue convert(JsonNode source) {
            if (source == null) return null;
            try {
                return JdbcValue.of(mapper.writeValueAsString(source), JDBCType.OTHER);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }

    @ReadingConverter
    static class JsonNodeReadingConverter implements Converter<String, JsonNode> {
        private final ObjectMapper mapper;
        public JsonNodeReadingConverter(ObjectMapper mapper) { this.mapper = mapper; }
        @Override
        public JsonNode convert(String source) {
            if (source == null) return null;
            try {
                return mapper.readTree(source);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }

    static class PgObjectToJsonNodeReadingConverter implements Converter<PGobject, JsonNode> {
        private final ObjectMapper mapper;

        public PgObjectToJsonNodeReadingConverter(ObjectMapper mapper) {
            this.mapper = mapper;
        }

        @Override
        public JsonNode convert(PGobject source) {
            if (source == null || source.getValue() == null) {
                return null;
            }
            try {
                return mapper.readTree(source.getValue());
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }
    }

    @ReadingConverter
    static class TimestampToOffsetDateTimeConverter implements Converter<Timestamp, OffsetDateTime> {
        @Override
        public OffsetDateTime convert(Timestamp source) {
            return source == null ? null : source.toInstant().atOffset(OffsetDateTime.now().getOffset());
        }
    }

    @WritingConverter
    static class OffsetDateTimeToTimestampConverter implements Converter<OffsetDateTime, Timestamp> {
        @Override
        public Timestamp convert(OffsetDateTime source) {
            return source == null ? null : Timestamp.from(source.toInstant());
        }
    }
}
