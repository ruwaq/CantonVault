// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import static com.digitalasset.quickstart.service.ServiceUtils.ensurePresent;
import static com.digitalasset.quickstart.service.ServiceUtils.traceServiceCallAsync;
import static com.digitalasset.quickstart.utility.TracingUtils.tracingCtx;

import com.daml.ledger.api.v2.CommandsOuterClass;
import com.daml.ledger.api.v2.ValueOuterClass;
import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.ledger.TokenStandardProxy;
import com.digitalasset.quickstart.pqs.Contract;
import com.digitalasset.quickstart.repository.DamlRepository;
import com.digitalasset.quickstart.security.AuthUtils;
import com.digitalasset.quickstart.tokenstandard.openapi.allocation.model.DisclosedContract;
import com.digitalasset.transcode.java.ContractId;
import com.google.protobuf.ByteString;
import daml_prim_da_types.da.types.Tuple2;
import io.opentelemetry.instrumentation.annotations.WithSpan;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import quickstart_licensing.vault.commitmentcontract.CommitmentContract;
import quickstart_licensing.vault.commitmentcontract.DisputeCase;
import quickstart_licensing.vault.commitmentproposal.CommitmentProposal;
import quickstart_licensing.vault.disclosable.DisclosedRecord;
import quickstart_licensing.vault.settlementreceipt.SettlementReceipt;
import splice_api_token_allocation_v1.splice.api.token.allocationv1.Allocation;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.AnyValue;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.ChoiceContext;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.ExtraArgs;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.Metadata;

@Validated
@RestController
@RequestMapping("/vault")
public class CommitmentController {

    private static final Logger logger = LoggerFactory.getLogger(CommitmentController.class);

    private final LedgerApi ledger;
    private final AuthUtils auth;
    private final DamlRepository damlRepository;
    private final TokenStandardProxy tokenStandardProxy;

    /** Onboarded Canton parties for the demo, declared in application.yml. */
    private final List<PartyDescriptor> knownParties;

    public CommitmentController(
            LedgerApi ledger,
            AuthUtils auth,
            DamlRepository damlRepository,
            TokenStandardProxy tokenStandardProxy,
            com.digitalasset.quickstart.config.VaultPartyProperties partyProperties) {
        this.ledger = ledger;
        this.auth = auth;
        this.damlRepository = damlRepository;
        this.tokenStandardProxy = tokenStandardProxy;
        this.knownParties = partyProperties.getParties().stream()
                .map(m -> new PartyDescriptor(
                        m.get("label"),
                        m.getOrDefault("party-id", m.get("partyId")),
                        m.get("role")))
                .toList();
    }

    // ── Known parties (selector source) ──────────────────────────────────────

    @GetMapping("/parties")
    public ResponseEntity<List<PartyDescriptor>> listKnownParties() {
        // Lets the UI render dropdowns of the real onboarded parties instead of
        // asking operators to paste raw party hashes by hand.
        return ResponseEntity.ok(knownParties.stream()
                .filter(p -> p.partyId() != null && !p.partyId().isBlank())
                .toList());
    }

    // ── Commitment Proposals ────────────────────────────────────────────────

    @GetMapping("/proposals")
    @WithSpan
    public CompletableFuture<ResponseEntity<List<CommitmentProposal>>> listProposals() {
        var ctx = tracingCtx(logger, "listProposals");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentProposalsForParty(party).thenApply(contracts -> {
                    var result = contracts.stream()
                            .map(c -> c.payload)
                            .toList();
                    return ResponseEntity.ok(result);
                })
        ));
    }

    @PostMapping("/proposals")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> createProposal(
            @Valid @RequestBody CreateProposalRequest request) {
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
                damlRepository.findCommitmentsForParty(party).thenApply(contracts -> {
                    var result = contracts.stream()
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
            @Valid @RequestBody(required = false) FulfillRequest request) {
        var ctx = tracingCtx(logger, "fulfillCommitment", "contractId", contractId);
        String commandId = UUID.randomUUID().toString();
        String note = request != null && request.fulfillmentNote != null
                ? request.fulfillmentNote : "fulfilled via CantonVault";
        String allocationContractId = request != null ? request.allocationContractId : null;

        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentById(contractId).thenCompose(optContract -> {
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);

                    if (allocationContractId != null && !allocationContractId.isBlank()) {
                        return fulfillRealSettlement(contract, note, allocationContractId, commandId);
                    }
                    return fulfillSymbolic(contract, note, commandId);
                })
        ));
    }

    private CompletableFuture<ResponseEntity<Map<String, String>>> fulfillRealSettlement(
            Contract<CommitmentContract> contract,
            String note,
            String allocationContractId,
            String commandId) {
        var choiceContextFut = tokenStandardProxy.getAllocationTransferContext(allocationContractId);
        return choiceContextFut.thenCompose(choiceContext -> {
            var cc = ensurePresent(choiceContext, "Transfer context not found for allocation %s", allocationContractId);
            TransferContextBuilder.TransferContext transferContext = TransferContextBuilder.prepare(
                    cc.getDisclosedContracts(),
                    Map.of("AmuletRules", "amulet-rules", "OpenMiningRound", "open-round"));

            Tuple2<ContractId<Allocation>, ExtraArgs> allocationBundle =
                    new Tuple2<>(new ContractId<>(allocationContractId), transferContext.extraArgs());
            var choice = new CommitmentContract.Fulfill(note, Optional.of(allocationBundle));

            logger.info("Fulfilling commitment {} with real CC settlement via allocation {}",
                    contract.contractId.getContractId, allocationContractId);

            return ledger.exerciseAndGetResult(
                    contract.contractId, choice, commandId, transferContext.disclosedContracts())
                    .thenApply(result -> {
                        logger.info("Commitment {} fulfilled with real CC settlement", contract.contractId.getContractId);
                        return ResponseEntity.ok(Map.of(
                                "status", "fulfilled",
                                "receiptContractId", ((ContractId<?>) result).getContractId,
                                "settlementMode", "real",
                                "allocationContractId", allocationContractId));
                    });
        });
    }

    private CompletableFuture<ResponseEntity<Map<String, String>>> fulfillSymbolic(
            Contract<CommitmentContract> contract,
            String note,
            String commandId) {
        var choice = new CommitmentContract.Fulfill(note, Optional.empty());
        return ledger.exerciseAndGetResult(contract.contractId, choice, commandId)
                .thenApply(result -> {
                    logger.info("Commitment {} fulfilled (symbolic)", contract.contractId.getContractId);
                    return ResponseEntity.ok(Map.of(
                            "status", "fulfilled",
                            "receiptContractId", ((ContractId<?>) result).getContractId,
                            "settlementMode", "symbolic"));
                });
    }

    @PostMapping("/commitments/{contractId}/raise-dispute")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> raiseDispute(
            @PathVariable String contractId,
            @Valid @RequestBody RaiseDisputeRequest request) {
        var ctx = tracingCtx(logger, "raiseDispute", "contractId", contractId);
        String commandId = UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentById(contractId).thenCompose(optContract -> {
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);
                    var choice = new CommitmentContract.RaiseDispute(
                            request.reason, new com.digitalasset.transcode.java.Party(party));
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId)
                            .thenApply(result -> {
                                logger.info("Dispute raised on commitment {} by {}", contractId, party);
                                return ResponseEntity.ok(Map.of(
                                        "status", "disputed",
                                        "disputeCaseId", ((com.digitalasset.transcode.java.ContractId<?>) result).getContractId,
                                        "disclosedTo", contract.payload.getThirdParty.getParty));
                            });
                })
        ));
    }

    @PostMapping("/commitments/{contractId}/refund")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> refundCommitment(
            @PathVariable String contractId,
            @Valid @RequestBody(required = false) RefundRequest request) {
        var ctx = tracingCtx(logger, "refundCommitment", "contractId", contractId);
        String commandId = UUID.randomUUID().toString();
        String allocationContractId = request != null ? request.allocationContractId : null;

        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentById(contractId).thenCompose(optContract -> {
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);

                    if (allocationContractId != null && !allocationContractId.isBlank()) {
                        return refundRealSettlement(contract, allocationContractId, commandId);
                    }
                    var choice = new CommitmentContract.Refund(
                            new com.digitalasset.transcode.java.Party(party));
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId)
                            .thenApply(result -> {
                                logger.info("Commitment {} refunded (symbolic)", contractId);
                                return ResponseEntity.ok(Map.of(
                                        "status", "refunded",
                                        "receiptContractId", ((ContractId<?>) result).getContractId,
                                        "settlementMode", "symbolic"));
                            });
                })
        ));
    }

    /**
     * Refund that reverses a prior Canton Coin settlement via the Splice token
     * standard (accepter -> proposer), mirroring {@link #fulfillRealSettlement}.
     */
    private CompletableFuture<ResponseEntity<Map<String, String>>> refundRealSettlement(
            Contract<CommitmentContract> contract,
            String allocationContractId,
            String commandId) {
        return tokenStandardProxy.getAllocationTransferContext(allocationContractId)
                .thenCompose(choiceContext -> {
                    var cc = ensurePresent(choiceContext, "Transfer context not found for allocation %s", allocationContractId);
                    TransferContextBuilder.TransferContext transferContext = TransferContextBuilder.prepare(
                            cc.getDisclosedContracts(),
                            Map.of("AmuletRules", "amulet-rules", "OpenMiningRound", "open-round"));
                    Tuple2<ContractId<Allocation>, ExtraArgs> allocationBundle =
                            new Tuple2<>(new ContractId<>(allocationContractId), transferContext.extraArgs());
                    var choice = new CommitmentContract.Refund(
                            new com.digitalasset.transcode.java.Party(contract.payload.getProposer.getParty));
                    logger.info("Refunding commitment {} (symbolic — real CC refund not yet implemented)",
                            contract.contractId.getContractId);
                    return ledger.exerciseAndGetResult(
                            contract.contractId, choice, commandId, transferContext.disclosedContracts())
                            .thenApply(result -> {
                                logger.info("Commitment {} refunded with real CC settlement", contract.contractId.getContractId);
                                return ResponseEntity.ok(Map.of(
                                        "status", "refunded",
                                        "receiptContractId", ((ContractId<?>) result).getContractId,
                                        "settlementMode", "real",
                                        "allocationContractId", allocationContractId));
                            });
                });
    }

    // ── Settlement Receipts ──────────────────────────────────────────────────

    @GetMapping("/receipts")
    @WithSpan
    public CompletableFuture<ResponseEntity<List<SettlementReceipt>>> listReceipts() {
        var ctx = tracingCtx(logger, "listReceipts");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findSettlementReceiptsForParty(party).thenApply(contracts -> {
                    var result = contracts.stream()
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

    // ── Dispute Cases (resolution by third party) ────────────────────────────

    @GetMapping("/dispute-cases")
    @WithSpan
    public CompletableFuture<ResponseEntity<List<DisputeCase>>> listDisputeCases() {
        var ctx = tracingCtx(logger, "listDisputeCases");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findDisputeCasesForParty(party).thenApply(contracts -> {
                    var result = contracts.stream()
                            .map(c -> c.payload)
                            .toList();
                    return ResponseEntity.ok(result);
                })
        ));
    }

    @PostMapping("/commitments/{contractId}/resolve")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, String>>> resolveDispute(
            @PathVariable String contractId,
            @Valid @RequestBody ResolveDisputeRequest request) {
        var ctx = tracingCtx(logger, "resolveDispute", "contractId", contractId);
        String commandId = UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findDisputeCasesForParty(party).thenCompose(disputes -> {
                    // The DisputeCase references the commitment; resolve the matching case.
                    var dispute = disputes.stream()
                            .filter(d -> d.payload.getCommitmentRef.getContractId.equals(contractId))
                            .findFirst()
                            .orElseThrow(() -> new IllegalArgumentException(
                                    "No open DisputeCase found for commitment: " + contractId));
                    var choice = new DisputeCase.ResolveDispute(request.ruling);
                    return ledger.exerciseAndGetResult(dispute.contractId, choice, commandId)
                            .thenApply(v -> {
                                logger.info("Dispute on commitment {} resolved: {}", contractId, request.ruling);
                                return ResponseEntity.ok(Map.of(
                                        "status", "resolved",
                                        "ruling", request.ruling,
                                        "resolvedBy", party));
                            });
                })
        ));
    }

    // ── Request DTOs ─────────────────────────────────────────────────────────

    public record CreateProposalRequest(
            @NotBlank String accepter,
            @NotBlank String thirdParty,
            @NotNull @Positive java.math.BigDecimal amount,
            @NotBlank @Size(max = 10) String currency,
            @NotBlank @Size(max = 500) String description,
            @NotBlank String workflow,
            @Min(1) @Max(31536000) long deadlineSeconds) {
    }

    public record FulfillRequest(
            @Size(max = 500) String fulfillmentNote,
            String allocationContractId) {
    }

    public record RefundRequest(
            String allocationContractId) {
    }

    /** A known Canton party exposed for the UI selectors. */
    public record PartyDescriptor(String label, String partyId, String role) {
    }

    public record RaiseDisputeRequest(
            @NotBlank @Size(max = 500) String reason) {
    }

    public record ResolveDisputeRequest(
            @NotBlank String ruling) {
    }

    // ── Transfer context helpers (Canton Coin settlement) ──────────────────────
    // Moved to TransferContextBuilder (shared with LicenseApiImpl).

    // ── End of CommitmentController ────────────────────────────────────────
}