# 🎓 Campus Connect — Student Service Platform

A full-stack web application for college campus services including notes sharing, lost & found, complaint management, and event registration.

---

## 🚀 Quick Setup

### Prerequisites
- **Node.js** v16+ 
- **MySQL** 8.0+

### 1. Clone and Install
```bash
cd campus-connect
npm install
```

### 2. Set Up Database
```bash
# Automate setup (create DB + import tables)
npm run db-setup
```
Alternatively, manual setup:
```bash
mysql -u root -p < schema.sql
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=campus_connect
JWT_SECRET=campus_connect_super_secret_key_2024
PORT=3000
```

### 4. Start the Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 👤 Default Credentials

| Role    | Email                | Password  |
|---------|----------------------|-----------|
| Admin   | admin@campus.edu     | admin123  |
| Student | john@student.edu     | student123|

> ⚠️ Change passwords after first login in production!

---

## 📁 Project Structure
```
campus-connect/
├── server.js              # Express app entry point
├── db.js                  # MySQL connection pool
├── schema.sql             # Database schema + seed data
├── .env.example           # Environment config template
├── middleware/
│   └── auth.js            # JWT auth middleware
├── routes/
│   ├── auth.js            # Register, login, profile
│   ├── notes.js           # Notes CRUD + file upload
│   ├── lostFound.js       # Lost & found CRUD
│   ├── complaints.js      # Complaints management
│   ├── events.js          # Events + registrations
│   └── admin.js           # Admin stats + user mgmt
└── public/
    ├── index.html         # Single-page frontend
    ├── css/style.css      # Design system
    ├── js/app.js          # Frontend logic
    └── uploads/           # Uploaded files
        ├── notes/         # PDF files
        └── images/        # Image files
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint              | Description        |
|--------|-----------------------|--------------------|
| POST   | /api/auth/register    | Register student   |
| POST   | /api/auth/login       | Login              |
| POST   | /api/auth/logout      | Logout             |
| GET    | /api/auth/profile     | Get profile        |
| PUT    | /api/auth/profile     | Update profile     |

### Notes
| Method | Endpoint                     | Auth    | Description |
|--------|------------------------------|---------|-------------|
| GET    | /api/notes                   | Student | Get approved notes |
| POST   | /api/notes                   | Student | Upload note |
| GET    | /api/notes/download/:id      | Student | Download PDF |
| GET    | /api/notes/my-notes          | Student | Get my uploads |

### Lost & Found
| Method | Endpoint                       | Auth    | Description |
|--------|--------------------------------|---------|-------------|
| GET    | /api/lost-found                | Student | Get items |
| POST   | /api/lost-found                | Student | Post item |
| PUT    | /api/lost-found/:id/status     | Owner   | Mark resolved |
| DELETE | /api/lost-found/:id            | Owner   | Delete item |

### Complaints
| Method | Endpoint                      | Auth    | Description |
|--------|-------------------------------|---------|-------------|
| GET    | /api/complaints/my            | Student | Get my list |
| POST   | /api/complaints               | Student | Submit issue |

### Events
| Method | Endpoint                      | Auth    | Description |
|--------|-------------------------------|---------|-------------|
| GET    | /api/events                   | Student | Browse events |
| POST   | /api/events/:id/register      | Student | Join event |
| GET    | /api/events/my-registrations  | Student | My schedule |

### Admin (Management)
| Method | Endpoint                        | Description             |
|--------|---------------------------------|-------------------------|
| GET    | /api/admin/stats                | Dashboard stats         |
| GET    | /api/admin/users                | Manage all users        |
| DELETE | /api/admin/users/:id            | Delete a user           |
| GET    | /api/admin/notes                | Approve pending notes   |
| PUT    | /api/admin/notes/:id/status     | Update note approval    |
| DELETE | /api/admin/notes/:id            | Remove a note           |
| GET    | /api/admin/complaints           | Review all complaints   |
| PUT    | /api/admin/complaints/:id       | Update complaint status |
| POST   | /api/admin/events               | Create new event        |
| GET    | /api/admin/events/:id/participants | View event registrants|
| PUT    | /api/admin/events/:id           | Edit event details      |
| DELETE | /api/admin/events/:id           | Cancel/delete event     |

---

## ✨ Features

### Students Can:
- 📚 Browse & download approved study notes by subject
- 📤 Upload PDF notes (pending admin approval)
- 🔍 Post & browse lost/found items with images
- 📩 Submit complaints (hostel/academic/infrastructure)
- 🎉 Register for campus events
- 👤 Manage their profile

### Admins Can:
- 📊 View dashboard statistics
- 👥 Manage all student accounts
- ✅ Approve/reject uploaded notes
- 💬 Update complaint status with notes
- 🎪 Create & manage events, view participant lists

---

## 🛠️ Tech Stack
- **Frontend**: Vanilla HTML/CSS/JS (Dark theme, responsive)
- **Backend**: Node.js + Express
- **Database**: MySQL with connection pooling
- **Auth**: JWT (JSON Web Tokens) + bcrypt password hashing
- **Files**: Multer for PDF/image uploads
