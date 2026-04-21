const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'museodb'
});

db.connect((err) => {
    if (err) {
        console.error('Error conectando a la DB:', err);
        return;
    }
    console.log('Conexión exitosa a la base de datos MuseoDB.');
});

module.exports = db;