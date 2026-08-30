/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.mfa;

import com.wesee.esg.mfa.dto.BackupCodesResponse;
import com.wesee.esg.mfa.dto.DisableTotpRequest;
import com.wesee.esg.mfa.dto.RegenerateBackupCodesRequest;
import com.wesee.esg.mfa.dto.TotpEnrollResponse;
import com.wesee.esg.mfa.dto.TotpStatusResponse;
import com.wesee.esg.mfa.dto.VerifyTotpRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/mfa")
public class MfaController {

    private final MfaService mfaService;

    public MfaController(MfaService mfaService) {
        this.mfaService = mfaService;
    }

    @PostMapping("/totp/enroll")
    public TotpEnrollResponse enroll() {
        return mfaService.enroll();
    }

    @PostMapping("/totp/verify")
    public BackupCodesResponse verify(@Valid @RequestBody VerifyTotpRequest request) {
        return mfaService.verifyAndEnable(request.code());
    }

    @GetMapping("/totp/status")
    public TotpStatusResponse status() {
        return mfaService.status();
    }

    @PostMapping("/totp/disable")
    public void disable(@Valid @RequestBody DisableTotpRequest request) {
        mfaService.disable(request.password(), request.code());
    }

    @PostMapping("/backup-codes/regenerate")
    public BackupCodesResponse regenerateBackupCodes(@Valid @RequestBody RegenerateBackupCodesRequest request) {
        return mfaService.regenerateBackupCodes(request.password(), request.code());
    }
}
