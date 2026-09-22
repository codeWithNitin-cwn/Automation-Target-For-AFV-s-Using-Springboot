package com.afv.targetdetection.repository;

import com.afv.targetdetection.entity.ModelVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ModelVersionRepository extends JpaRepository<ModelVersion, String> {
    List<ModelVersion> findByActiveTrue();
}
