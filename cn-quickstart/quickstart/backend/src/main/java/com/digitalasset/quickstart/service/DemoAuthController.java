// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Server-side demo session factory.
 *
 * Instead of shipping credentials in the JavaScript bundle, the frontend calls
 * this endpoint (no body needed) and the server authenticates as the demo party
 * using the Servlet 3.0 programmatic login API. The JSESSIONID cookie is set by
 * the container, so subsequent requests carry the session automatically.
 *
 * Only active in the {@code shared-secret} profile; in OAuth2/production this
 * bean is never created.
 */
@RestController
@Profile("shared-secret")
public class DemoAuthController {

    /** One-tap demo entry: authenticate as the AppProvider party server-side. */
    @PostMapping("/api/demo-session")
    public ResponseEntity<Map<String, String>> createDemoSession(HttpServletRequest request) {
        try {
            request.login("app-provider", "");
            return ResponseEntity.ok(Map.of("ok", "true"));
        } catch (ServletException e) {
            return ResponseEntity.status(401).body(Map.of("error", "Demo authentication failed"));
        }
    }
}