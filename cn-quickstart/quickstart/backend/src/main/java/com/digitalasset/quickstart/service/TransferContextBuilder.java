// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import com.daml.ledger.api.v2.CommandsOuterClass;
import com.daml.ledger.api.v2.ValueOuterClass;
import com.digitalasset.quickstart.tokenstandard.openapi.allocation.model.DisclosedContract;
import com.digitalasset.transcode.java.ContractId;
import com.google.protobuf.ByteString;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.AnyValue;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.ChoiceContext;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.ExtraArgs;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.Metadata;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Shared helper for building Canton Coin settlement transfer contexts from
 * Splice Token Standard disclosed contracts.
 *
 * Previously duplicated between {@link CommitmentController} and
 * {@link LicenseApiImpl}. Extracted for DRY.
 */
public final class TransferContextBuilder {

    private TransferContextBuilder() {
        // utility class — no instances
    }

    public record TransferContext(
            ExtraArgs extraArgs,
            List<CommandsOuterClass.DisclosedContract> disclosedContracts) {
    }

    /**
     * Builds the transfer context needed for real Canton Coin settlement
     * via the Splice Allocation/Transfer standard.
     */
    public static TransferContext prepare(
            List<DisclosedContract> disclosedContracts,
            Map<String, String> metaMap) {
        var disclosures = disclosedContracts
                .stream()
                .map(TransferContextBuilder::toLedgerApiDisclosedContract)
                .toList();
        Map<String, AnyValue> choiceContextMap = disclosures
                .stream()
                .map(dc -> {
                    var metaKey = metaMap.get(dc.getTemplateId().getEntityName());
                    if (metaKey != null) {
                        return Map.entry(metaKey, toAnyValueContractId(dc.getContractId()));
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        return new TransferContext(
                new ExtraArgs(new ChoiceContext(choiceContextMap), new Metadata(Map.of())),
                disclosures);
    }

    private static CommandsOuterClass.DisclosedContract toLedgerApiDisclosedContract(
            DisclosedContract dc) {
        ValueOuterClass.Identifier templateId = parseTemplateIdentifier(dc.getTemplateId());
        byte[] blob = Base64.getDecoder().decode(dc.getCreatedEventBlob());
        return CommandsOuterClass.DisclosedContract.newBuilder()
                .setTemplateId(templateId)
                .setContractId(dc.getContractId())
                .setCreatedEventBlob(ByteString.copyFrom(blob))
                .build();
    }

    private static ValueOuterClass.Identifier parseTemplateIdentifier(String templateIdStr) {
        String[] parts = templateIdStr.split(":");
        if (parts.length < 3) {
            throw new IllegalArgumentException("Invalid templateId format: " + templateIdStr);
        }
        String packageId = parts[0];
        String moduleName = parts[1];
        StringBuilder entityNameBuilder = new StringBuilder();
        for (int i = 2; i < parts.length; i++) {
            if (i > 2) entityNameBuilder.append(":");
            entityNameBuilder.append(parts[i]);
        }
        return ValueOuterClass.Identifier.newBuilder()
                .setPackageId(packageId)
                .setModuleName(moduleName)
                .setEntityName(entityNameBuilder.toString())
                .build();
    }

    private static AnyValue toAnyValueContractId(String contractId) {
        return new AnyValue.AnyValue_AV_ContractId(new ContractId<>(contractId));
    }
}