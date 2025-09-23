-- ------------------------------
-- USERS
-- ------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------
-- ORGANIZATIONS
-- ------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------
-- USER ↔ ORGANIZATIONS (many-to-many)
-- ------------------------------
CREATE TABLE IF NOT EXISTS user_organizations (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    org_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    PRIMARY KEY(user_id, org_id)
);

-- ------------------------------
-- PROJECTS
-- ------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    org_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------
-- TASKS
-- ------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'todo',
    assignee INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------
-- ACTIVITY
-- ------------------------------
CREATE TABLE IF NOT EXISTS activity (
    id SERIAL PRIMARY KEY,
    org_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
