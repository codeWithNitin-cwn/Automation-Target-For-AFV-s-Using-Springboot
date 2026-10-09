package com.afv.targetdetection.config;

import com.afv.targetdetection.entity.ModelVersion;
import com.afv.targetdetection.entity.Role;
import com.afv.targetdetection.entity.User;
import com.afv.targetdetection.repository.ModelVersionRepository;
import com.afv.targetdetection.repository.RoleRepository;
import com.afv.targetdetection.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final ModelVersionRepository modelVersionRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(RoleRepository roleRepository,
                           UserRepository userRepository,
                           ModelVersionRepository modelVersionRepository,
                           PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.modelVersionRepository = modelVersionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // 1. Seed Roles
        Role operatorRole = roleRepository.findByName("ROLE_OPERATOR").orElseGet(() ->
                roleRepository.save(Role.builder().name("ROLE_OPERATOR").build()));

        Role adminRole = roleRepository.findByName("ROLE_ADMIN").orElseGet(() ->
                roleRepository.save(Role.builder().name("ROLE_ADMIN").build()));

        roleRepository.findByName("ROLE_VIEWER").orElseGet(() ->
                roleRepository.save(Role.builder().name("ROLE_VIEWER").build()));

        // 2. Seed Default Operators
        if (!userRepository.existsByUsername("operator_nitin")) {
            userRepository.save(User.builder()
                    .username("operator_nitin")
                    .email("operator@afv.defense.net")
                    .passwordHash(passwordEncoder.encode("Operator@123"))
                    .roles(Set.of(operatorRole))
                    .enabled(true)
                    .build());
        }

        if (!userRepository.existsByUsername("commander_nitin")) {
            userRepository.save(User.builder()
                    .username("commander_nitin")
                    .email("commander@afv.defense.net")
                    .passwordHash(passwordEncoder.encode("Operator@123"))
                    .roles(Set.of(operatorRole, adminRole))
                    .enabled(true)
                    .build());
        }

        // 3. Seed Default AI Model Version
        if (!modelVersionRepository.existsById("yolov8n-afv-v1.0")) {
            modelVersionRepository.save(ModelVersion.builder()
                    .version("yolov8n-afv-v1.0")
                    .description("Ultralytics YOLOv8 nano model fine-tuned on military AFVs (Tanks, APCs)")
                    .active(true)
                    .build());
        }

        System.out.println(">>> AFV Target Detection system seeded with default operator credentials: operator_nitin / Operator@123");
    }
}
