-- Create Model Versions Table to track registered AI models
CREATE TABLE model_versions (
    version VARCHAR(50) PRIMARY KEY,
    description VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Analyses Table (Holds metadata of uploaded scouting media files)
CREATE TABLE analyses (
    id UUID PRIMARY KEY,
    user_id UUID,
    status VARCHAR(20) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    model_version VARCHAR(50),
    processing_time_ms BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_analyses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_analyses_model FOREIGN KEY (model_version) REFERENCES model_versions(version) ON DELETE SET NULL
);

-- Create Detected Objects Table (Relates bounding box records 1:N to Analysis)
CREATE TABLE detected_objects (
    id BIGSERIAL PRIMARY KEY,
    analysis_id UUID NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    box_x_min DOUBLE PRECISION NOT NULL,
    box_y_min DOUBLE PRECISION NOT NULL,
    box_x_max DOUBLE PRECISION NOT NULL,
    box_y_max DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_detected_objects_analysis FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

-- Indexes for performance tuning history page queries
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_created_at ON analyses(created_at);
CREATE INDEX idx_detected_objects_analysis_id ON detected_objects(analysis_id);

-- Insert Default Mock Model Version
INSERT INTO model_versions (version, description, active) 
VALUES ('yolov8n-afv-v1.0', 'Ultralytics YOLOv8 nano model fine-tuned on military AFVs (Tanks, APCs)', true);
