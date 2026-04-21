const express = require('express');
const path = require('path');
const session = require('express-session'); // Nuevo: Manejo de sesiones
const app = express();

// --- MIDDLEWARES ---
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// --- CONFIGURACIÓN DE SESIÓN ---
app.use(session({
    secret: 'clave-secreta-museo-2026', // Frase para encriptar la sesión
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Cambiar a true si usas HTTPS
}));

// --- REDIRECCIÓN INICIAL ---
app.get('/', (req, res) => {
    res.redirect('/Contenido/Inicio.html');
});

// --- RUTA PARA VERIFICAR SESIÓN (NECESARIA PARA EL NAVBAR) ---
app.get('/api/check-session', (req, res) => {
    if (req.session.loggedIn) {
        res.json({ 
            loggedIn: true, 
            usuario: req.session.usuario 
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// --- RUTA PARA CERRAR SESIÓN ---
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/Contenido/Inicio.html');
    });
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