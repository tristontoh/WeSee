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

    /** The monthly-equivalent price when billed annually — the pricing page's "Billed Annually" toggle. */
    @Column(name = "annual_monthly_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal annualMonthlyPrice;

    /**
     * Created lazily on first use rather than seeded: Stripe's subscription-update endpoint needs an
     * existing price_data[product], unlike Checkout Session creation which accepts an inline
     * product_data. Reused across price changes, so editing monthlyPrice needs no new product.
     */
    @Column(name = "stripe_product_id")
    private String stripeProductId;

}
