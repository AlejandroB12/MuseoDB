const express = require('express');
const router = express.Router();
const db = require('./database'); // <-- Cambiado a database para ser consistente
const path = require('path');

// --- REGISTRO DE ADMINISTRADORES ---
router.post('/registrar-admin', (req, res) => {
    const { correo, password } = req.body;

    db.beginTransaction((err) => {
        if (err) throw err;

        const sqlUser = "INSERT INTO Usuario (Email, Contraseña, Estatus, Rol) VALUES (?, ?, 1, 'administrador')";
        
        db.query(sqlUser, [correo, password], (err, result) => {
            if (err) return db.rollback(() => res.status(500).send("Error en Usuario: " + err.message));
            
            const idUsuario = result.insertId;
            const sqlAdmin = "INSERT INTO Administrador (id_usuario) VALUES (?)";
            
            db.query(sqlAdmin, [idUsuario], (err) => {
                if (err) return db.rollback(() => res.status(500).send("Error en tabla Administrador"));
                
                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).send("Error al confirmar registro"));
                    // Ajusta esta ruta a tu carpeta real de archivos estáticos
                    res.sendFile(path.join(__dirname, 'inicio_sesion', 'Mensaje-exitoso.html'));
                });
            });
        });
    });
});

// --- LOGIN DE ADMINISTRADORES ---
router.post('/admin-auth', (req, res) => {
    const { "admin-user": username, "admin-password": password } = req.body;
    
    const sql = "SELECT * FROM Usuario WHERE Email = ? AND Contraseña = ? AND Rol = 'administrador'";
    
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).send("Error en el servidor");
        
        if (results.length > 0) {
            // Guardamos la sesión si usas express-session
            if(req.session) req.session.id_usuario = results[0].id_usuario;
            res.redirect('/inicio_sesion/Panel-adminsitrador.html'); 
        } else {
            res.status(401).sendFile(path.join(__dirname, 'Administrador', 'Credenciales-incorrectas-administrador.html'));
        }
    });
});

// --- APROBACIÓN DE PAGOS Y MEMBRESÍAS ---
router.post('/aprobar-pago', (req, res) => {
    const { id_solicitud, id_usuario } = req.body;

    db.beginTransaction((err) => {
        if (err) return res.status(500).send("Error al iniciar transacción");

        const sqlMembresia = "INSERT INTO Membresia (FechaPago, MontoPagado, id_usuario) VALUES (CURDATE(), 10.00, ?)";
        
        db.query(sqlMembresia, [id_usuario], (err) => {
            if (err) return db.rollback(() => res.status(500).send("Error al insertar membresía"));

            const sqlUpdate = "UPDATE SolicitudPago SET Estatus = 'Aprobado' WHERE id_solicitud = ?";
            db.query(sqlUpdate, [id_solicitud], (err) => {
                if (err) return db.rollback(() => res.status(500).send("Error al actualizar solicitud"));
                
                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).send("Error en el commit del pago"));
                    res.send("Pago aprobado y membresía activada.");
                });
            });
        });
    });
});

// Rutas API para el panel de administración
router.get('/api/solicitudes-pago', (req, res) => {
    const sql = "SELECT s.*, u.Email FROM SolicitudPago s JOIN Usuario u ON s.id_usuario = u.id_usuario WHERE s.Estatus = 'Pendiente'";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = router;