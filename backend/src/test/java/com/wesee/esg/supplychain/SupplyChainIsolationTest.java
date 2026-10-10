/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root - visibility is not a licence to use.
 */
package com.wesee.esg.supplychain;

import com.wesee.esg.config.JpaAuditingConfig;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.tenant.MarketClassification;
import com.wesee.esg.tenant.SubscriptionPlan;
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
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The test the design document singles out.
 *
 * <p>This feature is the first thing in the schema to cross a tenant boundary, and the two shared
 * tables sit outside the Hibernate companyFilter on purpose, so the repository predicate IS the
 * isolation. If it leaks, nothing else catches it. {@code @DataJpaTest} does not enable that
 * filter (it is switched on per request), which is exactly the condition this needs: the
 * predicate has to hold with nothing helping it.
 *
 * <p>Every assertion checks for an EMPTY RESULT rather than an exception. A leak that returns
 * rows is the failure mode that matters.
 *
 * <p>Runs against a real Postgres, not the H2 test profile: V89 creates a partial unique index,
 * which H2 cannot apply. Create the database once with {@code createdb wesee_esg_test}. Without a
 * reachable Postgres this class skips, with the reason stated, rather than failing a suite that
 * is otherwise database-free.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("isolation-test")
// created_at/updated_at come from @CreatedDate, which needs auditing switched on; @DataJpaTest
// does not pick up the application's own configuration.
@Import(JpaAuditingConfig.class)
@EnabledIf("postgresIsReachable")
class SupplyChainIsolationTest {

    static boolean postgresIsReachable() {
        try (var ignored = DriverManager.getConnection(
                "jdbc:postgresql://localhost:5432/wesee_esg_test",
                System.getenv().getOrDefault("DB_USERNAME", "postgres"),
                System.getenv().getOrDefault("DB_PASSWORD", "root"))) {
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Autowired
    private SupplyLinkRepository linkRepository;
    @Autowired
    private SharedDisclosureRepository disclosureRepository;
    @Autowired
    private CompanyRepository companyRepository;

    private UUID buyerA;
    private UUID buyerB;
    private UUID supplier;
    private SupplyLink linkA;
    private SharedDisclosure disclosureA;
    private SharedDisclosure disclosureB;

    @BeforeEach
    void setUp() {
        buyerA = newCompany("Buyer A");
        buyerB = newCompany("Buyer B");
        supplier = newCompany("Shared Supplier");

        linkA = newActiveLink(buyerA, supplier);
        SupplyLink linkB = newActiveLink(buyerB, supplier);

        disclosureA = newDisclosure(linkA.getId());
        disclosureB = newDisclosure(linkB.getId());
    }

    private UUID newCompany(String name) {
        Company c = new Company();
        c.setName(name);
        // The two columns Company has no default for. Everything else the schema requires is
        // already defaulted on the entity.
        c.setMarketClassification(MarketClassification.SME);
        c.setSubscriptionPlan(SubscriptionPlan.STARTER);
        return companyRepository.saveAndFlush(c).getId();
    }

    private SupplyLink newActiveLink(UUID buyerCompanyId, UUID supplierCompanyId) {
        SupplyLink l = new SupplyLink();
        l.setBuyerCompanyId(buyerCompanyId);
        l.setSupplierCompanyId(supplierCompanyId);
        l.setSupplierEmail("supplier+" + UUID.randomUUID() + "@example.test");
        l.setStatus(SupplyLinkStatus.ACTIVE);
        l.setInviteTokenHash(UUID.randomUUID().toString().replace("-", "") + "00000000000000000000000000000000");
        l.setInvitedAt(Instant.now());
        l.setExpiresAt(Instant.now().plus(14, ChronoUnit.DAYS));
        return linkRepository.saveAndFlush(l);
    }

    private SharedDisclosure newDisclosure(UUID supplyLinkId) {
        SharedDisclosure d = new SharedDisclosure();
        d.setSupplyLinkId(supplyLinkId);
        d.setFiscalYear(2025);
        d.setScope1Tco2e(new BigDecimal("443.5600"));
        d.setScope2Tco2e(new BigDecimal("533.7800"));
        d.setBasisQuantity(new BigDecimal("48000.0000"));
        d.setBasisUnit("Units");
        d.setSignOffHash("a".repeat(64));
        d.setSignerName("Jane Lim");
        d.setSignedAt(Instant.now());
        d.setPublishedAt(Instant.now());
        return disclosureRepository.saveAndFlush(d);
    }

    @Test
    void aBuyerSeesOnlyItsOwnSupplierDisclosure() {
        var forA = disclosureRepository.findPublishedForBuyer(buyerA);
        assertEquals(1, forA.size());
        assertEquals(disclosureA.getId(), forA.get(0).getId());
    }

    /**
     * THE test. Buyer A asks for Buyer B's disclosure by its id and must get nothing back.
     */
    @Test
    void aBuyerCannotReadADisclosureOnALinkItIsNotTheBuyerOf() {
        assertTrue(disclosureRepository.findByIdForBuyer(disclosureB.getId(), buyerA).isEmpty(),
                "Buyer A read Buyer B's shared disclosure");
    }

    @Test
    void theSupplierSeesBothOfItsOwnPublishedSnapshots() {
        assertEquals(2, disclosureRepository.findForSupplier(supplier).size());
    }

    @Test
    void aBuyerIsNotTheSupplierAndSeesNothingThatWay() {
        assertTrue(disclosureRepository.findForSupplier(buyerA).isEmpty());
        assertTrue(disclosureRepository.findByIdForSupplier(disclosureA.getId(), buyerA).isEmpty());
    }

    @Test
    void revokingTheLinkStopsTheBuyerSeeingWhatItUsedToSee() {
        linkA.setStatus(SupplyLinkStatus.REVOKED);
        linkRepository.saveAndFlush(linkA);
        assertTrue(disclosureRepository.findPublishedForBuyer(buyerA).isEmpty());
        assertTrue(disclosureRepository.findByIdForBuyer(disclosureA.getId(), buyerA).isEmpty());
    }

    @Test
    void revokingTheDisclosureDropsItFromTheBuyerListWhileTheLinkStaysLive() {
        disclosureA.setRevokedAt(Instant.now());
        disclosureRepository.saveAndFlush(disclosureA);
        assertTrue(disclosureRepository.findPublishedForBuyer(buyerA).isEmpty());
        assertEquals(SupplyLinkStatus.ACTIVE,
                linkRepository.findByIdAndBuyerCompanyId(linkA.getId(), buyerA).orElseThrow().getStatus());
    }

    @Test
    void aCompanyWithNoLinksSeesNothingRatherThanEverything() {
        assertTrue(disclosureRepository.findPublishedForBuyer(UUID.randomUUID()).isEmpty());
    }

    @Test
    void aLinkCannotBeFetchedByIdAloneFromTheWrongSide() {
        assertTrue(linkRepository.findByIdAndBuyerCompanyId(linkA.getId(), buyerB).isEmpty());
        assertTrue(linkRepository.findByIdAndSupplierCompanyId(linkA.getId(), buyerA).isEmpty());
    }
}
