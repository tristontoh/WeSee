/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.indicators.derivation;

import com.wesee.esg.reference.IndicatorDefinitionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Fails the application at boot when the catalogue names a formula the registry does not have.
 * The alternative is a null reaching a user who asked for an indicator, hours after a migration
 * typo shipped — this makes that typo stop the deploy instead.
 */
@Component
public class DerivationCatalogueVerifier implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DerivationCatalogueVerifier.class);

    private final IndicatorDefinitionRepository definitionRepository;

    public DerivationCatalogueVerifier(IndicatorDefinitionRepository definitionRepository) {
        this.definitionRepository = definitionRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> inUse = definitionRepository.findDistinctDerivationKeys();
        DerivationCatalogueCheck.verify(inUse);
        log.info("Derived indicators: {} formula(s) in use, all present in the registry", inUse.size());
    }
}
