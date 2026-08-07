package com.wesee.esg.materiality.dto;

import com.wesee.esg.materiality.StakeholderOption;

import java.util.UUID;

public record StakeholderOptionResponse(UUID id, String name, boolean selected, boolean custom) {
    public static StakeholderOptionResponse from(StakeholderOption o) {
        return new StakeholderOptionResponse(o.getId(), o.getName(), Boolean.TRUE.equals(o.getSelected()), Boolean.TRUE.equals(o.getCustom()));
    }
}
