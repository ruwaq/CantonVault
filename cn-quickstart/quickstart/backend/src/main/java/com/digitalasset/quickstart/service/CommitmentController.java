// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import static com.digitalasset.quickstart.service.ServiceUtils.ensurePresent;
import static com.digitalasset.quickstart.service.ServiceUtils.traceServiceCallAsync;
import static com.digitalasset.quickstart.utility.TracingUtils.tracingCtx;

import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.repository.DamlRepository;
import com.digitalasset.quickstart.security.AuthUtils;
import io.opentelemetry.instrumentation.annotations.WithSpan;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import quickstart_licensing.vault.commitmentcontract.CommitmentContract;
import quickstart_licensing.vault.commitmentcontract.DisputeCase;
import quickstart_licensing.vault.commitmentproposal.CommitmentProposal;
import quickstart_licensing.vault.disclosable.DisclosedRecord;
import quickstart_licensing.vault.settlementreceipt.SettlementReceipt;

@RestController
@RequestMapping("/vault")
public class CommitmentController {

    private static final Logger logger = LoggerFactory.getLogger(CommitmentController.class);

    private final LedgerApi ledger;
    private final AuthUtils auth;
    private final DamlRepository damlRepository;

    public CommitmentController(LedgerApi ledger, AuthUtils auth, DamlRepository damlRepository) {
        this.ledger = ledger;
        this.auth = auth;
        this.damlRepository = damlRepository;
    }

    // ── Commitment Proposals ────────────────────────────────────────────────

    @GetMapping("/proposals")
    @WithSpan
    public CompletableFuture<ResponseEntity<List<CommitmentProposal>>> listProposals() {
        var ctx = tracingCtx(logger, "listProposals");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findActiveCommitmentProposals().thenApply(contracts -> {
                    var result = contracts.stream()
                            .filter(c -> {
                                String proposer = c.payload.getProposer.getParty;
                                String accepter = c.payload.getAccepter.getParty;
                                return party.equals(proposer) || party.equals(accepter);
                            })
                            .map(c -> c.payload)
                            .toList();
                    return ResponseEntity.ok(result);
                })
        ));
    }

    @PostMapping("/proposals")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> createProposal(
            @RequestBody CreateProposalRequest request) {
        var ctx = tracingCtx(logger, "createProposal");
        String commandId = UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () -> {
            Instant deadline = Instant.now().plus(request.deadlineSeconds, ChronoUnit.SECONDS);
            var proposal = new CommitmentProposal(
                    new com.digitalasset.transcode.java.Party(party),
                    new com.digitalasset.transcode.java.Party(request.accepter),
                    new com.digitalasset.transcode.java.Party(request.thirdParty),
                    request.amount,
                    request.currency,
                    request.description,
                    request.workflow,
                    deadline);
            return ledger.create(proposal, commandId)
                    .thenApply(v -> {
                        logger.info("Proposal created by {}", party);
                        return ResponseEntity.status(HttpStatus.CREATED)
                                .body(Map.of("status", "created", "commandId", commandId));
                    });
        }));
    }

    @PostMapping("/proposals/{contractId}/accept")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> acceptProposal(
            @PathVariable String contractId) {
        var ctx = tracingCtx(logger, "acceptProposal", "contractId", contractId);
        String commandId = UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentProposalById(contractId).thenCompose(optContract -> {
                    var contract = ensurePresent(optContract, "Proposal not found: %s", contractId);
                    var choice = new CommitmentProposal.AcceptProposal();
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId)
                            .thenApply(result -> {
                                logger.info("Proposal {} accepted, new contract: {}",
                                        contractId, ((com.digitalasset.transcode.java.ContractId<?>) result).getContractId);
                                return ResponseEntity.ok(Map.of(
                                        "status", "accepted",
                                        "commitmentContractId", ((com.digitalasset.transcode.java.ContractId<?>) result).getContractId));
                            });
                })
        ));
    }

    @PostMapping("/proposals/{contractId}/reject")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> rejectProposal(
            @PathVariable String contractId) {
        var ctx = tracingCtx(logger, "rejectProposal", "contractId", contractId);
        String commandId = UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentProposalById(contractId).thenCompose(optContract -> {
                    var contract = ensurePresent(optContract, "Proposal not found: %s", contractId);
                    var choice = new CommitmentProposal.RejectProposal();
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId)
                            .thenApply(v -> ResponseEntity.ok(Map.of("status", "rejected")));
                })
        ));
    }

    // ── Commitments ──────────────────────────────────────────────────────────

    @GetMapping("/commitments")
    @WithSpan
    public CompletableFuture<ResponseEntity<List<CommitmentContract>>> listCommitments() {
        var ctx = tracingCtx(logger, "listCommitments");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findActiveCommitments().thenApply(contracts -> {
                    var result = contracts.stream()
                            .filter(c -> {
                                String proposer = c.payload.getProposer.getParty;
                                String accepter = c.payload.getAccepter.getParty;
                                return party.equals(proposer) || party.equals(accepter);
                            })
                            .map(c -> c.payload)
                            .toList();
                    return ResponseEntity.ok(result);
                })
        ));
    }

    @PostMapping("/commitments/{contractId}/fulfill")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> fulfillCommitment(
            @PathVariable String contractId,
            @RequestBody(required = false) FulfillRequest request) {
        var ctx = tracingCtx(logger, "fulfillCommitment", "contractId", contractId);
        String commandId = UUID.randomUUID().toString();
        String note = request != null && request.fulfillmentNote != null
                ? request.fulfillmentNote : "fulfilled via CantonVault";
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentById(contractId).thenCompose(optContract -> {
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);
                    // Symbolic fulfillment — allocationCid = null (no real CC transfer)
                    // For real Canton Coin settlement, pass an Allocation contractId.
                    var choice = new CommitmentContract.Fulfill(note, Optional.empty());
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId)
                            .thenApply(result -> {
                                logger.info("Commitment {} fulfilled", contractId);
                                return ResponseEntity.ok(Map.of(
                                        "status", "fulfilled",
                                        "receiptContractId", ((com.digitalasset.transcode.java.ContractId<?>) result).getContractId));
                            });
                })
        ));
    }

    @PostMapping("/commitments/{contractId}/raise-dispute")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> raiseDispute(
            @PathVariable String contractId,
            @RequestBody RaiseDisputeRequest request) {
        var ctx = tracingCtx(logger, "raiseDispute", "contractId", contractId);
        String commandId = UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentById(contractId).thenCompose(optContract -> {
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);
                    var choice = new CommitmentContract.RaiseDispute(request.reason);
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId)
                            .thenApply(result -> {
                                logger.info("Dispute raised on commitment {}", contractId);
                                return ResponseEntity.ok(Map.of(
                                        "status", "disputed",
                                        "disputeCaseId", ((com.digitalasset.transcode.java.ContractId<?>) result).getContractId));
                            });
                })
        ));
    }

    @PostMapping("/commitments/{contractId}/refund")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> refundCommitment(
            @PathVariable String contractId) {
        var ctx = tracingCtx(logger, "refundCommitment", "contractId", contractId);
        String commandId = UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentById(contractId).thenCompose(optContract -> {
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);
                    var choice = new CommitmentContract.Refund(
                            new com.digitalasset.transcode.java.Party(party));
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId)
                            .thenApply(v -> {
                                logger.info("Commitment {} refunded", contractId);
                                return ResponseEntity.ok(Map.of("status", "refunded"));
                            });
                })
        ));
    }

    // ── Settlement Receipts ──────────────────────────────────────────────────

    @GetMapping("/receipts")
    @WithSpan
    public CompletableFuture<ResponseEntity<List<SettlementReceipt>>> listReceipts() {
        var ctx = tracingCtx(logger, "listReceipts");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findSettlementReceipts().thenApply(contracts -> {
                    var result = contracts.stream()
                            .filter(c -> {
                                String proposer = c.payload.getProposer.getParty;
                                String accepter = c.payload.getAccepter.getParty;
                                return party.equals(proposer) || party.equals(accepter);
                            })
                            .map(c -> c.payload)
                            .toList();
                    return ResponseEntity.ok(result);
                })
        ));
    }

    // ── Disclosed Records (Selective Disclosure) ────────────────────────────

    @GetMapping("/disclosures")
    @WithSpan
    public CompletableFuture<ResponseEntity<List<DisclosedRecord>>> listDisclosures() {
        var ctx = tracingCtx(logger, "listDisclosures");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findDisclosedRecordsForObserver(party).thenApply(contracts -> {
                    var result = contracts.stream()
                            .filter(c -> {
                                String observer = c.payload.getObserver.getParty;
                                String discloser = c.payload.getDiscloser.getParty;
                                return party.equals(observer) || party.equals(discloser);
                            })
                            .map(c -> c.payload)
                            .toList();
                    return ResponseEntity.ok(result);
                })
        ));
    }

    @PostMapping("/commitments/{contractId}/disclose")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> discloseCommitment(
            @PathVariable String contractId,
            @RequestBody DiscloseRequest request) {
        var ctx = tracingCtx(logger, "discloseCommitment", "contractId", contractId);
        String commandId = UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentById(contractId).thenCompose(optContract -> {
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);
                    var choice = new CommitmentContract.RaiseDispute("selective-disclosure: " + request.reason);
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId)
                            .thenApply(result -> {
                                logger.info("Disclosure executed on commitment {}", contractId);
                                return ResponseEntity.ok(Map.of(
                                        "status", "disclosed",
                                        "disputeCaseId", ((com.digitalasset.transcode.java.ContractId<?>) result).getContractId));
                            });
                })
        ));
    }

    // ── Request DTOs ─────────────────────────────────────────────────────────

    public record CreateProposalRequest(
            String accepter,
            String thirdParty,
            java.math.BigDecimal amount,
            String currency,
            String description,
            String workflow,
            long deadlineSeconds) {
    }

    public record FulfillRequest(String fulfillmentNote) {
    }

    public record RaiseDisputeRequest(String reason) {
    }

    public record DiscloseRequest(String reason) {
    }
}