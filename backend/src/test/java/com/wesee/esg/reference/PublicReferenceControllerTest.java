package com.wesee.esg.reference;

import com.wesee.esg.apiaccess.ApiTokenRepository;
import com.wesee.esg.user.AppUserRepository;
import com.wesee.esg.config.SecurityConfig;
import com.wesee.esg.security.JwtService;
import com.wesee.esg.session.UserSessionRepository;
import com.wesee.esg.tenant.CompanyRepository;
import com.wesee.esg.tenant.SubscriptionPlan;
import com.wesee.esg.tenant.dto.PlanPricingResponse;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Guards the one route that must answer without a token.
 *
 * A regression here is silent rather than loud: the pricing page catches the failure and falls back
 * to figures compiled into the bundle, so the site keeps working while quoting prices nobody set.
 * The real SecurityConfig is loaded so the rules under test are the ones that ship.
 */
@WebMvcTest(controllers = PublicReferenceController.class)
@Import(SecurityConfig.class)
class PublicReferenceControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockBean
    private ReferenceService referenceService;

    // Leaf dependencies of the filters SecurityConfig builds. None of them are reached by an
    // unauthenticated GET, but the chain will not assemble without them.
    @MockBean private JwtService jwtService;
    @MockBean private AppUserRepository appUserRepository;
    @MockBean private UserSessionRepository userSessionRepository;
    @MockBean private ApiTokenRepository apiTokenRepository;
    @MockBean private CompanyRepository companyRepository;
    @MockBean private EntityManager entityManager;

    @Test
    void servesPlanPricingWithoutAToken() throws Exception {
        Mockito.when(referenceService.listPlanPricing()).thenReturn(List.of(
                new PlanPricingResponse(SubscriptionPlan.GROWTH, new BigDecimal("699.00"), new BigDecimal("583.00"))));

        mvc.perform(get("/api/v1/public/plan-pricing"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].plan").value("GROWTH"))
                .andExpect(jsonPath("$[0].monthlyPrice").value(699.00))
                .andExpect(jsonPath("$[0].annualMonthlyPrice").value(583.00));
    }

    /** The rule is GET-only, so /public cannot become a way in for anything that writes. */
    @Test
    void refusesAWriteToTheSamePath() throws Exception {
        mvc.perform(post("/api/v1/public/plan-pricing"))
                .andExpect(status().isForbidden());
    }
}
