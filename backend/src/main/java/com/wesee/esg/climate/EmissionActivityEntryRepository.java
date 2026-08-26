package com.wesee.esg.climate;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmissionActivityEntryRepository extends JpaRepository<EmissionActivityEntry, UUID> {
    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the list
     * visibly reshuffles after a save. {@code id} breaks ties, since rows seeded in one
     * transaction can share a timestamp. The activity log reads as a sequence, so entries stay in the order they were added.
     */
    List<EmissionActivityEntry> findByCompanyIdAndFiscalYearOrderByCreatedAtAscIdAsc(UUID companyId, int fiscalYear);

    Optional<EmissionActivityEntry> findByIdAndCompanyId(UUID id, UUID companyId);

    /**
     * Each fiscal year's total tCO2e for one scope, rolled up from the individual activity entries.
     *
     * The scope comes from the factor, which is where it is defined — an activity is Scope 1 or 2
     * because of what it burns, not because of anything recorded on the entry. Used to give the
     * emissions figures a value for a year nobody has typed one into.
     */
    @Query("""
            select e.fiscalYear, sum(e.calculatedTco2e)
              from EmissionActivityEntry e
             where e.companyId = :companyId
               and e.emissionFactor.scope = :scope
             group by e.fiscalYear
             order by e.fiscalYear asc
            """)
    List<Object[]> sumTco2eByFiscalYear(@Param("companyId") UUID companyId, @Param("scope") EmissionScope scope);
}
