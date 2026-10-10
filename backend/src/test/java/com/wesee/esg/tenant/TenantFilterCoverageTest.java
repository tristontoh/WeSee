/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant;

import com.wesee.esg.config.JpaAuditingConfig;
import com.wesee.esg.denominator.AnnualFigureKey;
import com.wesee.esg.denominator.CompanyAnnualFigure;
import com.wesee.esg.denominator.CompanyAnnualFigureRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.sql.DriverManager;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * What the companyFilter does and does not cover.
 *
 * <p>The filter is enabled per request in {@code JwtAuthenticationFilter}, and the rest of the
 * codebase leans on it: dozens of services call {@code repository.findById(someId)} on
 * tenant-owned rows and never mention a company, on the understanding that the filter will refuse
 * another tenant's row. This pins down whether that understanding is true, because the answer
 * decides whether those call sites are safe or are a cross-tenant read.
 *
 * <p>Written as two tests so the record is explicit: one for a query, one for a primary-key load.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("isolation-test")
@Import(JpaAuditingConfig.class)
@EnabledIf("postgresIsReachable")
class TenantFilterCoverageTest {

    static boolean postgresIsReachable() {
        try (var ignored = DriverManager.getConnection(
                "jdbc:postgresql://localhost:5432/wesee_esg_test",
                System.getenv().getOrDefault("DB_USERNAME", "postgres"),
                System.getenv().getOrDefault("DB_PASSWORD", "root"))) {
            return true;
        } catch (Exception e) {
            if (Boolean.parseBoolean(System.getenv().getOrDefault("CI", "false"))) {
                throw new IllegalStateException("CI is set but no Postgres is reachable", e);
            }
            return false;
        }
    }

    @Autowired private EntityManager em;
    @Autowired private CompanyRepository companyRepository;
    @Autowired private CompanyAnnualFigureRepository figureRepository;

    private UUID companyA;
    private UUID companyB;
    private UUID figureOfB;

    @BeforeEach
    void setUp() {
        companyA = newCompany("Company A");
        companyB = newCompany("Company B");

        CompanyAnnualFigure f = new CompanyAnnualFigure();
        f.setCompanyId(companyB);
        f.setFiscalYear(2025);
        f.setFigureKey(AnnualFigureKey.REVENUE);
        f.setValue(new BigDecimal("1000000.0000"));
        f.setUnit("MYR");
        figureOfB = figureRepository.saveAndFlush(f).getId();

        em.clear();
        em.unwrap(Session.class).enableFilter("companyFilter").setParameter("companyId", companyA);
    }

    /** The case the filter was added for, and the one it does handle. */
    @Test
    void aQueryCannotSeeAnotherCompanysRow() {
        var rows = figureRepository.findByCompanyIdAndFiscalYear(companyB, 2025);
        assertTrue(rows.isEmpty(),
                "the filter let a query reach company B's rows while bound to company A");
    }

    /**
     * The case it does NOT handle. Hibernate applies a filter when it builds a query; a load by
     * primary key goes to the persistence context and the identifier loader, which never consult
     * the enabled filters. So {@code findById} is not protected, and every service that resolves
     * a tenant-owned row by id alone is doing so without a tenant check.
     *
     * <p>Asserting the leak rather than wishing it away: this test documents the real behaviour,
     * and {@link TenantScopingInvariantTest} is what stops new code relying on the wish.
     */
    @Test
    void findByIdIsNotCoveredByTheFilter() {
        Optional<CompanyAnnualFigure> leaked = figureRepository.findById(figureOfB);
        assertTrue(leaked.isPresent(),
                "findById no longer leaks across tenants — if Hibernate changed this, the"
                        + " explicit findByIdAndCompanyId predicates are still correct, but this"
                        + " test's premise is stale and the finding it records can be revisited");
        assertFalse(companyA.equals(leaked.get().getCompanyId()),
                "fixture is wrong: the row should belong to company B");
    }

    private UUID newCompany(String name) {
        Company c = new Company();
        c.setName(name);
        c.setMarketClassification(MarketClassification.SME);
        c.setSubscriptionPlan(SubscriptionPlan.STARTER);
        return companyRepository.saveAndFlush(c).getId();
    }
}
