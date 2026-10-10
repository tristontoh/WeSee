/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.denominator;

/**
 * The per-fiscal-year figures the platform's ratio indicators divide by. Each constant carries its
 * canonical unit, so a stored figure can be rendered and unit-checked without a second lookup.
 *
 * <p>Two figures that look like they belong here are deliberately absent: total energy, because
 * {@code IND-ENG-01} already records electricity in MWh, and total waste, because
 * {@code IND-WST-01} and {@code IND-WST-02} already carry generated and landfilled tonnage. A
 * second home for the same quantity is two numbers that can disagree.
 */
public enum AnnualFigureKey {

    REVENUE("RM mil", "Revenue", FigureGroup.FINANCIAL),
    PRODUCTION_OUTPUT("Units", "Production output", FigureGroup.FINANCIAL),
    RAW_MATERIAL_INPUT("Tonnes", "Raw material input", FigureGroup.FINANCIAL),
    RAW_MATERIAL_CONVERTED("Tonnes", "Raw material converted to finished goods", FigureGroup.FINANCIAL),

    AVERAGE_HEADCOUNT("People", "Average headcount", FigureGroup.WORKFORCE),
    EMPLOYEE_DEPARTURES("People", "Voluntary departures", FigureGroup.WORKFORCE),
    FEMALE_HEADCOUNT("People", "Female employees", FigureGroup.WORKFORCE),
    TOTAL_HOURS_WORKED("Hours", "Total hours worked", FigureGroup.WORKFORCE),
    LOST_TIME_INJURIES("Cases", "Lost time injuries", FigureGroup.WORKFORCE),
    TOTAL_TRAINING_HOURS("Hours", "Total training hours delivered", FigureGroup.WORKFORCE),
    EMPLOYEES_TRAINED_ANTICORRUPTION("People", "Employees trained on anti-corruption", FigureGroup.WORKFORCE),
    EMPLOYEES_AWARDED_EQUITY("People", "Employees awarded equity (ESOS)", FigureGroup.WORKFORCE),

    OPERATIONAL_SITES("Sites", "Operational sites", FigureGroup.SITES_AND_SUPPLIERS),
    SITES_CLIMATE_RISK_ASSESSED("Sites", "Sites assessed for physical climate risk", FigureGroup.SITES_AND_SUPPLIERS),
    SITES_NEAR_HIGH_CONSERVATION_VALUE("Sites", "Sites near high conservation value areas", FigureGroup.SITES_AND_SUPPLIERS),
    TIER1_SUPPLIERS("Suppliers", "Tier-1 suppliers", FigureGroup.SITES_AND_SUPPLIERS),
    TIER1_SUPPLIERS_ASSESSED("Suppliers", "Tier-1 suppliers assessed for ESG compliance", FigureGroup.SITES_AND_SUPPLIERS),

    RECYCLED_WATER_VOLUME("m3", "Recycled water volume", FigureGroup.WATER);

    private final String canonicalUnit;
    private final String label;
    private final FigureGroup group;

    AnnualFigureKey(String canonicalUnit, String label, FigureGroup group) {
        this.canonicalUnit = canonicalUnit;
        this.label = label;
        this.group = group;
    }

    public String canonicalUnit() {
        return canonicalUnit;
    }

    public String label() {
        return label;
    }

    public FigureGroup group() {
        return group;
    }

    /** How the data-entry screen divides these, matching how a reporting team divides the work. */
    public enum FigureGroup {
        FINANCIAL,
        WORKFORCE,
        SITES_AND_SUPPLIERS,
        WATER
    }
}
