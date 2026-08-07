package com.wesee.esg.apiaccess;

import com.wesee.esg.security.CurrentUserProvider;
import org.springframework.stereotype.Component;

/**
 * Backs {@code @PreAuthorize("@apiScope.check('SCOPE_KEY')")} on /api/external/** endpoints.
 * Ordinary user-session JWTs carry no scopes, so a logged-in browser session always fails this
 * check — external API access is intentionally token-only.
 */
@Component("apiScope")
public class ApiScopeService {

    private final CurrentUserProvider currentUserProvider;

    public ApiScopeService(CurrentUserProvider currentUserProvider) {
        this.currentUserProvider = currentUserProvider;
    }

    public boolean check(String scope) {
        var scopes = currentUserProvider.getPrincipal().scopes();
        return scopes != null && scopes.contains(scope);
    }
}
