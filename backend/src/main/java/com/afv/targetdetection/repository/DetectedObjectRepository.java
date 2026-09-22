package com.afv.targetdetection.repository;

import com.afv.targetdetection.entity.Analysis;
import com.afv.targetdetection.entity.DetectedObject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DetectedObjectRepository extends JpaRepository<DetectedObject, Long> {
    List<DetectedObject> findByAnalysis(Analysis analysis);
}
