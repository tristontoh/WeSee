package com.wesee.esg.climate;

import com.wesee.esg.common.TenantOwnedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "emission_value", uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "scope", "fiscal_year"}))
@Getter
@Setter
@NoArgsConstructor
public class EmissionValue extends TenantOwnedEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EmissionScope scope;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal value;
}
