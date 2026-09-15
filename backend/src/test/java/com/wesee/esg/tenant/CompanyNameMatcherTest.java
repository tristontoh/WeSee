/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant;

import com.wesee.esg.tenant.CompanyNameMatcher.Verdict;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The two ways this can be wrong are not equally bad, and the cases below are chosen accordingly.
 *
 * A false NEEDS_REVIEW costs a real company a wait and somebody twenty seconds. A false MATCH puts
 * a stranger's company name on a signed disclosure. So the borderline cases assert that we fall
 * towards review.
 */
class CompanyNameMatcherTest {

    private Verdict verdictFor(String claimed, String onDocument) {
        return CompanyNameMatcher.compare(claimed, onDocument).verdict();
    }

    // --- the same company, written the way different documents write it ---------------------------

    @Test
    void theSameNameInDifferentCaseMatches() {
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", "WESEE MANUFACTURING SDN BHD"))
                .isEqualTo(Verdict.MATCH);
    }

    @Test
    void punctuationOnTheEntityFormDoesNotMatter() {
        // A letterhead writes "Sdn. Bhd.", a bill writes "SDN BHD".
        assertThat(verdictFor("WeSee Manufacturing Sdn. Bhd.", "WESEE MANUFACTURING SDN BHD"))
                .isEqualTo(Verdict.MATCH);
    }

    @Test
    void theMalayLongFormMatchesTheAbbreviation() {
        // SSM prints SENDIRIAN BERHAD; everyone else writes SDN BHD.
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", "WESEE MANUFACTURING SENDIRIAN BERHAD"))
                .isEqualTo(Verdict.MATCH);
    }

    @Test
    void theSlashContractionMatches() {
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", "WESEE MANUFACTURING S/B"))
                .isEqualTo(Verdict.MATCH);
    }

    @Test
    void aBillPrintedWithoutTheEntityFormStillMatches() {
        // Utility accounts are frequently opened under the trading name alone.
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", "WESEE MANUFACTURING"))
                .isEqualTo(Verdict.MATCH);
    }

    @Test
    void ampersandAndTheWordAndAreTheSameCompany() {
        assertThat(verdictFor("Lim & Sons Trading Sdn Bhd", "LIM AND SONS TRADING SDN BHD"))
                .isEqualTo(Verdict.MATCH);
    }

    @Test
    void extraWhitespaceFromAPastedPdfDoesNotMatter() {
        assertThat(verdictFor("  WeSee   Manufacturing  Sdn Bhd ", "WESEE MANUFACTURING SDN BHD"))
                .isEqualTo(Verdict.MATCH);
    }

    @Test
    void oneBadCharacterFromOcrIsAbsorbedOnALongEnoughName() {
        // "MANUFACTURlNG" — a capital I read as a lowercase l, the classic scan error.
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", "WESEE MANUFACTURLNG SDN BHD"))
                .isEqualTo(Verdict.MATCH);
    }

    // --- different companies, which must not pass -------------------------------------------------

    @Test
    void aDifferentCompanyDoesNotMatch() {
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", "MAYBANK BERHAD"))
                .isEqualTo(Verdict.NEEDS_REVIEW);
    }

    @Test
    void sharingTheEntityFormIsNotSharingAnIdentity() {
        // Both end "SDN BHD". Comparing whole strings would score these dangerously close, which is
        // exactly why the ratio runs on the suffix-free core.
        assertThat(verdictFor("Alpha Sdn Bhd", "Beta Sdn Bhd")).isEqualTo(Verdict.NEEDS_REVIEW);
    }

    @Test
    void aRelatedButDistinctCompanyInTheSameGroupDoesNotMatch() {
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", "WESEE MARKETING SDN BHD"))
                .isEqualTo(Verdict.NEEDS_REVIEW);
    }

    @Test
    void aShortNameOffByOneLetterFallsToReviewRatherThanAccepting() {
        // On three characters there is nothing to separate a scan error from another company.
        assertThat(verdictFor("ABC Sdn Bhd", "ABD SDN BHD")).isEqualTo(Verdict.NEEDS_REVIEW);
    }

    @Test
    void aLandlordsNameOnTheBillFallsToReview() {
        // The common honest failure: the premises are rented and the account is the owner's.
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", "TAN PROPERTIES SDN BHD"))
                .isEqualTo(Verdict.NEEDS_REVIEW);
    }

    // --- nothing to compare -----------------------------------------------------------------------

    @Test
    void anUnreadableDocumentIsReviewedNotRefused() {
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", "")).isEqualTo(Verdict.NEEDS_REVIEW);
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", null)).isEqualTo(Verdict.NEEDS_REVIEW);
    }

    @Test
    void anEntityFormOnItsOwnIsNotAMatchForAnything() {
        // If the reader returns only "SDN BHD", both cores are empty — that must not score as equal.
        assertThat(verdictFor("WeSee Manufacturing Sdn Bhd", "SDN BHD")).isEqualTo(Verdict.NEEDS_REVIEW);
    }

    // --- the pieces, checked directly --------------------------------------------------------------

    @Test
    void normalisationCollapsesTheWaysOneNameGetsWritten() {
        assertThat(CompanyNameMatcher.normalise("WeSee  Manufacturing Sdn. Bhd."))
                .isEqualTo("WESEE MANUFACTURING SDN BHD");
        assertThat(CompanyNameMatcher.normalise("WeSee Manufacturing Sendirian Berhad"))
                .isEqualTo("WESEE MANUFACTURING SDN BHD");
    }

    @Test
    void onlyATrailingEntityFormIsStripped() {
        assertThat(CompanyNameMatcher.stripEntitySuffix("WESEE MANUFACTURING SDN BHD"))
                .isEqualTo("WESEE MANUFACTURING");
        // "Berhad Supplies" is a real shape; eating the leading word would merge distinct companies.
        assertThat(CompanyNameMatcher.stripEntitySuffix("BERHAD SUPPLIES SDN BHD"))
                .isEqualTo("BERHAD SUPPLIES");
    }

    @Test
    void wordsThatMerelyLookLikeBoilerplateAreKept() {
        // RESOURCES and HOLDINGS are part of the registered name, not the legal form.
        assertThat(CompanyNameMatcher.stripEntitySuffix("GREEN RESOURCES HOLDINGS SDN BHD"))
                .isEqualTo("GREEN RESOURCES HOLDINGS");
    }

    @Test
    void aNameWithAnExtraWordIsNotTheSameCompany() {
        // "ABC Resources Sdn Bhd" and "ABC Sdn Bhd" can both exist and be unrelated. Treating
        // RESOURCES as a strippable suffix would have merged them.
        assertThat(verdictFor("ABC Resources Sdn Bhd", "ABC SDN BHD")).isEqualTo(Verdict.NEEDS_REVIEW);
    }
}
