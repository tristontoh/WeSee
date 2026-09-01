/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "wesee.auth.throttle")
public class AuthThrottleProperties {

    private boolean enabled = true;

    /** Sign-in attempts allowed from one address per window. */
    private int loginPerWindow = 10;

    /** Account creations, password-reset requests and verification resends allowed per window. */
    private int signupPerWindow = 5;

    private int windowMinutes = 5;

    /** How many addresses to remember before evicting the oldest. Bounds the map, nothing more. */
    private int maxTrackedClients = 20_000;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getLoginPerWindow() {
        return loginPerWindow;
    }

    public void setLoginPerWindow(int loginPerWindow) {
        this.loginPerWindow = loginPerWindow;
    }

    public int getSignupPerWindow() {
        return signupPerWindow;
    }

    public void setSignupPerWindow(int signupPerWindow) {
        this.signupPerWindow = signupPerWindow;
    }

    public int getWindowMinutes() {
        return windowMinutes;
    }

    public void setWindowMinutes(int windowMinutes) {
        this.windowMinutes = windowMinutes;
    }

    public int getMaxTrackedClients() {
        return maxTrackedClients;
    }

    public void setMaxTrackedClients(int maxTrackedClients) {
        this.maxTrackedClients = maxTrackedClients;
    }
}
