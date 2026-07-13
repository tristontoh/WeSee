package com.wesee.repo;

import com.wesee.model.SupplierLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplierLinkRepository extends JpaRepository<SupplierLink, String> {
    List<SupplierLink> findByBuyerOrgId(String buyerOrgId);
}
