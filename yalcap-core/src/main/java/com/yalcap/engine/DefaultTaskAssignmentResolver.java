package com.yalcap.engine;

import com.yalcap.acl.external.ExternalParticipantEntity;
import com.yalcap.acl.external.ExternalParticipantRepository;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
public class DefaultTaskAssignmentResolver implements TaskAssignmentResolver {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final ExternalParticipantRepository externalParticipantRepository;

    public DefaultTaskAssignmentResolver(ExternalParticipantRepository externalParticipantRepository) {
        this.externalParticipantRepository = externalParticipantRepository;
    }

    @Override
    public TaskAssignmentResolution resolve(UUID tenantId, TaskAssignmentIntent intent) {
        if (intent == null || intent.kind() == null) {
            throw new IllegalArgumentException("Task assignment intent kind is required");
        }

        String value = normalizeRequired(intent.value(), "Task assignment value is required");
        return switch (intent.kind()) {
            case INTERNAL_USER -> new TaskAssignmentResolution(AssigneeType.USER, value, null);
            case INTERNAL_GROUP -> new TaskAssignmentResolution(AssigneeType.GROUP, value, null);
            case EXTERNAL_EMAIL -> resolveExternalParticipant(tenantId, value);
        };
    }

    private TaskAssignmentResolution resolveExternalParticipant(UUID tenantId, String email) {
        String normalizedEmail = normalizeEmail(email);
        if (!EMAIL_PATTERN.matcher(normalizedEmail).matches()) {
            throw new IllegalArgumentException("External assignee email is invalid");
        }

        ExternalParticipantEntity participant = externalParticipantRepository
                .findByTenantIdAndPrimaryEmail(tenantId, normalizedEmail)
                .orElseGet(() -> createParticipant(tenantId, normalizedEmail));

        return new TaskAssignmentResolution(
            AssigneeType.EXTERNAL_PARTICIPANT,
                participant.getId().toString(),
                participant.getPrimaryEmail()
        );
    }

    private ExternalParticipantEntity createParticipant(UUID tenantId, String email) {
        OffsetDateTime now = OffsetDateTime.now();
        ExternalParticipantEntity participant = new ExternalParticipantEntity();
        participant.setId(UUID.randomUUID());
        participant.setTenantId(tenantId);
        participant.setPrimaryEmail(email);
        participant.setStatus("ACTIVE");
        participant.setCreatedAt(now);
        participant.setUpdatedAt(now);
        return externalParticipantRepository.save(participant);
    }

    private static String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private static String normalizeEmail(String email) {
        return normalizeRequired(email, "External assignee email is required")
                .toLowerCase(Locale.ROOT);
    }
}