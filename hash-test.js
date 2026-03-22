const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log(`Hash for "${password}": ${hash}`);
    
    // Test the existing hash from schema.sql
    const existingHash = '$2b$10$rJ8K9mN2pL4qX6wY0vZ5uOeT3kH7jI1nM8sA9bC2dE4fG6hJ0lN';
    const isMatch = await bcrypt.compare(password, existingHash);
    console.log(`Does existing hash match "admin123"? ${isMatch}`);
}

generateHash();
