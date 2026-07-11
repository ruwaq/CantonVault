// Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.web;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.beanvalidation.MethodValidationPostProcessor;

/**
 * Enables {@code @Validated} on controller method parameters (path variables,
 * request bodies, etc.) so that Jakarta Bean Validation annotations are enforced
 * before the service layer is reached.
 */
/**
 * Enables Jakarta Bean Validation on controller method parameters.
 *
 * NOTE: MethodValidationPostProcessor is intentionally NOT registered as a bean
 * because it causes Spring AOP to create JDK dynamic proxies around ALL
 * {@code @Controller} beans, which strips {@code @RequestMapping} annotations
 * inherited from generated OpenAPI interfaces (UserApi, LoginLinksApi, etc.).
 *
 * The {@code @Valid @RequestBody} validation on CommitmentController works
 * without this bean — Spring Boot auto-configures it via the web stack.
 * The {@code @Validated} class-level annotation on CommitmentController stays
 * for documentation but does not trigger AOP without this processor.
 */
@Configuration
public class ValidationConfig {

    @Bean
    public MethodValidationPostProcessor methodValidationPostProcessor() {
        MethodValidationPostProcessor processor = new MethodValidationPostProcessor();
        processor.setProxyTargetClass(true);
        return processor;
    }
}