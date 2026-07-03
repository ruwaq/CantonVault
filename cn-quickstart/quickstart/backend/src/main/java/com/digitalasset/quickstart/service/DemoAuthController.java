// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Server-side demo session factory.
 *
 * Instead of shipping credentials in the JavaScript bundle, the frontend passes
 * a {@code demoToken} configured via {@code DEMO_TOKEN} environment variable.
 * If {@code DEMO_TOKEN} is not set, this endpoint is disabled (returns 404).
 *
 * <p>Only active in the {@code shared-secret} profile; in OAuth2/production this
 * bean is never created.</p>
 *
 * <p>SECURITY: Always set {@code DEMO_TOKEN} to a non-empty value before exposing
 * this service to any network. An empty or missing token disables demo auth.</p>
 */
@RestController
@Profile("shared-secret")
public class DemoAuthController {

    private static final Logger log = LoggerFactory.getLogger(DemoAuthController.class);

    /** The expected demo token. If blank, the endpoint is disabled. */
    @Value("${demo.token:}")
    private String demoToken;

    /**
     * Creates a demo session authenticated as the AppProvider party.
     *
     * @param body    JSON with {@code demoToken} field matching {@code DEMO_TOKEN}
     * @param request servlet request for programmatic login
     * @return 200 with session cookie if authenticated, 401/404 otherwise
     */
    @PostMapping("/api/demo-session")
    public ResponseEntity<Map<String, String>> createDemoSession(
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request) {

        // If demo token is not configured, this endpoint is disabled
        if (demoToken == null || demoToken.isBlank()) {
            log.warn("DEMO_TOKEN not set — /api/demo-session is disabled");
            return ResponseEntity.status(404)
                    .body(Map.of("error", "Demo mode is not enabled"));
        }

        // Require the demo token in the request body
        String providedToken = body != null ? body.getOrDefault("demoToken", "") : "";
        if (!demoToken.equals(providedToken)) {
            log.warn("Invalid demo token attempt from {}", request.getRemoteAddr());
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Invalid demo token"));
        }

        try {
            request.login("app-provider", demoToken);
            return ResponseEntity.ok(Map.of("ok", "true"));
        } catch (ServletException e) {
            log.error("Demo session login failed", e);
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Demo authentication failed"));
        }
    }
}