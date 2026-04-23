const express = require('express');
const path = require('path');
const session = require('express-session'); 
const app = express();

// --- MIDDLEWARES ---
    app.use(express.json()); 
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(__dirname)); 

// --- CONFIGURACIÓN DE SESIÓN ---
    app.use(session({
        secret: 'clave-secreta-museo-2026',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false } 
    }));

// --- REDIRECCIÓN INICIAL ---
    // Al entrar a http://localhost:3000 te enviará al Inicio directamente
    app.get('/', (req, res) => {
        res.redirect('/views/public/Inicio.html');
    });

// --- IMPORTAR RUTAS ---
    const loginRoutes = require('./Login');
    const catalogoRoutes = require('./Catalogo');
    const adminRoutes = require('./Admin'); 

// --- USAR RUTAS ---
    app.use('/', loginRoutes);
    app.use('/api', catalogoRoutes);
    app.use('/', adminRoutes);  

// --- INICIO DEL SERVIDOR ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});