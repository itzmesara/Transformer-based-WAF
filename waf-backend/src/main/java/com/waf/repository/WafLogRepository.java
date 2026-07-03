package com.waf.repository;

import com.waf.entity.WafLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WafLogRepository extends JpaRepository<WafLog, Long> {
    List<WafLog> findAllByOrderByTimestampDesc();
}
