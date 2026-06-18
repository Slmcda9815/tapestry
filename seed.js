const db = require('./db');

console.log('Starting seeding...');

// Check if we have music already
const musicCount = db.prepare('SELECT COUNT(*) as count FROM clips').get();
console.log(`Current clip count: ${musicCount.count}`);

// We could add dummy users or other data here if needed for testing
// For now, it just ensures the DB is initialized by requiring db.js

console.log('Seeding completed.');
