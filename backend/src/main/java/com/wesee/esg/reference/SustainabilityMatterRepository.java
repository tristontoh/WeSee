package com.wesee.esg.reference;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SustainabilityMatterRepository extends JpaRepository<SustainabilityMatter, String> {

    /**
     * Ordered explicitly. These rows are upsertable (see ReferenceService#upsertMatter), so
     * Postgres rewrites the tuple and an unordered scan then returns the edited matter in a
     * different position. Category-then-name matches how MatterOwnershipRepository already
     * orders the governance screen's matter list. Ordering by {@code id} would not work: the
     * ids are text, so BURSA-10 sorts before BURSA-2.
     */
    List<SustainabilityMatter> findByMatterSetOrderByCategoryAscNameAsc(MatterSet matterSet);

    /** Ordered for the same reason as {@link #findByMatterSetOrderByCategoryAscNameAsc}. */
    List<SustainabilityMatter> findAllByOrderByCategoryAscNameAsc();
}
