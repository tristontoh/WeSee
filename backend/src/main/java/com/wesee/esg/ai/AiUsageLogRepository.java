package com.wesee.esg.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {

    @Query(value = """
            -- Quoted, because Postgres folds an unquoted identifier to lower case: the columns
            -- came back as "requestcount" and the projection's getRequestCount() looked for
            -- "requestCount", so any company with a single usage row got a 500 rather than a chart.
            SELECT date_trunc('month', created_at) AS "month",
                   count(*) AS "requestCount",
                   sum(CASE WHEN success THEN 1 ELSE 0 END) AS "successCount",
                   coalesce(sum(input_tokens), 0) AS "inputTokens",
                   coalesce(sum(output_tokens), 0) AS "outputTokens"
            FROM ai_usage_log
            WHERE company_id = :companyId AND created_at >= :since
            GROUP BY "month"
            ORDER BY "month"
            """, nativeQuery = true)
    List<MonthlyUsageProjection> monthlyUsage(@Param("companyId") UUID companyId, @Param("since") Instant since);
}
