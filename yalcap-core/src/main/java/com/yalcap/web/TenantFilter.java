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

@Component
public class TenantFilter extends OncePerRequestFilter {

    public static final String TENANT_HEADER = "X-Tenant-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String header = request.getHeader(TENANT_HEADER);
            if (header == null || header.isBlank()) {
                header = request.getParameter("tenant");
            }
            if (header != null && !header.isBlank()) {
                try {
                    UUID tenantId = UUID.fromString(header.trim());
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
