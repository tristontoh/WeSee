package com.wesee.esg.tenant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SectorRepository extends JpaRepository<Sector, String> {

    /** Ordered explicitly: an unordered scan gives no guarantee, and this feeds a sector picker. */
    List<Sector> findAllByOrderByNameAsc();
}
