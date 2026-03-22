-- Campus Connect Database Schema

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    roll_number VARCHAR(50),
    department VARCHAR(100),
    phone VARCHAR(20),
    role ENUM('student', 'admin') DEFAULT 'student',
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Notes Table
CREATE TABLE notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    semester VARCHAR(20),
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    file_size INT,
    uploaded_by INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    download_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Lost and Found Items Table
CREATE TABLE lost_found_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('lost', 'found') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(200),
    image_path VARCHAR(255),
    date_occurred DATE NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(150),
    contact_phone VARCHAR(20),
    status ENUM('active', 'resolved') DEFAULT 'active',
    posted_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Complaints Table
CREATE TABLE complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category ENUM('hostel', 'academic', 'infrastructure', 'other') NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'resolved', 'rejected') DEFAULT 'pending',
    submitted_by INT NOT NULL,
    admin_note TEXT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Events Table
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    venue VARCHAR(200),
    category VARCHAR(100),
    max_participants INT DEFAULT 0,
    image_path VARCHAR(255),
    created_by INT NOT NULL,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Event Registrations Table
CREATE TABLE registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    student_id INT NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('registered', 'cancelled') DEFAULT 'registered',
    UNIQUE KEY unique_registration (event_id, student_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default admin user (password: admin123)
INSERT INTO users (full_name, email, password, role, department) VALUES
('Admin User', 'admin@campus.edu', '$2a$10$Wbbn7VxZmAEbj/8XBQomYOb5Zwjp7KZ5plVapv.gS1n7/IWDE4zTu', 'admin', 'Administration');

-- Insert sample student (password: student123)
INSERT INTO users (full_name, email, password, roll_number, department, phone, role) VALUES
('John Doe', 'john@student.edu', '$2a$10$Wbbn7VxZmAEbj/8XBQomYOb5Zwjp7KZ5plVapv.gS1n7/IWDE4zTu', 'CS2024001', 'Computer Science', '9876543210', 'student');
