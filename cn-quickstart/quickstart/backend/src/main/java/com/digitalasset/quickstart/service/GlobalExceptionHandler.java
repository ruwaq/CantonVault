// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.concurrent.CompletionException;

/** Normalizes all controller errors so internals are never leaked to the client. */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .reduce((a, b) -> a + "; " + b)
            .orElse("validation failed");
        return ResponseEntity.badRequest().body(Map.of("error", msg));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArg(IllegalArgumentException ex) {
        log.warn("Illegal argument in request", ex);
        return ResponseEntity.badRequest().body(Map.of("error", "Invalid request"));
    }

    /** Maps gRPC status codes to appropriate HTTP responses. */
    @ExceptionHandler(io.grpc.StatusRuntimeException.class)
    public ResponseEntity<Map<String, String>> handleGrpc(io.grpc.StatusRuntimeException ex) {
        HttpStatus httpStatus = switch (ex.getStatus().getCode()) {
            case NOT_FOUND        -> HttpStatus.NOT_FOUND;
            case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
            case UNAUTHENTICATED  -> HttpStatus.UNAUTHORIZED;
            case PERMISSION_DENIED -> HttpStatus.FORBIDDEN;
            case UNAVAILABLE      -> HttpStatus.SERVICE_UNAVAILABLE;
            case DEADLINE_EXCEEDED -> HttpStatus.GATEWAY_TIMEOUT;
            case ALREADY_EXISTS   -> HttpStatus.CONFLICT;
            default               -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
        log.error("gRPC ledger error: code={} description={}", ex.getStatus().getCode(), ex.getStatus().getDescription());
        return ResponseEntity.status(httpStatus).body(Map.of("error", "Ledger error"));
    }

    /** Unwraps CompletionExceptions that wrap gRPC errors. */
    @ExceptionHandler(CompletionException.class)
    public ResponseEntity<Map<String, String>> handleCompletion(CompletionException ex) {
        Throwable cause = ex.getCause();
        if (cause instanceof io.grpc.StatusRuntimeException grpcEx) {
            return handleGrpc(grpcEx);
        }
        log.error("Async completion failed", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "Internal server error"));
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(
            org.springframework.web.server.ResponseStatusException ex) {
        // SECURITY (audit M6): several controllers throw ResponseStatusException
        // with messages containing contractIds or party ids (e.g. "party X is not
        // the user"). Echoing the raw reason confirms existence of resources to
        // unauthorized callers (enumeration aid). Map to a generic, status-based
        // message instead. Log the real reason server-side for debugging.
        log.debug("ResponseStatusException: status={} reason={}", ex.getStatusCode(), ex.getReason());
        int code = ex.getStatusCode().value();
        String safe = switch (code) {
            case 404 -> "Resource not found";
            case 403 -> "Access denied";
            case 401 -> "Authentication required";
            case 400 -> "Invalid request";
            case 409 -> "Conflict";
            default -> "Error";
        };
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", safe));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        // Log the full detail server-side only — never to the client
        log.error("Unhandled exception in controller", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(Map.of("error", "Internal server error"));
    }
}