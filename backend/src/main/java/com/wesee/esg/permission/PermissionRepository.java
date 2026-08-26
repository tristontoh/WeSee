package com.wesee.esg.permission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PermissionRepository extends JpaRepository<Permission, String> {
    List<Permission> findAllByOrderByDisplayOrderAsc();

    @Query("select p.key from Permission p")
    List<String> findAllKeys();
}
