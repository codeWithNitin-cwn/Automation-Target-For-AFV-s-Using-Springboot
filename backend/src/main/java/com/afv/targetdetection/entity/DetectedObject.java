package com.afv.targetdetection.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "detected_objects")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class DetectedObject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private Analysis analysis;

    @Column(name = "class_name", nullable = false, length = 50)
    private String className;

    @Column(nullable = false)
    private Double confidence;

    @Column(name = "box_x_min", nullable = false)
    private Double boxXMin;

    @Column(name = "box_y_min", nullable = false)
    private Double boxYMin;

    @Column(name = "box_x_max", nullable = false)
    private Double boxXMax;

    @Column(name = "box_y_max", nullable = false)
    private Double boxYMax;
}
