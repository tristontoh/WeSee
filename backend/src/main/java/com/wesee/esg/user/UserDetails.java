package com.wesee.esg.user;

import com.wesee.esg.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Extended profile fields for {@link AppUser}, 1:1, created lazily on first profile edit. */
@Entity
@Table(name = "user_details")
@Getter
@Setter
@NoArgsConstructor
public class UserDetails extends BaseEntity {

    @Column(name = "user_id", nullable = false, unique = true, updatable = false)
    private UUID userId;

    @Column(length = 30)
    private String phone;

    @Column(name = "job_title", length = 150)
    private String jobTitle;

    @Column(length = 150)
    private String department;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "avatar_color", nullable = false, length = 7)
    private String avatarColor;
}
