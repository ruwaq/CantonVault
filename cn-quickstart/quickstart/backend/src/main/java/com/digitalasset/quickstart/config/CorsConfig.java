// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Shared CORS configuration.
 *
 * The CantonVault frontend may be served from a different origin than the backend
 * (Vite dev server on :5173, or a deployed static host). Without explicit CORS
 * the browser blocks cross-origin credentialed requests, which breaks the
 * session-cookie auth used by /vault/* endpoints. Allowed origins are configurable
 * via the CORS_ALLOWED_ORIGINS property (comma-separated); credentials are enabled
 * so the JSESSIONID / XSRF cookies travel with the request.
 */
@Configuration
public class CorsConfig {

    @Value("${cors.allowed-origins:http://localhost:5173,http://app-provider.localhost,http://app-provider.localhost:5173}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split("\\s*,\\s*")));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        // SECURITY (audit B-A1): with allowCredentials=true, the CORS spec
        // prohibits wildcard "*" for allowed headers. List headers explicitly.
        configuration.setAllowedHeaders(List.of(
            "Content-Type", "Authorization", "X-XSRF-TOKEN", "Idempotency-Key",
            "Accept", "Origin", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setExposedHeaders(List.of("X-XSRF-TOKEN"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
