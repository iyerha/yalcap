package com.yalcap.security;

public record SubjectReference(
        SubjectType subjectType,
        String subjectId
) {
}