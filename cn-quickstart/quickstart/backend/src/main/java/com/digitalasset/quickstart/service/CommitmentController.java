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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import quickstart_licensing.vault.commitmentcontract.CommitmentContract;
import quickstart_licensing.vault.commitmentcontract.DisputeCase;
import quickstart_licensing.vault.commitmentproposal.CommitmentProposal;
import quickstart_licensing.vault.disclosable.DisclosedRecord;
import quickstart_licensing.vault.settlementreceipt.SettlementReceipt;
import splice_api_token_allocation_request_v1.splice.api.token.allocationrequestv1.AllocationRequest;
import splice_api_token_allocation_v1.splice.api.token.allocationv1.Allocation;
import splice_api_token_allocation_v1.splice.api.token.allocationv1.TransferLeg;
import splice_api_token_holding_v1.splice.api.token.holdingv1.Holding;
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

    /** When false, rejects Fulfill/Refund with null allocationCid (production mode). */
    @Value("${canton-vault.symbolic-settlement-enabled:true}")
    private boolean symbolicSettlementEnabled;

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
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateProposalRequest request) {
        var ctx = tracingCtx(logger, "createProposal");
        String commandId = idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString();
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
                    deadline,
                    new com.digitalasset.transcode.java.Party(party),
                    // SECURITY (audit H3): proposals created when symbolic settlement
                    // is disabled require real CC settlement. Mirrors the DAML-level
                    // guard. In dev/demo mode (symbolic enabled), symbolic is allowed.
                    !symbolicSettlementEnabled);
            return ledger.create(proposal, commandId, party)
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
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String contractId) {
        var ctx = tracingCtx(logger, "acceptProposal", "contractId", contractId);
        String commandId = idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentProposalByIdForParty(contractId, party).thenCompose(optContract -> {
                    // Scoped lookup above ensures only the proposer or accepter can act on the proposal.
                    var contract = ensurePresent(optContract, "Proposal not found: %s", contractId);
                    var choice = new CommitmentProposal.AcceptProposal();
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId, party)
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
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String contractId) {
        var ctx = tracingCtx(logger, "rejectProposal", "contractId", contractId);
        String commandId = idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentProposalByIdForParty(contractId, party).thenCompose(optContract -> {
                    // Scoped lookup: only the proposer or accepter can reject the proposal.
                    var contract = ensurePresent(optContract, "Proposal not found: %s", contractId);
                    var choice = new CommitmentProposal.RejectProposal();
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId, party)
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
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String contractId,
            @Valid @RequestBody(required = false) FulfillRequest request) {
        var ctx = tracingCtx(logger, "fulfillCommitment", "contractId", contractId);
        String commandId = idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString();
        String note = request != null && request.fulfillmentNote != null
                ? request.fulfillmentNote : "fulfilled via CantonVault";
        String allocationContractId = request != null ? request.allocationContractId : null;

        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentByIdForParty(contractId, party).thenCompose(optContract -> {
                    // Scoped lookup: only a party to the commitment (proposer/accepter) can fulfill it.
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);

                    if (allocationContractId != null && !allocationContractId.isBlank()) {
                        return fulfillRealSettlement(contract, note, allocationContractId, commandId, party);
                    }
                    if (!symbolicSettlementEnabled) {
                        return CompletableFuture.completedFuture(
                                ResponseEntity.badRequest().body(Map.of(
                                        "error", "Symbolic settlement is disabled. Provide an allocationContractId for real Canton Coin settlement.")));
                    }
                    return fulfillSymbolic(contract, note, commandId, party);
                })
        ));
    }

    private CompletableFuture<ResponseEntity<Map<String, String>>> fulfillRealSettlement(
            Contract<CommitmentContract> contract,
            String note,
            String allocationContractId,
            String commandId,
            String party) {
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
                    contract.contractId, choice, commandId, transferContext.disclosedContracts(), party)
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
            String commandId,
            String party) {
        var choice = new CommitmentContract.Fulfill(note, Optional.empty());
        return ledger.exerciseAndGetResult(contract.contractId, choice, commandId, party)
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
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String contractId,
            @Valid @RequestBody RaiseDisputeRequest request) {
        var ctx = tracingCtx(logger, "raiseDispute", "contractId", contractId);
        String commandId = idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentByIdForParty(contractId, party).thenCompose(optContract -> {
                    // Scoped lookup: only a party to the commitment can raise a dispute on it.
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);
                    var choice = new CommitmentContract.RaiseDispute(
                            request.reason, new com.digitalasset.transcode.java.Party(party));
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId, party)
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
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String contractId,
            @Valid @RequestBody(required = false) RefundRequest request) {
        var ctx = tracingCtx(logger, "refundCommitment", "contractId", contractId);
        String commandId = idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString();
        String allocationContractId = request != null ? request.allocationContractId : null;

        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentByIdForParty(contractId, party).thenCompose(optContract -> {
                    // Scoped lookup: only a party to the commitment can refund it.
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);

                    if (allocationContractId != null && !allocationContractId.isBlank()) {
                        return refundRealSettlement(contract, allocationContractId, commandId, party);
                    }
                    if (!symbolicSettlementEnabled) {
                        return CompletableFuture.completedFuture(
                                ResponseEntity.badRequest().body(Map.of(
                                        "error", "Symbolic settlement is disabled. Provide an allocationContractId for real Canton Coin refund.")));
                    }
                    var choice = new CommitmentContract.Refund(
                            new com.digitalasset.transcode.java.Party(party), Optional.empty());
                    return ledger.exerciseAndGetResult(contract.contractId, choice, commandId, party)
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
            String commandId,
            String party) {
        return tokenStandardProxy.getAllocationTransferContext(allocationContractId)
                .thenCompose(choiceContext -> {
                    var cc = ensurePresent(choiceContext, "Transfer context not found for allocation %s", allocationContractId);
                    TransferContextBuilder.TransferContext transferContext = TransferContextBuilder.prepare(
                            cc.getDisclosedContracts(),
                            Map.of("AmuletRules", "amulet-rules", "OpenMiningRound", "open-round"));
                    Tuple2<ContractId<Allocation>, ExtraArgs> allocationBundle =
                            new Tuple2<>(new ContractId<>(allocationContractId), transferContext.extraArgs());
                    var choice = new CommitmentContract.Refund(
                            new com.digitalasset.transcode.java.Party(contract.payload.getProposer.getParty),
                            Optional.of(allocationBundle));
                    logger.info("Refunding commitment {} with real CC settlement (reverse allocation {})",
                            contract.contractId.getContractId, allocationContractId);
                    return ledger.exerciseAndGetResult(
                            contract.contractId, choice, commandId, transferContext.disclosedContracts(), party)
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
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @PathVariable String contractId,
            @Valid @RequestBody ResolveDisputeRequest request) {
        var ctx = tracingCtx(logger, "resolveDispute", "contractId", contractId);
        String commandId = idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : UUID.randomUUID().toString();
        String allocationContractId = request.allocationContractId();
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findDisputeCasesForParty(party).thenCompose(disputes -> {
                    // The DisputeCase references the commitment; resolve the matching case.
                    var dispute = disputes.stream()
                            .filter(d -> d.payload.getCommitmentRef.getContractId.equals(contractId))
                            .findFirst()
                            .orElseThrow(() -> new IllegalArgumentException(
                                    "No open DisputeCase found for commitment: " + contractId));

                    if ("proposer".equals(request.ruling())
                            && (allocationContractId == null || allocationContractId.isBlank())) {
                        // Warning: Without an allocationContractId, resolution is symbolic.
                        // Real settlement (if required by the commitment) will fail downstream.
                    }

                    if (allocationContractId != null && !allocationContractId.isBlank()) {
                        return tokenStandardProxy.getAllocationTransferContext(allocationContractId)
                                .thenCompose(choiceContext -> {
                                    var cc = ensurePresent(choiceContext, "Transfer context not found for allocation %s", allocationContractId);
                                    TransferContextBuilder.TransferContext transferContext = TransferContextBuilder.prepare(
                                            cc.getDisclosedContracts(),
                                            Map.of("AmuletRules", "amulet-rules", "OpenMiningRound", "open-round"));
                                    Tuple2<ContractId<Allocation>, ExtraArgs> allocationBundle =
                                            new Tuple2<>(new ContractId<>(allocationContractId), transferContext.extraArgs());
                                    var choice = new DisputeCase.ResolveDispute(request.ruling());
                                    return ledger.exerciseAndGetResult(
                                                    dispute.contractId, choice, commandId, transferContext.disclosedContracts(), party)
                                            .thenApply(result -> {
                                                logger.info("Dispute on commitment {} resolved: {}", contractId, request.ruling());
                                                return ResponseEntity.ok(Map.of(
                                                        "status", "resolved",
                                                        "ruling", request.ruling(),
                                                        "resolvedBy", party,
                                                        "receiptContractId", ((ContractId<?>) result).getContractId,
                                                        "allocationContractId", allocationContractId));
                                            });
                                });
                    }

                    var choice = new DisputeCase.ResolveDispute(request.ruling());
                    return ledger.exerciseAndGetResult(dispute.contractId, choice, commandId, party)
                            .thenApply(result -> {
                                logger.info("Dispute on commitment {} resolved: {}", contractId, request.ruling());
                                return ResponseEntity.ok(Map.of(
                                        "status", "resolved",
                                        "ruling", request.ruling(),
                                        "resolvedBy", party,
                                        "receiptContractId", ((ContractId<?>) result).getContractId));
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

    // ── Wallet Integration ─────────────────────────────────────────────────────

    /**
     * Returns the authenticated party's Canton Coin balance by querying the
     * Splice token standard registry.
     */
    @GetMapping("/balance")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getBalance() {
        var ctx = tracingCtx(logger, "getBalance");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                tokenStandardProxy.getRegistryAdminId().thenCompose(adminId -> {
                    return damlRepository.findHoldingsForOwnerAndAdmin(party, adminId)
                            .thenApply(holdings -> {
                                java.math.BigDecimal totalBalance = holdings.stream()
                                        .map(contract -> contract.payload.getAmount)
                                        .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                                java.math.BigDecimal lockedBalance = holdings.stream()
                                        .filter(contract -> contract.payload.getLock.isPresent())
                                        .map(contract -> contract.payload.getAmount)
                                        .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                                java.math.BigDecimal availableBalance = totalBalance.subtract(lockedBalance);
                                String instrumentId = holdings.stream()
                                        .map(contract -> contract.payload.getInstrumentId.getId)
                                        .filter(id -> id != null && !id.isBlank())
                                        .findFirst()
                                        .orElse("CC");

                                return ResponseEntity.ok(Map.of(
                                        "party", party,
                                        "instrumentAdmin", adminId,
                                        "instrumentId", instrumentId,
                                        "balance", availableBalance,
                                        "lockedBalance", lockedBalance,
                                        "totalBalance", totalBalance,
                                        "holdingCount", holdings.size()
                                ));
                            });
                })
        ));
    }

    /**
     * Returns the AllocationRequest view for a commitment, so the frontend
     * can display the pending settlement to the user and link to the wallet.
     */
    @GetMapping("/commitments/{contractId}/allocation-request")
    @WithSpan
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getAllocationRequest(
            @PathVariable String contractId) {
        var ctx = tracingCtx(logger, "getAllocationRequest", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findCommitmentByIdForParty(contractId, party).thenCompose(optContract -> {
                    // Scoped lookup: financial details (amount, parties) only revealed to a party of the commitment.
                    var contract = ensurePresent(optContract, "Commitment not found: %s", contractId);
                    String transferLegId = settlementTransferLegIdFor(
                            contract.payload.getDescription,
                            contract.payload.getCreatedAt
                    );

                    return damlRepository.findActiveAllocationRequests().thenApply(allocationRequests -> {
                        Optional<Contract<AllocationRequest>> matchingRequest = allocationRequests.stream()
                                .filter(request -> request.payload.getTransferLegs.containsKey(transferLegId))
                                .filter(request -> matchesCommitmentSettlement(request.payload, contract.payload, transferLegId))
                                .findFirst();

                        if (matchingRequest.isEmpty()) {
                            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                                    "error", "No active allocation request found for commitment %s".formatted(contractId)
                            ));
                        }

                        Contract<AllocationRequest> request = matchingRequest.get();
                        TransferLeg transferLeg = request.payload.getTransferLegs.get(transferLegId);

                        return ResponseEntity.ok(Map.ofEntries(
                                Map.entry("contractId", contractId),
                                Map.entry("allocationRequestContractId", request.contractId.getContractId),
                                Map.entry("transferLegId", transferLegId),
                                Map.entry("amount", transferLeg.getAmount),
                                Map.entry("currency", transferLeg.getInstrumentId.getId),
                                Map.entry("sender", transferLeg.getSender.getParty),
                                Map.entry("receiver", transferLeg.getReceiver.getParty),
                                Map.entry("executor", request.payload.getSettlement.getExecutor.getParty),
                                Map.entry("requestedAt", request.payload.getSettlement.getRequestedAt),
                                Map.entry("allocateBefore", request.payload.getSettlement.getAllocateBefore),
                                Map.entry("settleBefore", request.payload.getSettlement.getSettleBefore),
                                Map.entry("settlementRef", request.payload.getSettlement.getSettlementRef.getId),
                                Map.entry("instrumentAdmin", transferLeg.getInstrumentId.getAdmin.getParty),
                                Map.entry("walletAction", "Approve the active allocation request in the payer wallet before exercising fulfill.")
                        ));
                    });
                })
        ));
    }

    private static boolean matchesCommitmentSettlement(
            AllocationRequest request,
            CommitmentContract contract,
            String transferLegId
    ) {
        TransferLeg transferLeg = request.getTransferLegs.get(transferLegId);
        if (transferLeg == null) {
            return false;
        }

        return request.getSettlement.getSettlementRef.getId.equals(transferLegId)
                && transferLeg.getAmount.compareTo(contract.getAmount) == 0
                && transferLeg.getSender.getParty.equals(contract.getAccepter.getParty)
                && transferLeg.getReceiver.getParty.equals(contract.getProposer.getParty)
                && transferLeg.getInstrumentId.getAdmin.getParty.equals(contract.getInstrumentAdmin.getParty)
                && transferLeg.getInstrumentId.getId.equals(contract.getCurrency);
    }

    private static String settlementTransferLegIdFor(String description, Instant createdAt) {
        return "commitmentSettlement:" + description + ":" + createdAt;
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
            @NotBlank String ruling,
            String allocationContractId) {
    }

    // ── Transfer context helpers (Canton Coin settlement) ──────────────────────
    // Moved to TransferContextBuilder (shared with LicenseApiImpl).

    // ── End of CommitmentController ────────────────────────────────────────
}
