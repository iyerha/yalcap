package com.yalcap.security;

import java.util.List;
import java.util.Optional;

public interface SubjectProvider {

    Optional<SubjectIdentity> resolveSubject(SubjectReference subject, SubjectRequestContext requestContext);

    List<SubjectSearchResult> searchSubjects(SubjectSearchQuery query, SubjectRequestContext requestContext);

    SubjectValidationResult validateSubject(SubjectReference subject, SubjectRequestContext requestContext);
}