/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.denominator.AnnualFigureKey;
import com.wesee.esg.denominator.BoardComposition;
import com.wesee.esg.denominator.BoardMember;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The eleven formulas, as named functions. Not an expression parsed at runtime: an evaluator
 * would be a new attack surface and a new class of silent wrong answers, for formulas that change
 * about once a decade. These are pure — no repository, no clock — so every one is unit-tested
 * against a worked example.
 */
public final class DerivationRegistry {

    private static final Map<String, Derivation> DERIVATIONS = build();

    private DerivationRegistry() {
    }

    public static Derivation get(String key) {
        Derivation d = DERIVATIONS.get(key);
        if (d == null) {
            throw new IllegalStateException(
                    "No derivation named '" + key + "'. An indicator definition is marked DERIVED"
                            + " against a formula that does not exist — check the migration that set it."
                            + " The registry knows: " + String.join(", ", DERIVATIONS.keySet()));
        }
        return d;
    }

    public static Set<String> keys() {
        return DERIVATIONS.keySet();
    }

    private static Map<String, Derivation> build() {
        Map<String, Derivation> m = new LinkedHashMap<>();

        m.put("ENERGY_INTENSITY_REVENUE", new Derivation() {
            @Override
            public DerivationResult compute(DerivationInputs in) {
                BigDecimal mwh = in.indicator("IND-ENG-01", "MWh");
                BigDecimal revenue = in.figure(AnnualFigureKey.REVENUE);
                List<String> missing = new ArrayList<>();
                if (mwh == null) {
                    missing.add("Total electricity consumed (IND-ENG-01)");
                }
                if (revenue == null) {
                    missing.add("Revenue");
                }
                if (!missing.isEmpty()) {
                    return DerivationResult.awaiting(missing);
                }
                return finish(Ratios.rate(mwh, revenue), mwh, revenue, "Revenue", false);
            }

            @Override
            public String formula() {
                return "Electricity consumed (MWh) / revenue (RM mil)";
            }

            @Override
            public String outputUnit() {
                return "MWh/RM mil";
            }
        });

        m.put("CARBON_INTENSITY_REVENUE", new Derivation() {
            @Override
            public DerivationResult compute(DerivationInputs in) {
                BigDecimal scope1 = in.indicator("IND-ENG-02", "tCO2e");
                BigDecimal scope2 = in.indicator("IND-ENG-03", "tCO2e");
                BigDecimal revenue = in.figure(AnnualFigureKey.REVENUE);
                List<String> missing = new ArrayList<>();
                if (scope1 == null) {
                    missing.add("Scope 1 direct GHG footprint (IND-ENG-02)");
                }
                if (scope2 == null) {
                    missing.add("Scope 2 indirect grid footprint (IND-ENG-03)");
                }
                if (revenue == null) {
                    missing.add("Revenue");
                }
                if (!missing.isEmpty()) {
                    return DerivationResult.awaiting(missing);
                }
                BigDecimal total = scope1.add(scope2);
                BigDecimal value = Ratios.rate(total, revenue);
                if (value == null) {
                    return DerivationResult.awaiting(List.of("Revenue is zero"));
                }
                return DerivationResult.computed(value,
                        scope1.toPlainString() + " + " + scope2.toPlainString() + " = "
                                + total.toPlainString() + " tCO2e ÷ " + revenue.toPlainString()
                                + " RM mil = " + value.toPlainString());
            }

            @Override
            public String formula() {
                return "(Scope 1 + Scope 2) (tCO2e) / revenue (RM mil)";
            }

            @Override
            public String outputUnit() {
                return "tCO2e/RM mil";
            }
        });

        m.put("FEMALE_BOARD_RATIO", new Derivation() {
            @Override
            public DerivationResult compute(DerivationInputs in) {
                List<BoardMember> roster = in.board();
                int directors = BoardComposition.directorCount(roster);
                if (directors == 0) {
                    return DerivationResult.awaiting(List.of("Board roster for this financial year"));
                }
                int female = BoardComposition.femaleCount(roster);
                BigDecimal value = Ratios.percentage(
                        BigDecimal.valueOf(female), BigDecimal.valueOf(directors));
                return DerivationResult.computed(value,
                        female + " of " + directors + " directors × 100 = " + value.toPlainString() + "%");
            }

            @Override
            public String formula() {
                return "Female directors / all directors × 100";
            }

            @Override
            public String outputUnit() {
                return "%";
            }
        });

        m.put("LOST_TIME_INCIDENT_RATE", new Derivation() {
            @Override
            public DerivationResult compute(DerivationInputs in) {
                BigDecimal injuries = in.figure(AnnualFigureKey.LOST_TIME_INJURIES);
                BigDecimal hours = in.figure(AnnualFigureKey.TOTAL_HOURS_WORKED);
                List<String> missing = new ArrayList<>();
                if (injuries == null) {
                    missing.add("Lost time injuries");
                }
                if (hours == null) {
                    missing.add("Total hours worked");
                }
                if (!missing.isEmpty()) {
                    return DerivationResult.awaiting(missing);
                }
                BigDecimal value = Ratios.perHundredThousandHours(injuries, hours);
                if (value == null) {
                    return DerivationResult.awaiting(List.of("Total hours worked is zero"));
                }
                return DerivationResult.computed(value,
                        injuries.toPlainString() + " × 200,000 ÷ " + hours.toPlainString()
                                + " hours = " + value.toPlainString());
            }

            @Override
            public String formula() {
                return "Lost time injuries × 200,000 / total hours worked";
            }

            @Override
            public String outputUnit() {
                return "Rate";
            }
        });

        m.put("WATER_RECYCLING_RATE", new Derivation() {
            @Override
            public DerivationResult compute(DerivationInputs in) {
                BigDecimal recycled = in.figure(AnnualFigureKey.RECYCLED_WATER_VOLUME);
                BigDecimal intake = in.indicator("IND-WAT-01", "m3");
                List<String> missing = new ArrayList<>();
                if (recycled == null) {
                    missing.add("Recycled water volume");
                }
                if (intake == null) {
                    missing.add("Municipal fresh water intake (IND-WAT-01)");
                }
                if (!missing.isEmpty()) {
                    return DerivationResult.awaiting(missing);
                }
                // Recycled over the total water the company put through, which is what a
                // "recycling rate" means — not recycled over intake, which can exceed 100%.
                BigDecimal total = recycled.add(intake);
                BigDecimal value = Ratios.percentage(recycled, total);
                if (value == null) {
                    return DerivationResult.awaiting(List.of("Recycled plus intake is zero"));
                }
                return DerivationResult.computed(value,
                        recycled.toPlainString() + " ÷ (" + recycled.toPlainString() + " + "
                                + intake.toPlainString() + ") × 100 = " + value.toPlainString() + "%");
            }

            @Override
            public String formula() {
                return "Recycled water / (recycled + fresh intake) × 100";
            }

            @Override
            public String outputUnit() {
                return "%";
            }
        });

        m.put("ANTICORRUPTION_TRAINING_RATE", figureRatio(
                "Employees trained on anti-corruption / average headcount × 100", "%",
                AnnualFigureKey.EMPLOYEES_TRAINED_ANTICORRUPTION, "Employees trained on anti-corruption",
                AnnualFigureKey.AVERAGE_HEADCOUNT, "Average headcount", true));

        m.put("SUPPLIER_ASSESSMENT_RATE", figureRatio(
                "Tier-1 suppliers assessed / tier-1 suppliers × 100", "%",
                AnnualFigureKey.TIER1_SUPPLIERS_ASSESSED, "Tier-1 suppliers assessed for ESG compliance",
                AnnualFigureKey.TIER1_SUPPLIERS, "Tier-1 suppliers", true));

        m.put("CLIMATE_RISK_SITE_COVERAGE", figureRatio(
                "Sites assessed for physical climate risk / operational sites × 100", "% sites",
                AnnualFigureKey.SITES_CLIMATE_RISK_ASSESSED, "Sites assessed for physical climate risk",
                AnnualFigureKey.OPERATIONAL_SITES, "Operational sites", true));

        m.put("TRAINING_HOURS_PER_EMPLOYEE", figureRatio(
                "Total training hours / average headcount", "Hours",
                AnnualFigureKey.TOTAL_TRAINING_HOURS, "Total training hours delivered",
                AnnualFigureKey.AVERAGE_HEADCOUNT, "Average headcount", false));

        m.put("VOLUNTARY_TURNOVER_RATE", figureRatio(
                "Voluntary departures / average headcount × 100", "%",
                AnnualFigureKey.EMPLOYEE_DEPARTURES, "Voluntary departures",
                AnnualFigureKey.AVERAGE_HEADCOUNT, "Average headcount", true));

        m.put("MATERIAL_CONVERSION_RATE", figureRatio(
                "Raw material converted / raw material input × 100", "%",
                AnnualFigureKey.RAW_MATERIAL_CONVERTED, "Raw material converted to finished goods",
                AnnualFigureKey.RAW_MATERIAL_INPUT, "Raw material input", true));

        return Map.copyOf(m);
    }

    /** Two figures in, one ratio out — the shape seven of the thirteen derivations take. */
    private static Derivation figureRatio(String formulaText, String outputUnit,
                                          AnnualFigureKey numeratorKey, String numeratorLabel,
                                          AnnualFigureKey denominatorKey, String denominatorLabel,
                                          boolean asPercentage) {
        return new Derivation() {
            @Override
            public DerivationResult compute(DerivationInputs in) {
                BigDecimal numerator = in.figure(numeratorKey);
                BigDecimal denominator = in.figure(denominatorKey);
                List<String> missing = new ArrayList<>();
                if (numerator == null) {
                    missing.add(numeratorLabel);
                }
                if (denominator == null) {
                    missing.add(denominatorLabel);
                }
                if (!missing.isEmpty()) {
                    return DerivationResult.awaiting(missing);
                }
                BigDecimal value = asPercentage
                        ? Ratios.percentage(numerator, denominator)
                        : Ratios.rate(numerator, denominator);
                return finish(value, numerator, denominator, denominatorLabel, asPercentage);
            }

            @Override
            public String formula() {
                return formulaText;
            }

            @Override
            public String outputUnit() {
                return outputUnit;
            }
        };
    }

    /** A zero denominator is reported as a missing input, not as an exception or an infinity. */
    private static DerivationResult finish(BigDecimal value, BigDecimal numerator,
                                           BigDecimal denominator, String denominatorLabel,
                                           boolean asPercentage) {
        if (value == null) {
            return DerivationResult.awaiting(List.of(denominatorLabel + " is zero"));
        }
        return DerivationResult.computed(value,
                numerator.toPlainString() + " ÷ " + denominator.toPlainString()
                        + (asPercentage ? " × 100 = " + value.toPlainString() + "%"
                                        : " = " + value.toPlainString()));
    }
}
