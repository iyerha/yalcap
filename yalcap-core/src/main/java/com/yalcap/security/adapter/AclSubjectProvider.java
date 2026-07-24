package com.yalcap.security.adapter;

import com.yalcap.acl.GroupEntity;
import com.yalcap.acl.GroupRepository;
import com.yalcap.acl.UserEntity;
import com.yalcap.acl.UserRepository;
import com.yalcap.acl.external.ExternalParticipantEntity;
import com.yalcap.acl.external.ExternalParticipantRepository;
import com.yalcap.security.SubjectIdentity;
import com.yalcap.security.SubjectProvider;
import com.yalcap.security.SubjectReference;
import com.yalcap.security.SubjectRequestContext;
import com.yalcap.security.SubjectSearchQuery;
import com.yalcap.security.SubjectSearchResult;
import com.yalcap.security.SubjectType;
import com.yalcap.security.SubjectValidationResult;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public class AclSubjectProvider implements SubjectProvider {
    private static final TypeReference<Map<String, Object>> ATTR_TYPE = new TypeReference<>() {};
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final ExternalParticipantRepository externalParticipantRepository;
    private final ObjectMapper objectMapper;

    public AclSubjectProvider(UserRepository userRepository,
                          GroupRepository groupRepository,
                          ExternalParticipantRepository externalParticipantRepository,
                          ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.groupRepository = groupRepository;
        this.externalParticipantRepository = externalParticipantRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<SubjectIdentity> resolveSubject(SubjectReference subject, SubjectRequestContext requestContext) {
        return switch (subject.subjectType()) {
            case USER -> resolveUser(subject.subjectId(), requestContext.tenantId());
            case GROUP -> resolveGroup(subject.subjectId(), requestContext.tenantId());
            case EXTERNAL_PARTICIPANT -> resolveExternalParticipant(subject.subjectId(), requestContext.tenantId());
        };
    }

    @Override
    public List<SubjectSearchResult> searchSubjects(SubjectSearchQuery query, SubjectRequestContext requestContext) {
        return List.of();
    }

    @Override
    public SubjectValidationResult validateSubject(SubjectReference subject, SubjectRequestContext requestContext) {
        boolean valid = resolveSubject(subject, requestContext).isPresent();
        return new SubjectValidationResult(subject, valid, valid ? null : "Subject could not be resolved by ACL provider");
    }

    private Optional<SubjectIdentity> resolveUser(String subjectId, UUID tenantId) {
        if (tenantId == null) {
            return Optional.empty();
        }

        return userRepository.findByTenantIdAndUserKey(tenantId, subjectId)
                .map(this::toUserIdentity);
    }

    private Optional<SubjectIdentity> resolveGroup(String subjectId, UUID tenantId) {
        return groupRepository.findByGroupKey(subjectId)
                .filter(group -> tenantId == null || tenantId.equals(group.getTenantId()))
                .map(this::toGroupIdentity);
    }

    private Optional<SubjectIdentity> resolveExternalParticipant(String subjectId, UUID tenantId) {
        if (tenantId == null) {
            return Optional.empty();
        }

        return externalParticipantRepository.findByTenantIdAndPrimaryEmail(tenantId, subjectId)
                .map(this::toExternalIdentity);
    }

    private SubjectIdentity toUserIdentity(UserEntity entity) {
        return new SubjectIdentity(
                new SubjectReference(SubjectType.USER, entity.getUserKey()),
                entity.getDisplayName(),
                entity.getPrimaryEmail(),
                null,
                entity.getAttributes() != null ? attributesToMap(entity.getAttributes()) : Collections.emptyMap()
        );
    }

    private Map<String, Object> attributesToMap(JsonNode attributes) {
        if (attributes == null || attributes.isNull() || !attributes.isObject()) {
            return Map.of();
        }
        return Map.copyOf(objectMapper.convertValue(attributes, ATTR_TYPE));
    }

    private SubjectIdentity toGroupIdentity(GroupEntity entity) {
        return new SubjectIdentity(
                new SubjectReference(SubjectType.GROUP, entity.getGroupKey()),
                entity.getName(),
                null,
                null,
                Collections.emptyMap()
        );
    }

    private SubjectIdentity toExternalIdentity(ExternalParticipantEntity entity) {
        return new SubjectIdentity(
                new SubjectReference(SubjectType.EXTERNAL_PARTICIPANT, entity.getPrimaryEmail()),
                entity.getDisplayName(),
                entity.getPrimaryEmail(),
                null,
                Collections.emptyMap()
        );
    }
}