package com.wesee.esg.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "plan_pricing")
@Getter
@Setter
@NoArgsConstructor
public class PlanPricing {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private SubscriptionPlan plan;

    @Column(name = "monthly_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyPrice;
}
