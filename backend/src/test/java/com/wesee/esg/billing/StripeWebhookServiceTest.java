package com.wesee.esg.billing;

import com.wesee.esg.activitylog.PlatformActivityLogService;
import com.wesee.esg.common.exceptions.ForbiddenException;
import com.wesee.esg.platform.PlatformSettings;
import com.wesee.esg.platform.PlatformSettingsRepository;
import com.wesee.esg.security.SecretCryptoService;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.tenant.SubscriptionPlan;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StripeWebhookServiceTest {

    private final PlatformSettingsRepository platformSettingsRepository = Mockito.mock(PlatformSettingsRepository.class);
    private final SecretCryptoService cryptoService = Mockito.mock(SecretCryptoService.class);
    private final StripeWebhookVerifier verifier = Mockito.mock(StripeWebhookVerifier.class);
    private final CompanyRepository companyRepository = Mockito.mock(CompanyRepository.class);
    private final InvoiceRepository invoiceRepository = Mockito.mock(InvoiceRepository.class);
    private final PlatformActivityLogService activityLogService = Mockito.mock(PlatformActivityLogService.class);
    private final StripeWebhookService service = new StripeWebhookService(
            platformSettingsRepository, cryptoService, verifier, companyRepository, invoiceRepository, activityLogService, new ObjectMapper());

    private PlatformSettings settingsWithWebhookSecret() {
        PlatformSettings settings = new PlatformSettings();
        settings.setStripeWebhookSecretEncrypted("encrypted-secret");
        return settings;
    }

    private Company convertedCompany() {
        Company company = new Company();
        company.setName("Test Co");
        company.setTrialConverted(true);
        company.setSubscriptionPlan(SubscriptionPlan.STARTER);
        return company;
    }

    private void stubValidSignature() {
        Mockito.when(platformSettingsRepository.findFirstByOrderByCreatedAtAsc()).thenReturn(Optional.of(settingsWithWebhookSecret()));
        Mockito.when(cryptoService.decrypt("encrypted-secret")).thenReturn("whsec_test");
        Mockito.when(verifier.verify(Mockito.anyString(), Mockito.anyString(), Mockito.eq("whsec_test"))).thenReturn(true);
    }

    @Test
    void revokesTrialConversionOnSubscriptionDeleted() {
        stubValidSignature();

        Company company = convertedCompany();
        Mockito.when(companyRepository.findByStripeCustomerId("cus_123")).thenReturn(Optional.of(company));

        String payload = "{\"type\":\"customer.subscription.deleted\",\"data\":{\"object\":{\"customer\":\"cus_123\"}}}";
        service.handleEvent(payload, "any-header");

        assertThat(company.getTrialConverted()).isFalse();
        Mockito.verify(companyRepository).save(company);
        Mockito.verify(activityLogService).record(Mockito.any(), Mockito.eq("Test Co"), Mockito.any(), Mockito.anyString());
    }

    @Test
    void ignoresUnrelatedEventTypes() {
        stubValidSignature();

        String payload = "{\"type\":\"customer.updated\",\"data\":{\"object\":{\"customer\":\"cus_123\"}}}";
        service.handleEvent(payload, "any-header");

        Mockito.verifyNoInteractions(companyRepository);
        Mockito.verifyNoInteractions(invoiceRepository);
    }

    @Test
    void rejectsAnInvalidSignature() {
        stubValidSignature();
        Mockito.when(verifier.verify(Mockito.anyString(), Mockito.anyString(), Mockito.eq("whsec_test"))).thenReturn(false);

        assertThatThrownBy(() -> service.handleEvent("{}", "bad-header"))
                .isInstanceOf(ForbiddenException.class);

        Mockito.verifyNoInteractions(companyRepository);
    }

    @Test
    void rejectsWhenNoWebhookSecretIsConfigured() {
        Mockito.when(platformSettingsRepository.findFirstByOrderByCreatedAtAsc()).thenReturn(Optional.of(new PlatformSettings()));

        assertThatThrownBy(() -> service.handleEvent("{}", "any-header"))
                .isInstanceOf(ForbiddenException.class);

        Mockito.verifyNoInteractions(verifier);
        Mockito.verifyNoInteractions(companyRepository);
    }

    @Test
    void doesNothingWhenNoCompanyMatchesTheStripeCustomerId() {
        stubValidSignature();
        Mockito.when(companyRepository.findByStripeCustomerId("cus_unknown")).thenReturn(Optional.empty());

        String payload = "{\"type\":\"customer.subscription.deleted\",\"data\":{\"object\":{\"customer\":\"cus_unknown\"}}}";
        service.handleEvent(payload, "any-header");

        Mockito.verify(companyRepository, Mockito.never()).save(Mockito.any());
    }

    /**
     * "invoice.payment_succeeded" is what a real subscription checkout actually fires (verified
     * live via Stripe CLI against API version 2025-06-30.basil) — "invoice.paid" is also handled
     * for compatibility but was never observed to fire in practice for this flow.
     */
    @Test
    void recordsAnInvoiceOnInvoicePaymentSucceeded() {
        stubValidSignature();

        Company company = convertedCompany();
        Mockito.when(companyRepository.findByStripeCustomerId("cus_456")).thenReturn(Optional.of(company));
        Mockito.when(invoiceRepository.findByStripeInvoiceId("in_test123")).thenReturn(Optional.empty());

        String payload = """
                {"type":"invoice.payment_succeeded","data":{"object":{
                    "id":"in_test123",
                    "number":"EG-0001",
                    "customer":"cus_456",
                    "amount_paid":9900,
                    "due_date":1787761898,
                    "created":1787761800,
                    "lines":{"data":[{"description":"1 \\u00d7 STARTER Plan \\u2014 EsgEasy (at RM99.00 / month)"}]}
                }}}
                """;
        service.handleEvent(payload, "any-header");

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        Mockito.verify(invoiceRepository).save(captor.capture());
        Invoice saved = captor.getValue();
        assertThat(saved.getStripeInvoiceId()).isEqualTo("in_test123");
        assertThat(saved.getInvoiceNumber()).isEqualTo("EG-0001");
        assertThat(saved.getAmount()).isEqualByComparingTo(new BigDecimal("99.00"));
        assertThat(saved.getStatus()).isEqualTo(InvoiceStatus.PAID);
        assertThat(saved.getDescription()).contains("STARTER");
    }

    @Test
    void alsoRecordsAnInvoiceOnTheLegacyInvoicePaidEventName() {
        stubValidSignature();

        Company company = convertedCompany();
        Mockito.when(companyRepository.findByStripeCustomerId("cus_456")).thenReturn(Optional.of(company));
        Mockito.when(invoiceRepository.findByStripeInvoiceId("in_test999")).thenReturn(Optional.empty());

        String payload = "{\"type\":\"invoice.paid\",\"data\":{\"object\":{\"id\":\"in_test999\",\"customer\":\"cus_456\",\"amount_paid\":9900,\"created\":1787761800}}}";
        service.handleEvent(payload, "any-header");

        Mockito.verify(invoiceRepository).save(Mockito.any());
    }

    @Test
    void updatesTheSameInvoiceRowOnARedeliveredEvent() {
        stubValidSignature();

        Company company = convertedCompany();
        Mockito.when(companyRepository.findByStripeCustomerId("cus_456")).thenReturn(Optional.of(company));

        Invoice existing = new Invoice();
        existing.setStripeInvoiceId("in_test123");
        Mockito.when(invoiceRepository.findByStripeInvoiceId("in_test123")).thenReturn(Optional.of(existing));

        String payload = "{\"type\":\"invoice.paid\",\"data\":{\"object\":{\"id\":\"in_test123\",\"customer\":\"cus_456\",\"amount_paid\":9900,\"created\":1787761800}}}";
        service.handleEvent(payload, "any-header");

        ArgumentCaptor<Invoice> captor = ArgumentCaptor.forClass(Invoice.class);
        Mockito.verify(invoiceRepository).save(captor.capture());
        assertThat(captor.getValue()).isSameAs(existing);
    }
}
