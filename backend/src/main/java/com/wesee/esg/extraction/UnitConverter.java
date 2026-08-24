package com.wesee.esg.extraction;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;
import java.util.Map;

/**
 * Converts a figure as printed on a document into the unit an indicator or emission factor is
 * denominated in — a bill reads kWh, IND-ENG-01 is in MWh. Deliberately a small closed table
 * rather than a general units library: the set of units this platform deals in is fixed and
 * short, and an unknown pair must fail loudly rather than guess.
 */
public final class UnitConverter {

    private static final int SCALE = 4;

    /** Multiplier taking {@code from} to {@code to}. Keyed "from|to", both lowercase. */
    private static final Map<String, BigDecimal> FACTORS = Map.of(
            "kwh|mwh", new BigDecimal("0.001"),
            "mwh|kwh", new BigDecimal("1000"),
            "liters|m3", new BigDecimal("0.001"),
            "m3|liters", new BigDecimal("1000"),
            "kg|tonnes", new BigDecimal("0.001"),
            "tonnes|kg", new BigDecimal("1000")
    );

    private UnitConverter() {
    }

    public static boolean canConvert(String fromUnit, String toUnit) {
        String from = normalise(fromUnit);
        String to = normalise(toUnit);
        return from.equals(to) || FACTORS.containsKey(from + "|" + to);
    }

    public static BigDecimal convert(BigDecimal value, String fromUnit, String toUnit) {
        String from = normalise(fromUnit);
        String to = normalise(toUnit);

        if (from.equals(to)) {
            return value.setScale(SCALE, RoundingMode.HALF_UP);
        }
        BigDecimal factor = FACTORS.get(from + "|" + to);
        if (factor == null) {
            throw new IllegalArgumentException("No conversion from " + fromUnit + " to " + toUnit);
        }
        return value.multiply(factor).setScale(SCALE, RoundingMode.HALF_UP);
    }

    private static String normalise(String unit) {
        return unit == null ? "" : unit.trim().toLowerCase(Locale.ROOT);
    }
}
