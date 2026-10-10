/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Whether somebody is actually signed in.
 *
 * <p>The trap this exists for: Spring Security gives an unauthenticated request an
 * {@link AnonymousAuthenticationToken}, and that token's {@code isAuthenticated()} returns
 * <em>true</em>. So the obvious check —
 * {@code authentication != null && authentication.isAuthenticated()} — is true for everybody,
 * including someone who has never signed in.
 *
 * <p>That check guarded Swagger. It meant /swagger-ui and /v3/api-docs were readable by anyone,
 * in every profile, for as long as the rule had existed — while PRODUCTION_READINESS.md said
 * "Swagger is no longer public". Found by requesting it against the deployed container.
 */
class SignedInCheckTest {

    /** The case that was wrong: nobody signed in, but the token says authenticated. */
    @Test
    void anonymousIsNotSignedIn() {
        Authentication anonymous = new AnonymousAuthenticationToken(
                "key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS"));

        assertTrue(anonymous.isAuthenticated(),
                "premise: Spring's anonymous token reports itself as authenticated");
        assertFalse(SignedInCheck.isSignedIn(anonymous),
                "an anonymous request is not somebody signing in");
    }

    @Test
    void arealUserIsSignedIn() {
        Authentication user = new UsernamePasswordAuthenticationToken(
                "jane@example.com", null, AuthorityUtils.createAuthorityList("ROLE_COMPANY_ADMIN"));
        assertTrue(SignedInCheck.isSignedIn(user));
    }

    @Test
    void noAuthenticationAtAllIsNotSignedIn() {
        assertFalse(SignedInCheck.isSignedIn(null));
    }

    /** An authentication explicitly marked unauthenticated is not signed in either. */
    @Test
    void anUnauthenticatedTokenIsNotSignedIn() {
        var token = new UsernamePasswordAuthenticationToken("jane@example.com", null);
        assertFalse(token.isAuthenticated(), "premise: the two-arg constructor is unauthenticated");
        assertFalse(SignedInCheck.isSignedIn(token));
    }

    @Test
    void anAnonymousTokenWithExtraAuthoritiesIsStillNotSignedIn() {
        Authentication sneaky = new AnonymousAuthenticationToken(
                "key", "anonymousUser",
                List.copyOf(AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS", "ROLE_ADMIN")));
        assertFalse(SignedInCheck.isSignedIn(sneaky));
    }
}
