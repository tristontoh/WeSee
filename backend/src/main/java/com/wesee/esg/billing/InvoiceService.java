package com.wesee.esg.billing;

import com.wesee.esg.billing.dto.InvoiceResponse;
import com.wesee.esg.tenant.Company;
import com.wesee.esg.tenant.CompanyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CompanyRepository companyRepository;

    public InvoiceService(InvoiceRepository invoiceRepository, CompanyRepository companyRepository) {
        this.invoiceRepository = invoiceRepository;
        this.companyRepository = companyRepository;
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> listAllInvoices() {
        return invoiceRepository.findAllByOrderByDueDateDescIdDesc().stream().map(this::toResponse).toList();
    }

    private InvoiceResponse toResponse(Invoice invoice) {
        String companyName = companyRepository.findById(invoice.getCompanyId())
                .map(Company::getName)
                .orElse(null);
        return InvoiceResponse.from(invoice, companyName);
    }
}
