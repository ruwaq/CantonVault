// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.security.oauth2;

import com.digitalasset.quickstart.security.Auth;
import com.digitalasset.quickstart.security.PartyAuthority;
import com.digitalasset.quickstart.security.TenantAuthority;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.*;
import org.springframework.security.oauth2.client.oidc.web.logout.OidcClientInitiatedLogoutSuccessHandler;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@Profile("oauth2")
public class OAuth2Config {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(OAuth2Config.class);

    @Value("${application.tenants.AppProvider.partyId}")
    private String partyId;

    @Value("${application.tenants.AppProvider.tenantId}")
    private String tenantId;

    /**
     * When true (default false), a JWT that omits party_id/tenant_id is rejected
     * instead of being granted the AppProvider party. The insecure legacy fallback
     * can be re-enabled explicitly for single-tenant dev only via
     * {@code security.oauth2.allow-missing-claims-fallback=true}.
     */
    @Value("${security.oauth2.allow-missing-claims-fallback:false}")
    private boolean allowMissingClaimsFallback;

    private final OAuth2AuthenticationSuccessHandler authenticationSuccessHandler;
    private final ClientRegistrationRepository clientRegistrationRepository;
    private final OAuth2AuthorizedClientService authorizedClientService;

    public OAuth2Config(OAuth2AuthenticationSuccessHandler authenticationSuccessHandler, ClientRegistrationRepository clientRegistrationRepository, OAuth2AuthorizedClientService authorizedClientService) {
        this.authenticationSuccessHandler = authenticationSuccessHandler;
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.authorizedClientService = authorizedClientService;
    }

    @Bean
    public Auth auth() {
        return Auth.OAUTH2;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf((csrf) -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                )
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET, "/user", "/login-links", "/feature-flags", "/oauth2/authorization/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/logout").permitAll()
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exceptionHandling -> exceptionHandling
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.getWriter().write("Unauthorized");
                        })
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
                .oauth2Login(oauth2 ->
                        oauth2.defaultSuccessUrl("/", true)
                                .successHandler(authenticationSuccessHandler)
                )
                .logout(logout -> logout
                        .logoutUrl("/logout")
                            .logoutSuccessHandler(oidcLogoutSuccessHandler())
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID")
                );
        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new Converter<>() {
            private final JwtGrantedAuthoritiesConverter defaultGrantedAuthoritiesConverter =
                    new JwtGrantedAuthoritiesConverter();

            @Override
            public Collection<GrantedAuthority> convert(Jwt jwt) {
                Collection<GrantedAuthority> authorities = new HashSet<>(
                        defaultGrantedAuthoritiesConverter.convert(jwt));

                // Extract Keycloak realm roles from realm_access.roles claim.
                // Example: { "realm_access": { "roles": ["admin", "operator"] } }
                List<String> realmRoles = extractKeycloakRealmRoles(jwt);
                for (String role : realmRoles) {
                    // Map realm roles to Spring Security roles (ROLE_ prefix convention)
                    String springRole = role.toUpperCase().startsWith("ROLE_") ? role.toUpperCase() : "ROLE_" + role.toUpperCase();
                    authorities.add(new SimpleGrantedAuthority(springRole));
                }

                // Extract party_id and tenant_id from JWT claims (Keycloak mappers).
                // In production, these claims are mapped by Keycloak protocol mappers
                // from user attributes or group memberships.
                String jwtPartyId = jwt.getClaimAsString("party_id");
                String jwtTenantId = jwt.getClaimAsString("tenant_id");

                if (jwtPartyId != null) {
                    authorities.add(new PartyAuthority(jwtPartyId));
                }
                if (jwtTenantId != null) {
                    authorities.add(new TenantAuthority(jwtTenantId));
                }

                // SECURITY: Previously a JWT missing party_id or tenant_id was silently
                // granted the AppProvider party — turning any token from the IdP into an
                // admin. This fallback is now OFF by default. It can be re-enabled only
                // explicitly for single-tenant dev (allow-missing-claims-fallback=true),
                // and even then it logs a warning so it cannot be used unnoticed.
                if (jwtPartyId == null || jwtTenantId == null) {
                    if (allowMissingClaimsFallback) {
                        logger.warn("SECURITY: JWT from issuer '{}' is missing party_id/tenant_id claims; "
                                        + "falling back to AppProvider party '{}' (dev-only mode). "
                                        + "Disable security.oauth2.allow-missing-claims-fallback in production.",
                                jwt.getIssuer() == null ? "<unknown>" : jwt.getIssuer().toString(), partyId);
                        authorities.add(new PartyAuthority(partyId));
                        authorities.add(new TenantAuthority(tenantId));
                    }
                    // When the fallback is disabled (default), the token carries NO
                    // party/tenant authority and any party-scoped operation will be
                    // rejected downstream — i.e. the caller cannot act as anyone.
                }

                return authorities;
            }

            /**
             * Extract Keycloak realm_access roles from the JWT claim.
             * Standard Keycloak JWT structure:
             * { "realm_access": { "roles": ["admin", "user"] } }
             */
            @SuppressWarnings("unchecked")
            private List<String> extractKeycloakRealmRoles(Jwt jwt) {
                try {
                    Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
                    if (realmAccess != null && realmAccess.get("roles") instanceof List) {
                        return (List<String>) realmAccess.get("roles");
                    }
                } catch (Exception e) {
                    // Claim not present or malformed — no roles from this source
                }
                return List.of();
            }
        });
        return converter;
    }

    private LogoutSuccessHandler oidcLogoutSuccessHandler() {
        return new OidcClientInitiatedLogoutSuccessHandler(this.clientRegistrationRepository);
    }

    @Bean
    @Primary
    public OAuth2AuthorizedClientManager multiGrantTypeClientManager() {
        OAuth2AuthorizedClientProvider authorizedClientProvider =
                OAuth2AuthorizedClientProviderBuilder.builder()
                        .clientCredentials()
                        .authorizationCode()
                        .refreshToken()
                        .build();

        AuthorizedClientServiceOAuth2AuthorizedClientManager authorizedClientManager =
                new AuthorizedClientServiceOAuth2AuthorizedClientManager(
                        clientRegistrationRepository, authorizedClientService);

        authorizedClientManager.setAuthorizedClientProvider(authorizedClientProvider);
        return authorizedClientManager;
    }
}
