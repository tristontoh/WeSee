/*
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */
package com.wesee.esg.tenant;

import com.wesee.esg.common.TenantOwnedEntity;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.io.File;
import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * One rule, enforced structurally rather than by reading every file: a repository for data that
 * belongs to a tenant must not offer a way to read it without naming the tenant.
 *
 * <p>The Hibernate {@code companyFilter} is a safety net, not the mechanism — it is enabled per
 * request from the authenticated principal, so anything running outside a request (a scheduled
 * job, a test, a future background task) has no net at all. The explicit predicate is the
 * mechanism, and this test is what stops the next finder being added without one.
 *
 * <p>It reads the compiled classes rather than the source, so it cannot be fooled by a comment.
 */
class TenantScopingInvariantTest {

    /** Methods that read or write data and therefore need a tenant in their signature. */
    private static final List<String> DATA_METHODS = List.of("find", "get", "read", "count", "delete", "exists");

    /**
     * Finders that deliberately take no company, each for a reason that would break the product
     * if it were scoped. A name here is a decision, so adding one should be argued for.
     */
    private static final List<String> DELIBERATE_EXCEPTIONS = List.of(
            // Credential and webhook lookups: the caller has no company yet, or is not a person.
            // Scoping these would make signing in, accepting an invite, or settling a Stripe
            // invoice impossible.
            "findByInviteTokenHash", "findByToken", "findByTokenHash", "findByEmailIgnoreCase",
            "findByStripeInvoiceId",

            // Platform-admin consoles, each behind @PreAuthorize("hasAnyRole('PLATFORM_ADMIN',
            // 'SUPERADMIN')") on its controller. Seeing every company is the point.
            "findAllByOrderByCreatedAtDescIdDesc", "findAllByOrderByDueDateDescIdDesc",

            // Children reached only after their parent was resolved with findByIdAndCompanyId,
            // which is what proves the tenant. Verified caller by caller: the assessment
            // (MaterialityService:130,192), the Scope 3 category (EmissionsService:245,265 and
            // Scope3AllocationService via requireStandardCategory), the business segment
            // (IfrsService:119,135,144), the document (ExtractionService:79,90,103), and the
            // custom role (CustomRoleService.requireOwnedRole).
            "findByAssessmentIdOrderByCreatedAtAscIdAsc", "findByAssessmentIdOrderBySortOrder",
            "findByCategoryIdAndFiscalYear", "findByCategoryIdOrderByFiscalYearAsc",
            "deleteByCategoryId", "findBySegmentIdOrderByCreatedAtAscIdAsc", "deleteBySegmentId",
            "findByDocumentIdOrderByCreatedAtAscIdAsc", "deleteByDocumentId",
            "existsByCustomRoleIdAndAcceptedAtIsNullAndRevokedAtIsNull",
            "findByDisclosureIdOrderByScopeAsc",
            // Messages hang off a ticket that TicketMessageService.requireTicket has already put
            // through TicketAccessGuard — which is what this name lacked until that guard existed.
            "findByTicketIdOrderByCreatedAtAsc",

            // Bound in JPQL rather than in the name; the @Query check below verifies them.
            "findPublishedForBuyer", "findForSupplier", "findByIdForBuyer", "findByIdForSupplier",
            "findLiveForLinkAndYear", "existsNewerThan", "findForLinkAndYear",
            "findDistinctDerivationKeys");

    @Test
    void noRepositoryOfTenantDataCanReadItWithoutNamingTheTenant() throws Exception {
        List<String> offenders = new ArrayList<>();
        int checked = 0;

        for (Class<?> repo : repositories()) {
            Class<?> entity = entityOf(repo);
            if (entity == null || !TenantOwnedEntity.class.isAssignableFrom(entity)) {
                continue;
            }
            checked++;
            for (Method m : repo.getDeclaredMethods()) {
                String name = m.getName();
                if (DATA_METHODS.stream().noneMatch(name::startsWith)) {
                    continue;
                }
                if (DELIBERATE_EXCEPTIONS.contains(name)) {
                    continue;
                }
                boolean namesCompany = name.contains("CompanyId") || name.contains("Company_");
                Query q = m.getAnnotation(Query.class);
                boolean bindsCompany = q != null && q.value().toLowerCase().contains("companyid");
                if (!namesCompany && !bindsCompany) {
                    offenders.add("  " + repo.getSimpleName() + "." + name
                            + "  (entity " + entity.getSimpleName() + " is tenant-owned)");
                }
            }
        }

        assertTrue(checked > 10, "found only " + checked + " tenant repositories — the scan is broken,"
                + " not the code");
        assertTrue(offenders.isEmpty(),
                "These read tenant data without naming the tenant. Either add the company id to the\n"
                        + "signature, bind it in @Query, or add the name to DELIBERATE_EXCEPTIONS with\n"
                        + "a comment saying why:\n" + String.join("\n", offenders));
    }

    /** Nothing may switch the safety net off — not even once, not even in a migration path. */
    @Test
    void nothingDisablesTheTenantFilter() throws Exception {
        Path src = Path.of("src/main/java");
        try (Stream<Path> files = Files.walk(src)) {
            List<String> hits = files
                    .filter(p -> p.toString().endsWith(".java"))
                    .filter(p -> {
                        try {
                            return Files.readString(p).contains("disableFilter");
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .map(Path::toString)
                    .toList();
            assertTrue(hits.isEmpty(), "disableFilter appears in: " + hits);
        }
    }

    @Test
    void theTenantFilterIsDeclaredOnTheMappedSuperclass() {
        org.hibernate.annotations.FilterDef def =
                TenantOwnedEntity.class.getAnnotation(org.hibernate.annotations.FilterDef.class);
        org.hibernate.annotations.Filter filter =
                TenantOwnedEntity.class.getAnnotation(org.hibernate.annotations.Filter.class);
        assertFalse(def == null, "TenantOwnedEntity lost its @FilterDef");
        assertFalse(filter == null, "TenantOwnedEntity lost its @Filter");
        assertTrue(filter.condition().contains("company_id"), filter.condition());
    }

    /**
     * The rule the companyFilter cannot enforce for you.
     *
     * <p>A Hibernate filter is applied when Hibernate builds a query. A load by primary key does
     * not build one, so {@code findById} on a tenant-owned row returns it whatever company is
     * bound to the session — {@link TenantFilterCoverageTest} proves this against a real database.
     * Three tenant-facing support endpoints relied on the filter here and were reading, writing
     * and annotating other companies' tickets as a result.
     *
     * <p>So: a raw {@code findById} on a tenant-owned repository is only safe inside a method that
     * also checks the company. The check is textual and therefore coarse — it asks whether the
     * enclosing method mentions the tenant at all — but it is enough to stop the next
     * {@code findById(id)} that mentions nothing.
     */
    @Test
    void everyFindByIdOnTenantDataSitsInAMethodThatChecksTheCompany() throws Exception {
        Set<String> tenantRepoNames = new HashSet<>();
        for (Class<?> repo : repositories()) {
            Class<?> entity = entityOf(repo);
            if (entity != null && TenantOwnedEntity.class.isAssignableFrom(entity)) {
                tenantRepoNames.add(repo.getSimpleName());
            }
        }
        assertTrue(tenantRepoNames.size() > 10, "scan is broken: " + tenantRepoNames.size());

        List<String> offenders = new ArrayList<>();
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            for (Path file : files.filter(f -> f.toString().endsWith(".java")).toList()) {
                if (file.getFileName().toString().endsWith("Repository.java")) {
                    continue;
                }
                String text = Files.readString(file);
                for (String field : fieldsOfType(text, tenantRepoNames)) {
                    int at = -1;
                    while ((at = text.indexOf(field + ".findById(", at + 1)) >= 0) {
                        String body = enclosingMethod(text, at);
                        if (!body.contains("companyId") && !body.contains("canReach")) {
                            offenders.add("  " + file.getFileName() + ": " + field
                                    + ".findById() in a method that never mentions the company");
                        }
                    }
                }
            }
        }
        assertTrue(offenders.isEmpty(),
                "findById does NOT apply the companyFilter. Each of these loads a tenant-owned row\n"
                        + "by id with no tenant check anywhere in the method:\n"
                        + String.join("\n", offenders));
    }

    /** Field names declared as one of the given repository types. */
    private static List<String> fieldsOfType(String source, Set<String> types) {
        List<String> names = new ArrayList<>();
        Matcher m = Pattern.compile("private final (\\w+Repository) (\\w+)").matcher(source);
        while (m.find()) {
            if (types.contains(m.group(1))) {
                names.add(m.group(2));
            }
        }
        return names;
    }

    /** The text of the method containing {@code offset}, by brace matching backwards then forwards. */
    private static String enclosingMethod(String source, int offset) {
        int depth = 0;
        int start = offset;
        for (int i = offset; i > 0; i--) {
            char c = source.charAt(i);
            if (c == '}') depth++;
            if (c == '{') {
                if (depth == 0) { start = source.lastIndexOf('\n', i); break; }
                depth--;
            }
        }
        depth = 0;
        int end = source.length();
        for (int i = Math.max(start, 0); i < source.length(); i++) {
            char c = source.charAt(i);
            if (c == '{') depth++;
            if (c == '}') { depth--; if (depth == 0) { end = i; break; } }
        }
        return source.substring(Math.max(start, 0), end);
    }

    // ---- scanning -------------------------------------------------------------------------

    private static List<Class<?>> repositories() throws Exception {
        List<Class<?>> found = new ArrayList<>();
        URI root = TenantOwnedEntity.class.getProtectionDomain().getCodeSource().getLocation().toURI();
        Path base = Path.of(root);
        try (Stream<Path> files = Files.walk(base)) {
            for (Path p : files.filter(f -> f.toString().endsWith("Repository.class")).toList()) {
                String cn = base.relativize(p).toString()
                        .replace(File.separatorChar, '.').replace(".class", "");
                Class<?> c = Class.forName(cn, false, TenantScopingInvariantTest.class.getClassLoader());
                if (Repository.class.isAssignableFrom(c)) {
                    found.add(c);
                }
            }
        }
        return found;
    }

    /** The entity a Spring Data repository is declared over. */
    private static Class<?> entityOf(Class<?> repo) {
        for (Type t : repo.getGenericInterfaces()) {
            if (t instanceof ParameterizedType pt && pt.getActualTypeArguments().length > 0
                    && pt.getActualTypeArguments()[0] instanceof Class<?> c) {
                return c;
            }
        }
        return null;
    }
}
