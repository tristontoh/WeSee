package com.wesee.esg.reference;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SustainabilityMatterRepository extends JpaRepository<SustainabilityMatter, String> {
    List<SustainabilityMatter> findByMatterSet(MatterSet matterSet);
}
