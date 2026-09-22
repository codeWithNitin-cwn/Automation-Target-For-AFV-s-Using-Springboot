# Project Milestones Reference Guide

This document outlines the detailed plan, structural components, and theoretical interview prep for all implementation milestones of the **AI-Based Automated Target Detection for AFVs** platform.

---

## Table of Contents
- [Phase 1: Java Foundation](#phase-1-java-foundation)
  - [Milestone 2: Project Scaffolding](#milestone-2-spring-boot-project-scaffolding)
  - [Milestone 3: PostgreSQL, JPA, & Flyway Setup](#milestone-3-postgresql-jpa--flyway-migration-setup)
  - [Milestone 4: REST API, DTOs, & Exceptions](#milestone-4-rest-api-dtos--global-exception-handler)
  - [Milestone 5: Security, JWT, & RBAC](#milestone-5-spring-security-jwt--role-based-access-control)
- [Phase 2: Make the Product Work](#phase-2-make-the-product-work)
  - [Milestone 6: AI Inference Service WebClient Client](#milestone-6-ai-inference-service-fastapi-stub--webclient-integration)
  - [Milestone 7: Asynchronous Processing & MinIO Storage](#milestone-7-asynchronous-processing--object-storage-minio)
  - [Milestone 8: React Frontend Shell](#milestone-8-react-frontend-scaffolding--theme)
  - [Milestone 9: React Pages & API Integration](#milestone-9-react-pages--api-clients)
- [Phase 3: Engineering](#phase-3-engineering)
  - [Milestone 10: WebSocket Live Updates](#milestone-10-websocket-live-updates)
  - [Milestone 11: Redis Caching Layer](#milestone-11-redis-caching-layer)
  - [Milestone 12: Event-Driven Audit Logging](#milestone-12-audit-logging-via-events)
  - [Milestone 13: Unit & Integration Testing (Testcontainers)](#milestone-13-testing-suite-unit-integration--testcontainers)
  - [Milestone 14: Docker Compose Orchestration](#milestone-14-dockerization--orchestration)
- [Phase 4: Production Knowledge](#phase-4-production-knowledge)
  - [Milestone 15: Swagger/OpenAPI & Actuator Metrics](#milestone-15-swaggeropenapi--actuator-monitoring)
  - [Milestone 16: CI/CD Pipeline](#milestone-16-cicd-pipeline)
  - [Milestone 17: Security & Quality Audit](#milestone-17-security--code-review)
  - [Milestone 18: Placement Interview Prep](#milestone-18-interview-prep)

---

## Phase 1: Java Foundation

### Milestone 2: Spring Boot Project Scaffolding
*   **Objective:** Set up the project directories and configurations, establish the build settings, and verify the app compiles and launches.
*   **Key Files:**
    *   [`backend/pom.xml`](file:///c:/Users/Nitin/OneDrive/Desktop/JavaSpboot/backend/pom.xml): Imports Web, Security, JPA, WebFlux (WebClient), Flyway, Actuator, PostgreSQL, and Testcontainers.
    *   [`backend/src/main/resources/application.yml`](file:///c:/Users/Nitin/OneDrive/Desktop/JavaSpboot/backend/src/main/resources/application.yml): Holds fallback environment profiles, file upload limits (15MB), database properties, and custom JWT keys.
    *   [`backend/src/main/java/com/afv/targetdetection/TargetDetectionApplication.java`](file:///c:/Users/Nitin/OneDrive/Desktop/JavaSpboot/backend/src/main/java/com/afv/targetdetection/TargetDetectionApplication.java): Entry point annotated with `@SpringBootApplication` and `@EnableAsync`.
*   **Annotations Used:**
    *   `@SpringBootApplication`: Combines component scanning, configuration enabling, and auto-configuration.
    *   `@EnableAsync`: Instructs Spring to execute methods annotated with `@Async` on a separate thread pool.
*   **Interview Prep:**
    *   *What is Auto-Configuration?* Spring Boot looks at dependencies on the classpath (POM) and guesses what you want. If it sees `postgresql`, it auto-creates a Database DataSource.
    *   *Why use YAML over properties?* YAML is hierarchical and cleaner, making it easier to define nested profiles and default fallbacks.

---

### Milestone 3: PostgreSQL, JPA, & Flyway Migration Setup
*   **Objective:** Construct a 3NF database schema, control it via SQL migrations, and bind those tables to Java Object-Relational Mappings (Entities) and Data Access interfaces (Repositories).
*   **Key Files:**
    *   `db/migration/V1__create_users_and_roles.sql` (Creates security identity schemas).
    *   `db/migration/V2__create_analysis_tables.sql` (Creates analysis, model tracking, and detected object tables).
    *   `db/migration/V3__create_audit_logs.sql` (Creates auditing trail schemas).
    *   `entity/*.java`: Java class mappings (`User`, `Role`, `Analysis`, `DetectedObject`, `ModelVersion`, `AuditLog`).
    *   `repository/*.java`: Database interaction interfaces extending `JpaRepository`.
*   **Annotations Used:**
    *   `@Entity`: Marks a class as mapping to a database table.
    *   `@Table(name = "...")`: Binds the entity to a specific database table name.
    *   `@Id`: Declares the Primary Key.
    *   `@GeneratedValue`: Dictates PK generation strategy (e.g. `GenerationType.IDENTITY`).
    *   `@ManyToOne`, `@OneToMany`: Establishes relational mappings.
    *   `@JoinColumn`: Specifies the foreign key column.
*   **Interview Prep:**
    *   *Why use Flyway instead of Hibernate auto-update?* In production, Hibernate's dynamic updates can alter or destroy production tables. Flyway provides auditable, reproducible, incremental SQL scripts that can be reviewed and tested before deployment.
    *   *What is the N+1 select problem?* If an Entity (e.g., `Analysis`) has a lazy-loaded list of children (`DetectedObjects`), calling `analysis.getDetections()` for each analysis triggers separate queries for each record. We fix this using Join Fetches or Entity Graphs.

---

### Milestone 4: REST API, DTOs, & Global Exception Handler
*   **Objective:** Build Web endpoints, validate incoming request objects at the HTTP boundary, and construct a global exception mapper to prevent raw system errors from leaking.
*   **Key Files:**
    *   `dto/*.java`: Data Transfer Objects (Requests & Responses).
    *   `controller/AnalysisController.java`: HTTP routes for submitting uploads and retrieving statuses.
    *   `exception/GlobalExceptionHandler.java`: Translates custom exceptions to standard JSON responses.
*   **Annotations Used:**
    *   `@RestController`: Combines `@Controller` and `@ResponseBody` (auto-serializes responses to JSON).
    *   `@RequestMapping`: Sets base URL routing path.
    *   `@PostMapping`, `@GetMapping`: Maps specific HTTP methods.
    *   `@Valid`: Triggers validation checks on parameters.
    *   `@NotNull`, `@Size`, `@Email`: Validator constraints.
    *   `@RestControllerAdvice`: Defines a centralized class to intercept and handle exceptions.
    *   `@ExceptionHandler`: Specifies which exception class trigger which handler method.
*   **Interview Prep:**
    *   *Why use DTOs?* Prevents exposing internal database schemas, avoids JSON circular references, optimizes network payload, and isolates input validation rules.
    *   *What does @RestControllerAdvice do?* It intercepts exceptions thrown anywhere in our controllers and converts them into structured JSON error payloads, keeping controllers clean of try/catch blocks.

---

### Milestone 5: Spring Security, JWT, & Role-Based Access Control
*   **Objective:** Implement secure identity checks. Users register and log in to receive a signed JWT token, which is validated on subsequent requests.
*   **Key Files:**
    *   `security/JwtTokenProvider.java`: Generates and parses JWTs.
    *   `security/JwtAuthenticationFilter.java`: Intercepts calls, extracts tokens, and populates the Security Context.
    *   `config/SecurityConfig.java`: Configures filter chains, encoder beans, and CORS policies.
    *   `controller/AuthController.java`: Login and registration endpoints.
*   **Annotations Used:**
    *   `@Configuration`: Declares Spring configuration classes.
    *   `@EnableWebSecurity`: Enables web security configurations.
    *   `@PreAuthorize`: Implements Method Security checking role authorization (e.g. `@PreAuthorize("hasRole('OPERATOR')")`).
*   **Interview Prep:**
    *   *How does JWT work?* A JWT is a base64-encoded string containing a header (algorithm), a payload (claims like username/role), and a signature. The backend validates the signature using a private secret key; if invalid, it rejects the request.
    *   *Authentication vs Authorization?* Authentication verifies *who* you are (login credentials). Authorization verifies *what* you are allowed to do (permissions/roles).

---

## Phase 2: Make the Product Work

### Milestone 6: AI Inference Service (FastAPI Stub & WebClient Integration)
*   **Objective:** Establish communication with the AI microservice. Spring Boot uses `WebClient` to upload images to the Python FastAPI server.
*   **Key Files:**
    *   `ai-service/app/main.py`: FastAPI server that mocks YOLO inference outputs.
    *   `client/AiInferenceClient.java`: Spring Boot class that handles outbound POST calls to FastAPI.
*   **Annotations Used:**
    *   `@Component`: Declares a generic Spring bean.
*   **Interview Prep:**
    *   *Why separate the AI model into a different microservice?* Python is optimized for machine learning (PyTorch/YOLO) and can use GPU hardware easily. Separating it keeps the Java backend lightweight, clean, and prevents Python dependencies from cluttering the Java environment.
    *   *Why choose WebClient over RestTemplate?* WebClient is modern, supports reactive/non-blocking calls, and is actively maintained, while RestTemplate is in maintenance mode.

---

### Milestone 7: Asynchronous Processing & Object Storage (MinIO)
*   **Objective:** Offload heavy jobs. When an image is uploaded, it is written to MinIO object storage, a background thread runs the AI query, and the client receives an instant response.
*   **Key Files:**
    *   `config/MinioConfig.java`: Configures S3 client for MinIO connections.
    *   `service/AnalysisService.java` (using `@Async` methods).
*   **Annotations Used:**
    *   `@Async`: Marks a method to be run on a separate background thread pool executor.
    *   `@Transactional`: Wraps methods in database transaction boundaries.
*   **Interview Prep:**
    *   *What does HTTP 202 mean?* 202 Accepted means the request is valid and has been received for processing, but processing has not completed yet. It prevents blocking client browsers.
    *   *What are the limitations of `@Async`?* `@Async` uses an in-memory queue. If the server crashes or restarts, all queued or running jobs are lost. To make this durable, we would use a message broker like RabbitMQ.

---

### Milestone 8: React Frontend Scaffolding & Theme
*   **Objective:** Scaffold a React single-page app (SPA) with TypeScript and Vite. Design a premium, dark-mode visual user interface.
*   **Key Files:**
    *   `frontend/src/index.css`: Defines our CSS variables, typography, and styling.
    *   `frontend/src/App.tsx`: Manages routing shell and navigation layout.
*   **Interview Prep:**
    *   *Why Vite instead of Create React App (CRA)?* Vite is significantly faster because it leverages native ES modules in development and uses Rollup for optimized production builds.
    *   *Why TypeScript?* Static typing catches compile-time errors, improves code readability, and helps auto-complete objects (like DTO interfaces) during development.

---

### Milestone 9: React Pages & API Clients
*   **Objective:** Implement AXIOS API clients to handle token attachments and construct user interfaces for authentication, dashboards, and uploads.
*   **Key Files:**
    *   `frontend/src/services/api.ts`: Central Axios instance injecting JWT authorization headers.
    *   `frontend/src/pages/Dashboard.tsx`, `History.tsx`, `Login.tsx`: Core user screens.

---

## Phase 3: Engineering

### Milestone 10: WebSocket Live Updates
*   **Objective:** Provide real-time UI updates without browser refreshing. Configure STOMP messaging channels.
*   **Key Files:**
    *   `config/WebSocketConfig.java`: Configures Spring WebSocket endpoints and brokers.
    *   `frontend/src/hooks/useWebSocket.ts`: Establishes WebSocket client connections in React.
*   **Interview Prep:**
    *   *How does STOMP work?* Simple Text Oriented Messaging Protocol (STOMP) is a sub-protocol running on top of WebSockets. It structures messages into frames containing commands (SEND, SUBSCRIBE) and headers.

---

### Milestone 11: Redis Caching Layer
*   **Objective:** Cache expensive queries (like dashboard statistics) in Redis to reduce database read pressure.
*   **Key Files:**
    *   `config/RedisConfig.java`: Configures Redis connection caches.
    *   `service/DashboardService.java`: Annotates cache-aside operations.
*   **Annotations Used:**
    *   `@Cacheable`: Checks cache before running database queries.
    *   `@CacheEvict`: Evicts (deletes) cached values when data updates.
*   **Interview Prep:**
    *   *What is the Cache-Aside pattern?* The app looks in the cache. If found (Cache Hit), returns it. If not found (Cache Miss), queries the DB, stores it in the cache, and returns it.

---

### Milestone 12: Audit Logging via Events
*   **Objective:** Track user mutations (logins, file deletions) in an audit log database table without coupling audit code with business services.
*   **Key Files:**
    *   `event/AuditEvent.java`: Holds event data payloads.
    *   `event/AuditEventListener.java`: Consumes events asynchronously and writes to the DB.
*   **Annotations Used:**
    *   `@EventListener`: Registers a method to listen to published ApplicationEvents.
*   **Interview Prep:**
    *   *Why use Event Listeners for Auditing instead of calling the repository directly in the Service?* Loose coupling (Separation of Concerns). The business service does not need to know how auditing works. It simply publishes an event and resumes its main task.

---

### Milestone 13: Testing Suite (Unit, Integration & Testcontainers)
*   **Objective:** Write tests. Unit tests mock dependencies; Integration tests launch a real PostgreSQL instance inside Docker via Testcontainers.
*   **Key Files:**
    *   `test/java/com/afv/targetdetection/service/AnalysisServiceTest.java`: Mockito tests.
    *   `test/java/com/afv/targetdetection/integration/AnalysisIntegrationTest.java`: Integration tests.
*   **Interview Prep:**
    *   *Unit test vs Integration test?* Unit tests verify a single class in isolation (using Mockito to mock dependencies). Integration tests verify that components work together (connecting to a real DB, server, and running web requests).

---

### Milestone 14: Dockerization & Orchestration
*   **Objective:** Containerize all services and link them together in a virtual network using Docker Compose.
*   **Key Files:**
    *   `backend/Dockerfile`, `frontend/Dockerfile`, `ai-service/Dockerfile`: Builds images.
    *   `docker-compose.yml`: Spins up Postgres, Redis, MinIO, AI Service, Backend, and Frontend.

---

## Phase 4: Production Knowledge

### Milestone 15: Swagger/OpenAPI & Actuator Monitoring
*   **Objective:** Add OpenAPI configuration for self-documenting REST APIs, and Actuator for metric scraping.
*   **Key Files:**
    *   `config/OpenApiConfig.java`: Configures swagger metadata.
*   **Interview Prep:**
    *   *What is Spring Boot Actuator?* A library that exposes endpoints (like `/actuator/health`, `/actuator/metrics`) to monitor application status and health.

---

### Milestone 16: CI/CD Pipeline
*   **Objective:** Automate building, testing, and containerizing using GitHub Actions.
*   **Key Files:**
    *   `.github/workflows/ci.yml`: Workflow file checking out code, running Maven, and testing builds.

---

### Milestone 17: Security & Quality Audit
*   **Objective:** Code review focusing on SQL Injection, Cross-Site Scripting (XSS), token security, and dependency updates.

---

### Milestone 18: Placement Interview Prep
*   **Objective:** Practice explaining design architectures, transaction boundaries, performance optimization, and role responsibilities.
