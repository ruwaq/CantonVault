// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import com.digitalasset.quickstart.config.VaultPartyProperties;
import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.ledger.TokenStandardProxy;
import com.digitalasset.quickstart.repository.DamlRepository;
import com.digitalasset.quickstart.security.AuthUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Validation-layer tests for the Vault REST endpoints.
 *
 * These tests verify that invalid inputs are rejected by Jakarta Bean Validation
 * <em>before</em> they reach the service layer. They do not require a running
 * Canton ledger — all external dependencies are mocked.
 *
 * The {@code GlobalExceptionHandler} maps validation failures to 400 with a
 * descriptive {@code {"error": "…"}} body. CSRF tokens are included via
 * {@code SecurityMockMvcRequestPostProcessors.csrf()}.
 */
@WebMvcTest(CommitmentController.class)
@TestPropertySource(properties = {
    "BACKEND_PORT=8080",
    "REGISTRY_BASE_URI=http://localhost:9090",
    "APP_PROVIDER_PARTY=app-provider::default",
    "AUTH_APP_PROVIDER_BACKEND_USER_ID=AppId",
    "CORS_ALLOWED_ORIGINS=http://localhost:5173",
    "VAULT_PROPOSER_PARTY=proposer::default",
    "VAULT_ACCEPTER_PARTY=accepter::default",
    "VAULT_THIRDPARTY_PARTY=thirdparty::default"
})
@WithMockUser
class CommitmentControllerTest {

    @Autowired private MockMvc mvc;

    @MockBean private LedgerApi ledger;
    @MockBean private AuthUtils auth;
    @MockBean private DamlRepository damlRepository;
    @MockBean private TokenStandardProxy tokenStandardProxy;
    @MockBean private VaultPartyProperties vaultPartyProperties;

    @Test
    void rejectsNegativeAmount() throws Exception {
        mvc.perform(post("/vault/proposals")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "accepter": "party-123",
                              "thirdParty": "party-456",
                              "amount": -5,
                              "currency": "CC",
                              "description": "test",
                              "workflow": "supply-chain-finance",
                              "deadlineSeconds": 3600
                            }"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(
                        org.hamcrest.Matchers.containsString("amount")));
    }

    @Test
    void rejectsMissingFields() throws Exception {
        mvc.perform(post("/vault/proposals")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsBlankCurrency() throws Exception {
        mvc.perform(post("/vault/proposals")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "accepter": "party-123",
                              "thirdParty": "party-456",
                              "amount": 100,
                              "currency": "",
                              "description": "test",
                              "workflow": "supply-chain-finance",
                              "deadlineSeconds": 3600
                            }"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(
                        org.hamcrest.Matchers.containsString("currency")));
    }

    @Test
    void rejectsZeroDeadlineSeconds() throws Exception {
        mvc.perform(post("/vault/proposals")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "accepter": "party-123",
                              "thirdParty": "party-456",
                              "amount": 100,
                              "currency": "CC",
                              "description": "test",
                              "workflow": "supply-chain-finance",
                              "deadlineSeconds": 0
                            }"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(
                        org.hamcrest.Matchers.containsString("deadlineSeconds")));
    }

    @Test
    void rejectsExcessiveDeadline() throws Exception {
        mvc.perform(post("/vault/proposals")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "accepter": "party-123",
                              "thirdParty": "party-456",
                              "amount": 100,
                              "currency": "CC",
                              "description": "test",
                              "workflow": "supply-chain-finance",
                              "deadlineSeconds": 99999999
                            }"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(
                        org.hamcrest.Matchers.containsString("deadlineSeconds")));
    }

    @Test
    void rejectsBlankReasonInDispute() throws Exception {
        mvc.perform(post("/vault/commitments/abc-123/raise-dispute")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "reason": "" }"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(
                        org.hamcrest.Matchers.containsString("reason")));
    }

    @Test
    void rejectsBlankRulingInResolve() throws Exception {
        mvc.perform(post("/vault/commitments/abc-123/resolve")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "ruling": "" }"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(
                        org.hamcrest.Matchers.containsString("ruling")));
    }
}