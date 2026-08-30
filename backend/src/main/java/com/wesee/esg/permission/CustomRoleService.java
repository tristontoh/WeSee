/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.permission;

import com.wesee.esg.common.exceptions.ConflictException;
import com.wesee.esg.common.exceptions.NotFoundException;
import com.wesee.esg.permission.dto.CreateCustomRoleRequest;
import com.wesee.esg.permission.dto.CustomRoleResponse;
import com.wesee.esg.permission.dto.UpdateCustomRoleRequest;
import com.wesee.esg.security.CurrentUserProvider;
import com.wesee.esg.tenant.TeamInviteRepository;
import com.wesee.esg.user.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * CRUD for a company's custom roles — scoped via {@link CurrentUserProvider#requireCompanyId()},
 * the same isolation idiom {@code CompanyService} uses for team/invite management. The
 * {@code custom_role} table also carries the Hibernate {@code companyFilter} (TenantOwnedEntity)
 * as a data-access-layer backstop, so a role can never be read or modified cross-tenant even if
 * one of these explicit checks were ever missed.
 */
@Service
public class CustomRoleService {

    private final CustomRoleRepository customRoleRepository;
    private final PermissionRepository permissionRepository;
    private final AppUserRepository appUserRepository;
    private final TeamInviteRepository teamInviteRepository;
    private final CurrentUserProvider currentUserProvider;

    public CustomRoleService(CustomRoleRepository customRoleRepository, PermissionRepository permissionRepository,
                              AppUserRepository appUserRepository, TeamInviteRepository teamInviteRepository,
                              CurrentUserProvider currentUserProvider) {
        this.customRoleRepository = customRoleRepository;
        this.permissionRepository = permissionRepository;
        this.appUserRepository = appUserRepository;
        this.teamInviteRepository = teamInviteRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public List<CustomRoleResponse> list() {
        UUID companyId = currentUserProvider.requireCompanyId();
        return customRoleRepository.findByCompanyIdOrderByNameAsc(companyId).stream()
                .map(CustomRoleResponse::from)
                .toList();
    }

    @Transactional
    public CustomRoleResponse create(CreateCustomRoleRequest request) {
        UUID companyId = currentUserProvider.requireCompanyId();
        if (customRoleRepository.findByCompanyIdAndNameIgnoreCase(companyId, request.name()).isPresent()) {
            throw new ConflictException("A role named \"" + request.name() + "\" already exists");
        }

        CustomRole role = new CustomRole();
        role.setCompanyId(companyId);
        role.setName(request.name());
        role.setDescription(request.description());
        role.setPermissionKeys(validatedKeys(request.permissionKeys()));

        return CustomRoleResponse.from(customRoleRepository.save(role));
    }

    @Transactional
    public CustomRoleResponse update(UUID roleId, UpdateCustomRoleRequest request) {
        CustomRole role = requireOwnedRole(roleId);

        customRoleRepository.findByCompanyIdAndNameIgnoreCase(role.getCompanyId(), request.name())
                .filter(existing -> !existing.getId().equals(roleId))
                .ifPresent(existing -> {
                    throw new ConflictException("A role named \"" + request.name() + "\" already exists");
                });

        role.setName(request.name());
        role.setDescription(request.description());
        role.setPermissionKeys(validatedKeys(request.permissionKeys()));

        return CustomRoleResponse.from(customRoleRepository.save(role));
    }

    @Transactional
    public void delete(UUID roleId) {
        CustomRole role = requireOwnedRole(roleId);
        if (appUserRepository.existsByCustomRoleId(roleId)
                || teamInviteRepository.existsByCustomRoleIdAndAcceptedAtIsNullAndRevokedAtIsNull(roleId)) {
            throw new ConflictException("Cannot delete \"" + role.getName() + "\" — reassign the users and pending "
                    + "invites still on this role first");
        }
        customRoleRepository.delete(role);
    }

    /** Resolves a role ID against the caller's own company — used by CompanyService when validating a customRoleId to assign. */
    public CustomRole requireOwnedRole(UUID roleId) {
        CustomRole role = customRoleRepository.findById(roleId)
                .orElseThrow(() -> new NotFoundException("Role not found"));
        UUID companyId = currentUserProvider.requireCompanyId();
        if (!companyId.equals(role.getCompanyId())) {
            throw new NotFoundException("Role not found");
        }
        return role;
    }

    private List<String> validatedKeys(List<String> requestedKeys) {
        if (requestedKeys == null || requestedKeys.isEmpty()) {
            return List.of();
        }
        Set<String> knownKeys = Set.copyOf(permissionRepository.findAllKeys());
        List<String> unknown = requestedKeys.stream().filter(k -> !knownKeys.contains(k)).toList();
        if (!unknown.isEmpty()) {
            throw new IllegalArgumentException("Unknown permission key(s): " + unknown);
        }
        return List.copyOf(Set.copyOf(requestedKeys));
    }
}
