/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.apiaccess;

/** Fixed, validated set of grantable API token scopes. Add new constants here as new external endpoints ship. */
public enum ApiScope {
    INDICATORS_READ,
    INDICATORS_WRITE
}
