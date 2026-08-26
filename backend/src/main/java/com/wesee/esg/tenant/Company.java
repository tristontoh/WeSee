package com.wesee.esg.tenant;

import com.wesee.esg.common.BaseEntity;
import com.wesee.esg.common.StringListConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "company")
@Getter
@Setter
@NoArgsConstructor
public class Company extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sector_code")
    private Sector sector;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_company_id")
    private Company parentCompany;

    @Enumerated(EnumType.STRING)
    @Column(name = "size_band", length = 30)
    private CompanySizeBand sizeBand;

    @Enumerated(EnumType.STRING)
    @Column(name = "market_classification", nullable = false, length = 30)
    private MarketClassification marketClassification;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_plan", nullable = false, length = 30)
    private SubscriptionPlan subscriptionPlan;

    @Column(name = "fiscal_year_end_month", nullable = false)
    private Integer fiscalYearEndMonth = 12;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "onboarding_completed", nullable = false)
    private Boolean onboardingCompleted = false;

    @Column(name = "sector_module_enabled", nullable = false)
    private Boolean sectorModuleEnabled = false;

    @Convert(converter = StringListConverter.class)
    @Column(name = "frameworks_csv")
    private List<String> frameworks = List.of();

    @Convert(converter = StringListConverter.class)
    @Column(name = "priorities_csv")
    private List<String> priorities = List.of();

    @Column(name = "marketing_consent", nullable = false)
    private Boolean marketingConsent = false;

    @Column(name = "analytics_consent", nullable = false)
    private Boolean analyticsConsent = false;

    @Column(name = "consent_updated_at")
    private Instant consentUpdatedAt;

    /** Set when a COMPANY_ADMIN closes the account — see PrivacyService.closeAccount. Distinct from
     *  `active`, which platform admins also toggle for unrelated suspension reasons. */
    @Column(name = "closed_at")
    private Instant closedAt;

    // --- Identity ---

    @Column(name = "registration_number", length = 100)
    private String registrationNumber;

    @Column(name = "ticker_code", length = 20)
    private String tickerCode;

    @Column(name = "date_of_incorporation")
    private LocalDate dateOfIncorporation;

    @Column(name = "country_of_incorporation", length = 100)
    private String countryOfIncorporation;

    // --- Classification ---

    /** The actual stock exchange board — distinct from {@link #marketClassification}, which drives plan gating. */
    @Enumerated(EnumType.STRING)
    @Column(name = "listing_board", length = 30)
    private ListingBoard listingBoard;

    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", length = 30)
    private CompanyType companyType;

    // --- Contact & Location ---

    @Column(name = "registered_office_address", length = 500)
    private String registeredOfficeAddress;

    /** Only populated when it differs from the registered office. */
    @Column(name = "business_address", length = 500)
    private String businessAddress;

    @Column(name = "contact_person_name", length = 200)
    private String contactPersonName;

    @Column(name = "contact_person_designation", length = 150)
    private String contactPersonDesignation;

    @Column(name = "contact_person_email", length = 255)
    private String contactPersonEmail;

    @Column(name = "contact_person_phone", length = 50)
    private String contactPersonPhone;

    @Column(name = "tax_identification_number", length = 100)
    private String taxIdentificationNumber;
}
