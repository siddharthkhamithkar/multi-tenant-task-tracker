# Multi-Tenant Task Tracker

A comprehensive task management system built with Next.js (frontend) and Express.js (backend), featuring multi-tenancy, role-based access control, and real-time activity tracking.

## How to Run Locally

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Git

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the backend directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/task_tracker
   JWT_SECRET=your-super-secret-jwt-key-here
   ```

4. **Database Setup:**
   ```bash
   # Create the database
   createdb task_tracker
   
   # Initialize tables
   psql -d task_tracker -f init.sql
   ```

5. **Start the backend server:**
   ```bash
   npm run dev 

   The backend will run on `http://localhost:3000`

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend server:**
   ```bash
   npm run dev

   The frontend will run on `http://localhost:3001`

## 🏢 Multi-Tenancy Architecture

### How Multi-Tenancy Works

The system implements **database-level multi-tenancy** where all tenants share the same database instance but data is logically separated by organization:

#### 1. **Organization-Centric Design**
- Each **Organization** acts as a tenant
- Users can belong to multiple organizations with different roles
- All data (projects, tasks, activity) is scoped to organizations

#### 2. **Data Isolation Strategy**
```sql
-- Every tenant-specific table includes org_id for data separation
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    org_id INT REFERENCES organizations(id) ON DELETE CASCADE,  -- Tenant isolation
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id) ON DELETE CASCADE,  -- Inherits org isolation
    title TEXT NOT NULL,
    status TEXT DEFAULT 'todo',
    assignee INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. **Multi-Tenant User Membership**
```sql
-- Users can belong to multiple organizations with different roles
CREATE TABLE user_organizations (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    org_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',  -- 'admin' or 'member'
    PRIMARY KEY(user_id, org_id)
);
```

#### 4. **Query-Level Isolation**
Every API endpoint enforces tenant boundaries:
```javascript
// Example: Getting projects for a specific organization
app.get('/api/organizations/:orgId/projects', authenticateToken, async (req, res) => {
  const { orgId } = req.params;
  
  // Verify user belongs to this organization
  const membership = await pool.query(
    'SELECT role FROM user_organizations WHERE user_id = $1 AND org_id = $2',
    [req.user.userId, orgId]
  );
  
  if (membership.rows.length === 0) {
    return res.status(403).json({ error: 'Not a member of this organization' });
  }
  
  // Only return projects for THIS organization
  const result = await pool.query(
    'SELECT * FROM projects WHERE org_id = $1',
    [orgId]
  );
  
  res.json(result.rows);
});
```

## Authentication System

### JWT-Based Authentication Flow

#### 1. **Registration & Login**
```javascript
// Registration
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepassword"
}

// Login
POST /api/auth/login
{
  "email": "user@example.com", 
  "password": "securepassword"
}
// Returns: { "token": "eyJhbGciOiJIUzI1NiIs..." }
```

#### 2. **JWT Token Structure**
```javascript
// Token payload contains:
{
  "userId": 123,
  "email": "user@example.com",
  "iat": 1640995200,  // Issued at
  "exp": 1641081600   // Expires at (24h later)
}
```

#### 3. **Token Management (Frontend)**
```javascript
// Local storage management
export const saveToken = (token) => {
  localStorage.setItem("token", token);
}

export const getToken = () => {
  return localStorage.getItem("token");
}

// Automatic token inclusion in API calls
const token = getToken();
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
```

#### 4. **Protected Routes**
```javascript
// Middleware validates JWT on every protected endpoint
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;  // Available in all protected routes
    next();
  });
};
```

## Role-Based Access Control (RBAC)

### Two-Level Role System

#### 1. **Organization Roles**
- **Admin**: Full control within the organization
  - Create/delete projects and tasks
  - Manage organization members
  - View all organization data
- **Member**: Limited permissions
  - View organization projects and tasks
  - Update and delete only assigned tasks
  - Cannot create tasks

#### 2. **RBAC Implementation**
```javascript
// Example: Task update with role checking
app.patch('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.userId;

  // Get task and organization info
  const taskResult = await pool.query(`
    SELECT t.*, p.org_id, uo.role 
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN user_organizations uo ON p.org_id = uo.org_id
    WHERE t.id = $1 AND uo.user_id = $2
  `, [taskId, userId]);

  if (taskResult.rows.length === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = taskResult.rows[0];
  
  // Permission check: Admin or assigned user only
  if (task.role !== 'admin' && task.assignee !== userId) {
    return res.status(403).json({ error: 'Not authorized to update this task' });
  }

  // Update allowed
  await pool.query('UPDATE tasks SET status = $1 WHERE id = $2', 
                   [req.body.status, taskId]);
  res.json({ message: 'Task updated' });
});
```

## Activity Feed System

### Real-Time Activity Tracking

#### 1. **Activity Logging**
The system automatically logs all significant actions:
```javascript
// Centralized activity logger
export const logActivity = async (orgId, userId, message) => {
  try {
    const fullMessage = `User ${userId} ${message}`;
    await pool.query(
      "INSERT INTO activity (org_id, message) VALUES ($1, $2)",
      [orgId, fullMessage]
    );
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};

// Usage in endpoints
await logActivity(orgId, userId, `created task "${taskTitle}"`);
await logActivity(orgId, userId, `updated task status to "${status}"`);
await logActivity(orgId, userId, `joined the organization`);
```

#### 2. **Activity Feed Endpoint**
```javascript
GET /api/activity/:orgId
// Returns recent activities for the organization
{
  "activity": [
    {
      "id": 1,
      "org_id": 1,
      "message": "User 2 created task 'Implement user authentication'",
      "created_at": "2025-09-24T10:30:00Z"
    },
    {
      "id": 2,
      "org_id": 1,
      "message": "User 3 updated task status to 'in-progress'",
      "created_at": "2025-09-24T10:25:00Z"
    }
  ]
}
```

#### 3. **Activity Types Tracked**
- User joins/leaves organization
- Project creation/deletion
- Task creation/updates/deletion
- Task status changes
- Task assignments

## Feature Overview

### 1. **User Management**
- **Registration/Login**: JWT-based authentication
- **Multi-organization membership**: Users can join multiple organizations
- **Role assignment**: Admin or member roles per organization

### 2. **Organization Management**
- **Create organizations**: Users automatically become admins of created orgs
- **Join organizations**: Join by organization ID
- **Member management**: View organization members and their roles

### 3. **Project Management**
- **Organization-scoped projects**: Projects belong to specific organizations
- **Project creation**: Admin-only feature
- **Project viewing**: All organization members can view projects

### 4. **Task Management**
- **Task creation**: Admin-only feature
- **Task assignment**: Assign tasks to organization members
- **Status tracking**: todo → in-progress → completed
- **Task updates**: Admins can update any task, members only their assigned tasks
- **Priority levels**: Low, medium, high priority tasks

### 5. **UI Features**
- **Responsive design**: Works on desktop and mobile
- **Board view**: Kanban-style task boards
- **List view**: Traditional list view for tasks
- **Real-time updates**: UI updates after each action
- **Role-based UI**: Interface adapts based on user permissions

### 6. **Security Features**
- **JWT authentication**: Secure token-based auth
- **RBAC enforcement**: Server-side role checking
- **Data isolation**: Organization-level data separation
- **Input validation**: Sanitized inputs and error handling

### 7. **Developer Experience**
- **API documentation**: Comprehensive OpenAPI specification
- **Testing scripts**: Automated RBAC testing
- **Development tools**: Hot reload, error logging
- **Type safety**: TypeScript frontend with proper typing

## Tech Stack

### Backend
- **Express.js**: REST API server
- **PostgreSQL**: Database with proper relations
- **JWT**: Authentication tokens
- **bcrypt**: Password hashing
- **CORS**: Cross-origin resource sharing

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Axios**: HTTP client for API calls

### Database Schema
```sql
users → user_organizations ← organizations
                ↓
            projects
                ↓
            tasks
                
organizations → activity
```