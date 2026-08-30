/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.targets;

import com.wesee.esg.targets.dto.PerformanceTargetResponse;
import com.wesee.esg.targets.dto.UpsertPerformanceTargetRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/targets")
@PreAuthorize("@planGate.check('targets')")
public class PerformanceTargetController {

    private final PerformanceTargetService service;

    public PerformanceTargetController(PerformanceTargetService service) {
        this.service = service;
    }

    @GetMapping
    public List<PerformanceTargetResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public PerformanceTargetResponse get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    public ResponseEntity<PerformanceTargetResponse> create(@Valid @RequestBody UpsertPerformanceTargetRequest request) {
        return ResponseEntity.ok(service.create(request));
    }

    @PutMapping("/{id}")
    public PerformanceTargetResponse update(@PathVariable UUID id, @Valid @RequestBody UpsertPerformanceTargetRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
