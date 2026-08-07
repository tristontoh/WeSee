package com.wesee.esg.governance.dto;

import com.wesee.esg.governance.GovernanceLevel;
import com.wesee.esg.governance.OversightLevel;

public record GovernanceLevelResponse(OversightLevel level, String roleTitle, String description) {
    public static GovernanceLevelResponse from(GovernanceLevel l) {
        return new GovernanceLevelResponse(l.getLevel(), l.getRoleTitle(), l.getDescription());
    }
}
