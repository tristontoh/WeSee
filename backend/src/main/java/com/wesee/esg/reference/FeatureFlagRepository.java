package com.wesee.esg.reference;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, String> {

    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — the admin
     * toggles a flag's plan gate and the row it just touched jumps somewhere else in the list.
     * The feature key is the identity shown, and it is unique, so it is a total order.
     */
    List<FeatureFlag> findAllByOrderByFeatureKeyAsc();
}
