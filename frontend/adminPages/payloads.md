# Backend Test Payloads

Use these JSON payloads to test the Coastal Seven Admin Portal backend endpoints.

## 1. User Management

### Create User
**Endpoint:** `POST /api/users`
```json
{
  "name": "Julianne Davenport",
  "email": "j.davenport@coastal7.io",
  "role": "HR",
  "status": "Active",
  "initials": "JD",
  "password": "securePassword123"
}
```

### Update User
**Endpoint:** `PATCH /api/users/:id`
```json
{
  "name": "Julianne Davenport-Smith",
  "status": "Disabled"
}
```

---

## 2. Job Management

### Create Job
**Endpoint:** `POST /api/jobs`
```json
{
  "title": "Senior Cloud Architect",
  "department": "Engineering",
  "salaryRange": "$140k - $180k",
  "status": "Open",
  "description": "Leading the cloud infrastructure design and implementation."
}
```

### Update Job
**Endpoint:** `PATCH /api/jobs/:id`
```json
{
  "status": "Archived"
}
```

---

## 3. Email Automations

### Update Template
**Endpoint:** `POST /api/automations/email`
```json
{
  "type": "Rejection",
  "template": "Dear {{name}}, thank you for your interest in Coastal Seven. Unfortunately, we have decided to move forward with other candidates..."
}
```

---

## 4. Health Check
**Endpoint:** `GET /api/health` (Optional)
```json
{
  "status": "ok",
  "timestamp": "2024-04-07T22:51:33Z"
}
```
