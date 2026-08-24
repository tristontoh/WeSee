package com.wesee.esg.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    List<Invoice> findByCompanyId(UUID companyId);

    /**
     * Ordered explicitly. Postgres writes a new tuple on update and reuses whatever slot is
     * free, so an unordered scan returns edited rows in a different position — marking an
     * invoice paid would otherwise move it in the admin list. {@code id} breaks ties, since
     * two invoices can fall due on the same day. Most recent billing period first.
     */
    List<Invoice> findAllByOrderByDueDateDescIdDesc();
}
