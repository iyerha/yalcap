package com.yalcap.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
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
        UUID tenantId = resolveTenantId(request);

        if (tenantId == null) {
            if (isTenantRequired(request)) {
                response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Tenant ID is required for "+request.getRequestURI());
                return;
            }

            filterChain.doFilter(request, response);
            return;
        }

        try {
            String uri = request.getRequestURI();
            String strippedUri = stripTenantPrefix(uri);
            
            HttpServletRequest wrappedRequest = new HttpServletRequestWrapper(request) {
                @Override
                public String getRequestURI() {
                    return strippedUri;
                }

                @Override
                public String getServletPath() {
                    return strippedUri;
                }
            };
            TenantContext.callWithTenantId(tenantId, () -> {
                filterChain.doFilter(wrappedRequest, response);
                return null;
            });
        } catch (IOException | ServletException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ServletException("Failed during tenant-scoped filter chain execution", ex);
        }
    }

    private UUID resolveTenantId(HttpServletRequest request) {
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

        if (candidate == null || candidate.isBlank()) {
            return null;
        }

        try {
            return UUID.fromString(candidate.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

        private boolean isTenantRequired(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String path = uri == null ? "" : uri;

        if (path.startsWith("/public/")) {
            return false;
        }

        if (path.startsWith("/assets/")) {
            return false;
        }

        if (path.startsWith("/js/")) {
            return false;
        }

        if (path.startsWith("/css/")) {
            return false;
        }

        if (path.startsWith("/webjars/")) {
            return false;
        }

        if (path.startsWith("/actuator/")) {
            return false;
        }

        return true;
    }

    private String stripTenantPrefix(String uri) {
        Matcher matcher = TENANT_PATH.matcher(uri == null ? "" : uri);
        if (matcher.matches()) {
            String path = uri.substring(matcher.start(1) + 36); // Skip /t/{uuid}
            return path.isEmpty() ? "/" : path;
        }
        return uri;
    }
}
