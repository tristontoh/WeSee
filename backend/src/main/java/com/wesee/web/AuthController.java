package com.wesee.web;

import com.wesee.model.Organization;
import com.wesee.model.User;
import com.wesee.repo.OrganizationRepository;
import com.wesee.repo.UserRepository;
import com.wesee.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
public class AuthController {

    private final UserRepository users;
    private final OrganizationRepository orgs;
    private final JwtService jwt;
    private final BCryptPasswordEncoder encoder;

    public AuthController(UserRepository users, OrganizationRepository orgs,
                          JwtService jwt, BCryptPasswordEncoder encoder) {
        this.users = users;
        this.orgs = orgs;
        this.jwt = jwt;
        this.encoder = encoder;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "service", "gateway-java");
    }

    /** OAuth2 password flow — the frontend posts form-encoded username/password. */
    @PostMapping(value = "/auth/login", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public Dtos.LoginResponse login(@RequestParam String username, @RequestParam String password) {
        User user = users.findByEmail(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials"));
        if (!encoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad credentials");
        }
        Organization org = orgs.findById(user.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Org missing"));
        String token = jwt.issue(user, org);
        return new Dtos.LoginResponse(token, "bearer", org.getOrgType().getValue());
    }
}
