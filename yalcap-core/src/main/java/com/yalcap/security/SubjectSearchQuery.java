package com.yalcap.security;

import java.util.List;

public record SubjectSearchQuery(
        String searchText,
        List<SubjectType> subjectTypes,
        String memberOfGroupId,
        MatchMode matchMode,
        int limit,
        String cursor
) {

        public enum MatchMode {
                AUTO,        // default: starts-with for short text, starts+contains for longer text
                PREFIX,      // starts-with only
                CONTAINS,    // contains/token match
                EXACT        // exact id/email/userKey match
        }
}