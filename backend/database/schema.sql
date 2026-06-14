CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id),
    user_id INTEGER REFERENCES users(id),

    UNIQUE(group_id, user_id)
);

CREATE TABLE membership_history (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id),
    user_id INTEGER REFERENCES users(id),
    joined_at DATE NOT NULL,
    left_at DATE
);

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id),
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    paid_by INTEGER REFERENCES users(id),
    expense_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expense_participants (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER REFERENCES expenses(id),
    user_id INTEGER REFERENCES users(id),
    share_amount DECIMAL(10,2),

    UNIQUE(expense_id, user_id)
);

CREATE TABLE settlements (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id),
    payer_id INTEGER REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    settlement_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'PENDING'
);

CREATE TABLE import_anomalies (
    id SERIAL PRIMARY KEY,
    import_job_id INTEGER REFERENCES import_jobs(id),
    row_number INTEGER,
    anomaly_type VARCHAR(100),
    description TEXT,
    action_taken TEXT,
    severity VARCHAR(20)
);