package com.afv.targetdetection.repository;

import com.afv.targetdetection.entity.Analysis;
import com.afv.targetdetection.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface AnalysisRepository extends JpaRepository<Analysis, UUID> {
    List<Analysis> findByUserOrderByCreatedAtDesc(User user);
    List<Analysis> findByStatus(String status);
}
