/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant;

import com.wesee.esg.tenant.SsmRegistrationNumber.InvalidSsmNumberException;
import org.junit.jupiter.api.Test;

import java.time.Year;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Every case here is a real thing a person types. The cost of getting this wrong is asymmetric:
 * accepting rubbish weakens a constraint, but rejecting a valid number turns away a paying customer
 * who is holding their own SSM print-out and is certain the software is broken.
 */
class SsmRegistrationNumberTest {

    @Test
    void theTwelveDigitNumberIsTakenAsItIs() {
        assertThat(SsmRegistrationNumber.canonicalise("202101012345")).isEqualTo("202101012345");
    }

    @Test
    void theFormAnSsmPrintOutActuallyShowsIsAccepted() {
        // Post-2019 entities carry both numbers and print them together.
        assertThat(SsmRegistrationNumber.canonicalise("202101012345 (1234567-X)")).isEqualTo("202101012345");
        assertThat(SsmRegistrationNumber.canonicalise("202101012345(1234567-X)")).isEqualTo("202101012345");
        assertThat(SsmRegistrationNumber.canonicalise("202101012345 ( 1234567 - X )")).isEqualTo("202101012345");
    }

    @Test
    void pastedWhitespaceAndCaseDoNotMatter() {
        assertThat(SsmRegistrationNumber.canonicalise("  202101012345  ")).isEqualTo("202101012345");
        assertThat(SsmRegistrationNumber.canonicalise("2021 0101 2345")).isEqualTo("202101012345");
        assertThat(SsmRegistrationNumber.canonicalise("202101012345 (1234567-x)")).isEqualTo("202101012345");
    }

    @Test
    void aNonBreakingSpaceFromAPdfIsNotAFailure() {
        assertThat(SsmRegistrationNumber.canonicalise("202101012345 (1234567-X)")).isEqualTo("202101012345");
    }

    @Test
    void theOldNumberAloneIsRefusedButTheMessageSaysWhereToFindTheNewOne() {
        assertThatThrownBy(() -> SsmRegistrationNumber.canonicalise("1234567-X"))
                .isInstanceOf(InvalidSsmNumberException.class)
                .hasMessageContaining("12-digit")
                .hasMessageContaining("202101012345");
    }

    @Test
    void aYearNoCompanyCouldHaveBeenRegisteredInIsRefused() {
        int nextYear = Year.now().getValue() + 1;
        assertThatThrownBy(() -> SsmRegistrationNumber.canonicalise(nextYear + "01012345"))
                .isInstanceOf(InvalidSsmNumberException.class)
                .hasMessageContaining("year");

        assertThatThrownBy(() -> SsmRegistrationNumber.canonicalise("189901012345"))
                .isInstanceOf(InvalidSsmNumberException.class);
    }

    @Test
    void aNumberFromThisYearIsFine() {
        String thisYear = Year.now().getValue() + "01000001";
        assertThat(SsmRegistrationNumber.canonicalise(thisYear)).isEqualTo(thisYear);
    }

    @Test
    void theEntityTypeDigitsAreNotJudged() {
        // Published sources disagree on these — 04 and 07 are both cited for sole proprietors — so
        // guessing would reject real businesses. Anything that parses as a year is accepted.
        for (String type : new String[] {"01", "02", "04", "05", "07", "99"}) {
            assertThat(SsmRegistrationNumber.canonicalise("2021" + type + "012345"))
                    .isEqualTo("2021" + type + "012345");
        }
    }

    @Test
    void wrongLengthsAreRefused() {
        for (String bad : new String[] {"20210101234", "2021010123456", "", "   "}) {
            assertThatThrownBy(() -> SsmRegistrationNumber.canonicalise(bad))
                    .isInstanceOf(InvalidSsmNumberException.class);
        }
    }

    @Test
    void nullIsRefusedWithoutBlowingUp() {
        assertThatThrownBy(() -> SsmRegistrationNumber.canonicalise(null))
                .isInstanceOf(InvalidSsmNumberException.class)
                .hasMessageContaining("SSM registration number");
    }

    @Test
    void somethingThatIsNotANumberAtAllGetsTheGeneralMessage() {
        assertThatThrownBy(() -> SsmRegistrationNumber.canonicalise("my company sdn bhd"))
                .isInstanceOf(InvalidSsmNumberException.class)
                .hasMessageContaining("202101012345");
    }

    /**
     * The whole point of storing one form. If both were accepted, one company could hold two
     * workspaces and the unique index in V82 would be decoration.
     */
    @Test
    void bothPrintedFormsOfOneCompanyCollapseToTheSameStoredValue() {
        String fromTheCertificate = SsmRegistrationNumber.canonicalise("202101012345 (1234567-X)");
        String fromTheLetterhead = SsmRegistrationNumber.canonicalise("202101012345");
        assertThat(fromTheCertificate).isEqualTo(fromTheLetterhead);
    }
}
