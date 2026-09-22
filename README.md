# 🛡️ AI-Based Automated Target Detection & Threat Recognition for AFVs

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.2-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![MinIO](https://img.shields.io/badge/MinIO-S3_Storage-C72C48?style=for-the-badge&logo=minio&logoColor=white)](https://min.io/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

An enterprise-grade, distributed microservice platform engineered for real-time automated target detection, threat recognition, and tactical image intelligence for Armored Fighting Vehicles (AFVs).

The platform integrates deep-learning computer vision models (YOLOv8) with a high-throughput **Spring Boot 3.3 / Java 21** reactive orchestration backend, **PostgreSQL** relational persistence, **MinIO** S3-compatible object storage, **Redis** caching, and a modern **React 18** tactical command dashboard.

---

## 📌 Table of Contents

- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Repository Structure](#-repository-structure)
- [Database Schema & Migrations](#-database-schema--migrations)
- [REST API Reference](#-rest-api-reference)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [1. Infrastructure Services (Docker)](#1-infrastructure-services-docker)
  - [2. AI Inference Engine (FastAPI)](#2-ai-inference-engine-fastapi)
  - [3. Backend Application (Spring Boot)](#3-backend-application-spring-boot)
  - [4. Frontend Dashboard (React)](#4-frontend-dashboard-react)
- [Environment Variables Configuration](#-environment-variables-configuration)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security & Compliance](#-security--compliance)
- [Roadmap & Future Improvements](#-roadmap--future-improvements)

---

## 🏗 System Architecture

```
                                  +-----------------------------+
                                  |     React 18 Dashboard      |
                                  |  (Vite + TypeScript + STOMP)|
                                  +--------------+--------------+
                                                 |
                                     HTTP/REST   |   WebSocket
                                      (JWT Auth) |  (Live Push)
                                                 v
                     +-------------------------------------------------------+
                     |             Spring Boot 3.3 Core Backend              |
                     |  - Spring Security 6 (Stateless JWT + RBAC)           |
                     |  - Reactive WebClient (AI Orchestration)              |
                     |  - Asynchronous Executor ThreadPool (@Async)          |
                     |  - ApplicationEvent Multicaster (Audit Logging)       |
                     +-------+---------------+---------------+---------------+
                             |               |               |
              Flyway / JPA   |   S3 API      |   Cache-Aside |   Non-Blocking HTTP
                    v        |        v      |        v      |         v
             +---------------+--+   +--------+-----+   +-----+-----+   +---------------+
             |   PostgreSQL 16  |   |    MinIO     |   |  Redis 7  |   |    FastAPI    |
             |  (3NF Relational |   | (Raw & Masked|   | (Metrics  |   |  AI Inference |
             |      Storage)    |   | Image Store) |   |  Cache)   |   | (YOLOv8 Model)|
             +------------------+   +--------------+   +-----------+   +---------------+
```

### End-to-End Processing Workflow
1. **Target Upload**: Operator submits tactical imagery via React Command Console with JWT bearer authentication.
2. **Ingestion & Validation**: Spring Boot validates file type/size (up to 15MB) and immediately generates an `Analysis` record in `PENDING` status.
3. **Blob Storage**: The original image is securely streamed into a MinIO S3 bucket under an isolated UUID namespace.
4. **Asynchronous Hand-off**: Controller responds immediately with `HTTP 202 Accepted` and offloads the processing task to a dedicated `@Async` thread pool.
5. **AI Inference Dispatch**: The backend utilizes non-blocking `WebClient` to transmit multipart image data to the FastAPI Python microservice.
6. **Detection & Localization**: YOLOv8 extracts bounding boxes (`x_min`, `y_min`, `x_max`, `y_max`), confidence scores, and target classes (*Tank, APC, Infantry, Military Truck, Artillery*).
7. **Atomic Persistence**: Spring Data JPA persists the detected bounding boxes, computes latency telemetry, and transitions the state to `COMPLETED`.
8. **Event Auditing & Live Notification**: An `AuditEvent` is published asynchronously to record the action, while WebSocket STOMP pushes real-time results to active client dashboards.

---

## 🚀 Key Features

- **🎯 Military Target Detection & Localization**: Identifies and classifies armored targets (Tanks, APCs, Artillery, Infantry, Trucks) with sub-second inference latency.
- **⚡ Asynchronous Non-Blocking Processing**: Decoupled ingestion pipeline returning `202 Accepted` headers and handling long-running AI inference without blocking the HTTP servlet thread.
- **🛡️ Enterprise Security & RBAC**: Spring Security 6 with stateless HMAC-SHA256 JWT authentication and granular role-based authorization (`ROLE_ADMIN`, `ROLE_OPERATOR`, `ROLE_ANALYST`).
- **🗄️ Resilient Cloud-Native Object Storage**: MinIO integration for scalable, S3-compliant distributed binary image storage.
- **📡 Real-Time Telemetry & STOMP WebSockets**: Instant bidirectional push notifications broadcasting processing state changes and bounding box overlays to operators.
- **🚀 High-Speed Cache-Aside Layer**: Redis caching for frequently accessed dashboard aggregates, threat level statistics, and analysis history.
- **📜 Event-Driven Asynchronous Auditing**: Spring `ApplicationEventPublisher` decoupled audit system tracking every mission-critical mutation without slowing down business flows.
- **📊 Database Version Control**: Automated zero-downtime database migrations managed via Flyway adhering to strict 3NF normalized schema design.
- **📈 Production Observability**: Actuator health checks, liveness/readiness probes, and OpenAPI/Swagger interactive documentation.

---

## 🛠 Technology Stack

| Layer | Technologies |
|---|---|
| **Backend Core** | Java 21, Spring Boot 3.3.2, Spring MVC, Spring Data JPA (Hibernate) |
| **Security** | Spring Security 6, JJWT (io.jsonwebtoken 0.12.5), BCrypt Password Hashing |
| **Reactive Client & Async** | Spring WebFlux (`WebClient`), `@Async` ThreadPoolTaskExecutor |
| **Messaging & Real-Time** | Spring WebSocket, STOMP Sub-protocol, SockJS |
| **AI Inference Service** | Python 3.11+, FastAPI, Uvicorn, YOLOv8 (Ultralytics), Pillow, NumPy |
| **Storage & Caching** | PostgreSQL 16, Redis 7 (Lettuce Client), MinIO S3 SDK |
| **Database Migrations** | Flyway Migration Engine (PostgreSQL Core Extension) |
| **Frontend** | React 18, TypeScript, Vite, Axios, Modern Tactical UI Theme |
| **Containerization** | Docker, Docker Compose, Multi-stage Dockerfiles |
| **Testing** | JUnit 5, Mockito, Spring Security Test, Testcontainers (PostgreSQL) |

---

## 📂 Repository Structure

```
Automation-Target-For-AFV-s-Using-Springboot/
├── backend/                              # Spring Boot 3.3 Java Microservice
│   ├── src/main/java/com/afv/targetdetection/
│   │   ├── client/                      # WebClient outbound connectors (AI Service)
│   │   ├── config/                      # Security, Redis, MinIO, WebSocket, Async configs
│   │   ├── controller/                  # REST Controllers (Auth, Analysis, Dashboard)
│   │   ├── dto/                         # Request, Response, and Projection DTOs
│   │   ├── entity/                      # JPA Entities (User, Analysis, DetectedObject, etc.)
│   │   ├── event/                       # Application events & asynchronous listeners
│   │   ├── exception/                   # Global RestControllerAdvice exception handlers
│   │   ├── mapper/                      # Entity <-> DTO transformation mappers
│   │   ├── repository/                  # Spring Data JPA interfaces
│   │   ├── security/                    # JWT authentication filter & token providers
│   │   ├── service/                     # Core business logic & transaction boundaries
│   │   └── TargetDetectionApplication.java
│   ├── src/main/resources/
│   │   ├── db/migration/                # Flyway SQL migration scripts (V1, V2, V3)
│   │   └── application.yml              # Central application configuration profiles
│   └── pom.xml                          # Maven build definition & dependencies
│
├── ai-service/                           # Python AI Target Detection Microservice
│   ├── app/
│   │   └── main.py                      # FastAPI inference server & YOLO model wrapper
│   └── requirements.txt                 # Python runtime dependencies
│
├── frontend/                             # React 18 / TypeScript Tactical UI
│   ├── src/
│   │   ├── components/                  # UI Components (BoundingBoxCanvas, Stats, Navbar)
│   │   ├── pages/                       # Login, Dashboard, UploadTarget, AnalysisHistory
│   │   ├── services/                    # Axios API client & WebSocket hooks
│   │   └── index.css                    # Tactical dark-mode theme & tokens
│   └── package.json
│
├── docker-compose.yml                    # Multi-container orchestration specification
└── milestones.md                         # Detailed project roadmap & technical guide
```

---

## 🗄 Database Schema & Migrations

Database schema versioning is managed via **Flyway**. All tables strictly follow 3NF normalization:

```
+--------------------+        +---------------------+        +--------------------+
|       users        |        |     user_roles      |        |       roles        |
+--------------------+        +---------------------+        +--------------------+
| id (PK)            |<------>| user_id (FK)        |<------>| id (PK)            |
| username (UQ)      |        | role_id (FK)        |        | name (UQ)          |
| email (UQ)         |        +---------------------+        +--------------------+
| password_hash      |
| full_name          |
+---------+----------+
          |
          | 1:N
          v
+--------------------+        +---------------------+        +--------------------+
|      analyses      |        |  detected_objects   |        |   model_versions   |
+--------------------+        +---------------------+        +--------------------+
| id (PK)            |<------>| id (PK)             |        | id (PK)            |
| user_id (FK)       |  1:N   | analysis_id (FK)    |        | model_name         |
| original_image_url |        | class_name          |        | version_tag (UQ)   |
| masked_image_url   |        | confidence          |        | weights_path       |
| status             |        | x_min, y_min        |        | is_active          |
| processing_time_ms |        | x_max, y_max        |        +--------------------+
| created_at         |        +---------------------+
+--------------------+
          |
          | 1:N
          v
+--------------------+
|     audit_logs     |
+--------------------+
| id (PK)            |
| user_id (FK)       |
| action             |
| resource_type      |
| details_json       |
| timestamp          |
+--------------------+
```

- **`V1__create_users_and_roles.sql`**: Security RBAC foundation and role assignments.
- **`V2__create_analysis_tables.sql`**: Analysis records, detected bounding coordinates, and model tracking.
- **`V3__create_audit_logs.sql`**: Immutable operational auditing log for security tracing.

---

## 📡 REST API Reference

### 🔐 Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register new operator/analyst profile |
| `POST` | `/api/v1/auth/login` | Public | Authenticate credentials & retrieve JWT token |

### 🎯 Target Detection & Analysis (`/api/v1/analysis`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/analysis/upload` | `OPERATOR`, `ADMIN` | Upload tactical image for AI analysis (Async 202) |
| `GET` | `/api/v1/analysis/{id}` | Authenticated | Retrieve detection results, bounding boxes & status |
| `GET` | `/api/v1/analysis/history` | Authenticated | Paginated query of past target detection analyses |
| `DELETE`| `/api/v1/analysis/{id}` | `ADMIN` | Delete analysis record and associated S3 assets |

### 🤖 AI Inference Service (`:8000`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | AI Engine health check & active model metadata |
| `POST` | `/inference` | Multipart image inference returning bounding boxes and classes |

### 📊 Actuator & Observability (`:8080`)

| Endpoint | Description |
|---|---|
| `GET /actuator/health` | Comprehensive application and subsystem health indicators |
| `GET /actuator/metrics` | JVM, HTTP connection pool, and thread metrics |

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Java Development Kit (JDK)**: Version 21+
- **Python**: Version 3.11+
- **Node.js**: Version 18+ & npm
- **Docker & Docker Compose**: Installed and running
- **Apache Maven**: Version 3.9+ (or use `./mvnw`)

---

### 1. Infrastructure Services (Docker)

Spin up PostgreSQL, Redis, and MinIO storage using Docker:

```bash
# Launch background infrastructure
docker run -d --name afv-postgres -p 5432:5432 -e POSTGRES_DB=target_detection -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:16-alpine
docker run -d --name afv-redis -p 6379:6379 redis:7-alpine
docker run -d --name afv-minio -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin minio/minio server /data --console-address ":9001"
```

---

### 2. AI Inference Engine (FastAPI)

```bash
cd ai-service

# Create and activate python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the AI Inference Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*AI service will be active on `http://localhost:8000`.*

---

### 3. Backend Application (Spring Boot)

```bash
cd backend

# Build and run with Maven (Flyway will automatically execute database migrations)
./mvnw spring-boot:run
```
*Backend API will be active on `http://localhost:8080`.*

---

### 4. Frontend Dashboard (React)

```bash
cd frontend

# Install UI dependencies
npm install

# Start Vite development server
npm run dev
```
*Tactical Console will be available at `http://localhost:5173`.*

---

## ⚙️ Environment Variables Configuration

The backend supports zero-config defaults for local development, which can be overridden via environment variables or `.env` file:

| Property | Default Value | Description |
|---|---|---|
| `DATABASE_HOST` | `localhost` | PostgreSQL Host Address |
| `DATABASE_PORT` | `5432` | PostgreSQL Port |
| `DATABASE_NAME` | `target_detection` | Target Database Name |
| `DATABASE_USERNAME` | `postgres` | Database Username |
| `DATABASE_PASSWORD` | `postgres` | Database Password |
| `REDIS_HOST` | `localhost` | Redis Server Host |
| `REDIS_PORT` | `6379` | Redis Port |
| `JWT_SECRET` | `(32-byte Base64 secret key)` | HMAC-SHA signing secret key |
| `AI_SERVICE_URL` | `http://localhost:8000` | FastAPI AI microservice endpoint |
| `MINIO_ENDPOINT` | `http://localhost:9000` | MinIO S3 API connection URL |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO root access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO root secret key |

---

## 🧪 Testing & Quality Assurance

The platform includes comprehensive test suites across unit, mock, and integration layers:

```bash
cd backend

# Execute Unit Tests (JUnit 5 + Mockito)
./mvnw test

# Execute Full Integration Tests (Testcontainers spins up isolated PostgreSQL)
./mvnw verify
```

---

## 🔒 Security & Compliance

- **Stateless Authentication**: JWT tokens are signed using high-entropy HMAC-SHA256 secrets with configurable expiry.
- **Password Security**: Passwords are encrypted using salted BCrypt hashing with configurable cost factor.
- **SQL Injection Immune**: All database access is governed by Spring Data JPA parameterized queries and strictly versioned Flyway migrations.
- **Payload Validation**: Strict bean validation constraints (`@Valid`, `@NotNull`, `@Size`) sanitize inputs at the REST boundary.
- **Immutable Audit Trail**: Security mutations and deletions publish non-blocking asynchronous audit events.

---

## 🗺 Roadmap & Future Improvements

- [ ] **Edge Deployment**: On-premise deployment optimized for NVIDIA Jetson AGX Orin embedded tactical units.
- [ ] **Thermal / FLIR Integration**: Dedicated vision model fine-tuning for forward-looking infrared and thermal imagery.
- [ ] **RTSP Live Stream Ingestion**: Real-time video stream chunking and GPU hardware-accelerated target tracking.
- [ ] **Kafka Distributed Event Mesh**: Scaling message ingestion for multi-vehicle fleet coordination.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👤 Author

**Nitin**  
*Full-Stack Engineer & AI Systems Developer*  
- GitHub: [@codeWithNitin-cwn](https://github.com/codeWithNitin-cwn)
