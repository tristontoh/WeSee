/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmissionFactorRepository extends JpaRepository<EmissionFactor, String> {

    /**
     * Ordered explicitly: an unordered scan gives no guarantee, and this feeds the activity
     * entry form's factor picker, where the scope groups need to stay together. SCOPE_1/2/3
     * sort the same alphabetically as they are numbered, so ordering by the stored enum name
     * gives the intended scope order.
     */
    List<EmissionFactor> findAllByOrderByScopeAscNameAsc();
}
