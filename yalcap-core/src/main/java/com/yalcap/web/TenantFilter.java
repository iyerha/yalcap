package com.yalcap.web;

import com.yalcap.persistence.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class TenantFilter extends OncePerRequestFilter {

    public static final String TENANT_HEADER = "X-Tenant-Id";
    private static final Pattern TENANT_PATH = Pattern.compile("^/t/([0-9a-fA-F\\-]{36})(?:/.*)?$");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String candidate = null;
            String uri = request.getRequestURI();
            Matcher matcher = TENANT_PATH.matcher(uri == null ? "" : uri);
            if (matcher.matches()) {
                candidate = matcher.group(1);
            }

            if (candidate == null || candidate.isBlank()) {
                candidate = request.getHeader(TENANT_HEADER);
            }
            if (candidate == null || candidate.isBlank()) {
                candidate = request.getParameter("tenant");
            }

            if (candidate != null && !candidate.isBlank()) {
                try {
                    UUID tenantId = UUID.fromString(candidate.trim());
                    TenantContext.setTenantId(tenantId);
                } catch (IllegalArgumentException e) {
                    // invalid tenant id - ignore and proceed without setting
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
