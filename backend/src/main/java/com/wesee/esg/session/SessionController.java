/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.session;

import com.wesee.esg.session.dto.SessionResponse;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/me/sessions")
public class SessionController {

    private final UserSessionService userSessionService;

    public SessionController(UserSessionService userSessionService) {
        this.userSessionService = userSessionService;
    }

    @GetMapping
    public List<SessionResponse> list() {
        return userSessionService.list();
    }

    @DeleteMapping("/{id}")
    public void revoke(@PathVariable UUID id) {
        userSessionService.revoke(id);
    }

    @PostMapping("/revoke-others")
    public void revokeOthers() {
        userSessionService.revokeOthers();
    }
}
