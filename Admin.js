const express = require('express');
const router = express.Router();
const db = require('./database');
const path = require('path');

// ==========================================
// 1. AUTENTICACIÓN Y REGISTRO DE ADMIN
// ==========================================
router.post('/registrar-admin', (req, res) => {
    const { correo, password, nombre, apellido } = req.body;

    db.beginTransaction((err) => {
        if (err) throw err;

        // 1. Insertamos en la tabla Padre (Usuario) que ahora tiene los nombres
        const sqlUser = "INSERT INTO Usuario (Email, Contraseña, Nombre, Apellido, Estatus, Rol) VALUES (?, ?, ?, ?, 1, 'administrador')";
        
        db.query(sqlUser, [correo, password, nombre, apellido], (err, result) => {
            if (err) return db.rollback(() => res.status(500).send("Error en Usuario: " + err.message));
            
            const idUsuario = result.insertId;
            
            // 2. Insertamos en la tabla Subtipo (Administrador)
            // Ya NO incluimos nombre ni apellido aquí porque no existen en esta tabla
            const sqlAdmin = "INSERT INTO Administrador (id_usuario) VALUES (?)";
            
            db.query(sqlAdmin, [idUsuario], (err) => {
                if (err) return db.rollback(() => res.status(500).send("Error en tabla Administrador: " + err.message));
                
                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).send("Error al confirmar registro"));
                    res.redirect('/admin/Mensaje-exitoso.html');
                    //res.sendFile(path.join(__dirname, 'admin', 'Mensaje-exitoso.html'));
                });
            });
        });
    });
});
router.post('/admin-auth', (req, res) => {
    const { "admin-user": username, "admin-password": password } = req.body;
    const sql = "SELECT * FROM Usuario WHERE Email = ? AND Contraseña = ? AND Rol = 'administrador'";
    
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).send("Error en el servidor");
        if (results.length > 0) {
            res.redirect('/admin/Panel-adminsitrador.html');
        } else {
            res.redirect('/admin/Credenciales-incorrectas-administrador.html');
           //res.status(401).sendFile(path.join(__dirname, 'admin', 'Credenciales-incorrectas-administrador.html'));
        }
    });
});

// ==========================================
// 2. GESTIÓN DE USUARIOS (CRUD Y APROBACIÓN)
// ==========================================

router.get('/api/todos-los-usuarios', (req, res) => {
    db.query("SELECT id_usuario, Email, Rol, Estatus FROM Usuario", (err, results) => {
        if (err) return res.status(500).json([]);
        res.json(results);
    });
});

router.get('/api/usuarios-pendientes', (req, res) => {
    const sql = `
        SELECT u.id_usuario, u.Email, u.Rol, u.Estatus, c.CodigoVerificacion
        FROM Usuario u
        LEFT JOIN Comprador c ON u.id_usuario = c.id_usuario
        WHERE u.Estatus = 0 AND u.Rol != 'administrador'
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json([]);
        res.json(results);
    });
});

router.patch('/aprobar-usuario/:id', (req, res) => {
    const { id } = req.params;
    const sqlAprobar = "UPDATE Usuario SET Estatus = 1 WHERE id_usuario = ?";
    db.query(sqlAprobar, [id], (err, result) => {
        if (err) return res.status(500).send("Error al aprobar usuario: " + err.message);
        if (result.affectedRows === 0) return res.status(404).send("Usuario no encontrado.");
        res.send("<h2>Usuario aprobado y activo.</h2>");
    });
});

router.put('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { Estatus } = req.body;
    
    if (Estatus === undefined || (Estatus != 0 && Estatus != 1)) {
        return res.status(400).json({ 
            success: false, 
            message: "Estatus inválido. Debe ser 0 (inactivo) o 1 (activo)" 
        });
    }
    
    const sql = "UPDATE Usuario SET Estatus = ? WHERE id_usuario = ?";
    
    db.query(sql, [Estatus, id], (err, result) => {
        if (err) {
            console.error('Error actualizando usuario:', err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al actualizar usuario: " + err.message 
            });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Usuario no encontrado" 
            });
        }
        
        res.json({ 
            success: true, 
            message: `Usuario ${Estatus == 1 ? 'activado' : 'desactivado'} correctamente` 
        });
    });
});

router.delete('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM Usuario WHERE id_usuario = ?", [id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.send("Usuario eliminado");
    });
});

// ==========================================
// 3. GESTIÓN DE OBRAS (CRUD)
// ==========================================

router.get('/api/obras', (req, res) => {
    db.query("SELECT * FROM Obra", (err, results) => {
        if (err) return res.status(500).json([]);
        res.json(results);
    });
});

router.put('/api/obras/:id', (req, res) => {
    const { id } = req.params;
    const { Nombre, Precio, Estado_obra } = req.body;
    const sql = "UPDATE Obra SET Nombre = ?, Precio = ?, Estado_obra = ? WHERE id_Obra = ?";
    db.query(sql, [Nombre, Precio, Estado_obra, id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.send("Obra actualizada");
    });
});

router.delete('/api/obras/:id', (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM Obra WHERE id_Obra = ?", [id], (err) => {
        if (err) return res.status(500).send(err.message);
        res.send("Obra eliminada");
    });
});

// ==========================================
// 4. RUTAS SIMPLIFICADAS PARA FACTURACIÓN
// ==========================================

router.get('/api/obras-reservadas', (req, res) => {
    const sql = "SELECT id_Obra, Nombre, Precio FROM Obra WHERE Estado_obra = 'Reservada'";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo obras reservadas:', err);
            return res.status(500).json([]);
        }
        res.json(results);
    });
});

router.post('/generar-factura', (req, res) => {
    const { id_obra, id_admin, precio_neto, porcentaje_comision } = req.body;
    
    if (!id_obra || !id_admin || !precio_neto || !porcentaje_comision) {
        return res.status(400).json({ 
            success: false, 
            message: "Faltan datos requeridos" 
        });
    }
    
    db.beginTransaction((err) => {
        if (err) {
            console.error('Error al iniciar transacción:', err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al iniciar transacción" 
            });
        }
        
        const sqlVerificarObra = "SELECT Estado_obra FROM Obra WHERE id_Obra = ?";
        db.query(sqlVerificarObra, [id_obra], (err, obraResults) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ 
                    success: false, 
                    message: "Error verificando obra" 
                }));
            }
            
            if (obraResults.length === 0) {
                return db.rollback(() => res.status(404).json({ 
                    success: false, 
                    message: "La obra no existe" 
                }));
            }
            
            if (obraResults[0].Estado_obra !== 'Reservada') {
                return db.rollback(() => res.status(400).json({ 
                    success: false, 
                    message: "La obra no está en estado Reservada" 
                }));
            }
            
            const sqlDatosObra = "SELECT Nombre FROM Obra WHERE id_Obra = ?";
            db.query(sqlDatosObra, [id_obra], (err, obraDatos) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ 
                        success: false, 
                        message: "Error obteniendo datos de la obra" 
                    }));
                }
                
                const sqlComprador = "SELECT id_usuario FROM Reserva WHERE id_obra = ?";
                db.query(sqlComprador, [id_obra], (err, compradorResults) => {
                    if (err) {
                        console.error('Error obteniendo comprador:', err);
                        return db.rollback(() => res.status(500).json({ 
                            success: false, 
                            message: "Error obteniendo datos del comprador" 
                        }));
                    }
                    
                    let id_comprador;
                    
                    const procesarComprador = (id_comp) => {
                        const sqlDatosComprador = `
                            SELECT u.Email, c.Nombre, c.Apellido, c.Cedula
                            FROM Usuario u
                            LEFT JOIN Comprador c ON u.id_usuario = c.id_usuario
                            WHERE u.id_usuario = ?
                        `;
                        
                        db.query(sqlDatosComprador, [id_comp], (err, compradorDatos) => {
                            if (err) {
                                console.error('Error obteniendo datos del comprador:', err);
                                return db.rollback(() => res.status(500).json({ 
                                    success: false, 
                                    message: "Error obteniendo datos del comprador" 
                                }));
                            }
                            
                            const comprador = compradorDatos[0] || {};
                            const nombreComprador = comprador.Nombre && comprador.Apellido ? 
                                `${comprador.Nombre} ${comprador.Apellido}` : 'No disponible';
                            
                            const iva = parseFloat(precio_neto) * 0.12;
                            const gananciaMuseo = parseFloat(precio_neto) * (parseFloat(porcentaje_comision) / 100);
                            const total = parseFloat(precio_neto) + iva;
                            
                            const sqlFactura = `
                                INSERT INTO Factura 
                                (Monto_Neto, IVA, Total_Pagado, Ganancia_Museo_USD, Porcentaje_Comision, id_obra, id_comprador, id_admin) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            `;
                            
                            db.query(sqlFactura, [
                                precio_neto, 
                                iva, 
                                total, 
                                gananciaMuseo, 
                                porcentaje_comision, 
                                id_obra, 
                                id_comp, 
                                id_admin
                            ], (err, result) => {
                                if (err) {
                                    console.error('Error al generar factura:', err);
                                    return db.rollback(() => res.status(500).json({ 
                                        success: false, 
                                        message: "Error al generar factura: " + err.message 
                                    }));
                                }
                                
                                const idFactura = result.insertId;
                                
                                db.query("UPDATE Obra SET Estado_obra = 'Vendida' WHERE id_Obra = ?", [id_obra], (err) => {
                                    if (err) {
                                        console.error('Error al actualizar obra:', err);
                                        return db.rollback(() => res.status(500).json({ 
                                            success: false, 
                                            message: "Error al actualizar obra: " + err.message 
                                        }));
                                    }
                                    
                                    db.query("DELETE FROM Reserva WHERE id_obra = ?", [id_obra], (err) => {
                                        if (err) {
                                            console.error('Error al eliminar reserva:', err);
                                            console.warn('La reserva no pudo ser eliminada automáticamente');
                                        }
                                        
                                        db.commit((err) => {
                                            if (err) {
                                                console.error('Error al confirmar transacción:', err);
                                                return db.rollback(() => res.status(500).json({ 
                                                    success: false, 
                                                    message: "Error al confirmar" 
                                                }));
                                            }
                                            
                                            res.json({ 
                                                success: true, 
                                                message: "Factura generada correctamente",
                                                id_factura: idFactura,
                                                mostrarEnvio: true,
                                                datos: {
                                                    id_factura: idFactura,
                                                    id_obra: id_obra,
                                                    nombreObra: obraDatos[0]?.Nombre || 'No disponible',
                                                    id_comprador: id_comp,
                                                    nombreComprador: nombreComprador,
                                                    emailComprador: comprador.Email || 'No disponible',
                                                    cedulaComprador: comprador.Cedula || 'No disponible',
                                                    precio_neto: parseFloat(precio_neto),
                                                    iva: iva,
                                                    ganancia_museo: gananciaMuseo,
                                                    porcentaje_comision: parseFloat(porcentaje_comision),
                                                    total: total,
                                                    fecha: new Date().toLocaleDateString(),
                                                    hora: new Date().toLocaleTimeString()
                                                }
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    };
                    
                    if (compradorResults.length === 0) {
                        console.log('No hay reserva para la obra, buscando comprador por defecto...');
                        
                        const sqlBuscarComprador = "SELECT id_usuario FROM Usuario WHERE Rol = 'comprador' AND Estatus = 1 LIMIT 1";
                        
                        db.query(sqlBuscarComprador, (err, compradorDefault) => {
                            if (err || compradorDefault.length === 0) {
                                return db.rollback(() => res.status(400).json({ 
                                    success: false, 
                                    message: "No hay compradores disponibles en el sistema" 
                                }));
                            }
                            
                            id_comprador = compradorDefault[0].id_usuario;
                            
                            const sqlCrearReserva = "INSERT INTO Reserva (id_obra, id_usuario) VALUES (?, ?)";
                            db.query(sqlCrearReserva, [id_obra, id_comprador], (err) => {
                                if (err) {
                                    console.error('Error creando reserva:', err);
                                    return db.rollback(() => res.status(500).json({ 
                                        success: false, 
                                        message: "Error creando reserva automática" 
                                    }));
                                }
                                
                                console.log(`Reserva creada automáticamente para obra ${id_obra} con comprador ${id_comprador}`);
                                procesarComprador(id_comprador);
                            });
                        });
                    } else {
                        id_comprador = compradorResults[0].id_usuario;
                        procesarComprador(id_comprador);
                    }
                });
            });
        });
    });
});

// ==========================================
// 5. MEMBRESÍAS Y PAGOS
// ==========================================

router.get('/api/solicitudes-pago', (req, res) => {
    const sql = `
        SELECT s.*, u.Email 
        FROM SolicitudPago s 
        JOIN Usuario u ON s.id_usuario = u.id_usuario 
        WHERE s.Estatus = 'Pendiente'
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send("Error consultando pagos");
        res.json(results);
    });
});

router.post('/aprobar-pago', (req, res) => {
    const { id_solicitud, id_usuario } = req.body;

    db.beginTransaction((err) => {
        if (err) return res.status(500).send("Error");

        const sqlSolicitud = "UPDATE SolicitudPago SET Estatus = 'Aprobado' WHERE id_solicitud = ?";
        const sqlMembresia = "INSERT INTO Membresia (FechaPago, MontoPagado, id_usuario) VALUES (CURDATE(), 10.00, ?)";

        db.query(sqlSolicitud, [id_solicitud], (err) => {
            if (err) return db.rollback(() => res.status(500).send("Error en solicitud"));

            db.query(sqlMembresia, [id_usuario], (err) => {
                if (err) return db.rollback(() => res.status(500).send("Error en membresía"));
                
                db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).send("Error"));
                    res.send("Membresía activada y días sumados");
                });
            });
        });
    });
});

router.post('/registrar-nuevo-pago', (req, res) => {
    const { id_usuario } = req.body;
    const sql = "INSERT INTO Membresia (FechaPago, MontoPagado, id_usuario) VALUES (CURDATE(), 10.00, ?)";
    db.query(sql, [id_usuario], (err) => {
        if (err) return res.status(500).send("Error al registrar pago");
        res.send("Membresía renovada.");
    });
});

// ==========================================
// 6. REPORTES Y CONSULTAS
// ==========================================

router.get('/consultas/obras-vendidas', (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    const sql = "SELECT f.id_factura, f.id_obra, o.Nombre AS Obra, f.Total_Pagado, DATE_FORMAT(f.Fecha_Venta, '%Y-%m-%d') AS Fecha FROM Factura f JOIN Obra o ON f.id_obra = o.id_Obra WHERE DATE(f.Fecha_Venta) BETWEEN ? AND ? ORDER BY f.Fecha_Venta DESC";
    db.query(sql, [fecha_inicio, fecha_fin], (err, results) => {
        if (err) return res.status(500).send(err.message);
        res.json(results);
    });
});

router.get('/consultas/resumen-facturacion', (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    const sql = "SELECT f.id_factura, DATE_FORMAT(f.Fecha_Venta, '%Y-%m-%d') AS Fecha, o.Nombre AS Obra, f.Monto_Neto AS Precio_Obra, f.Porcentaje_Comision AS Porcentaje_Museo, f.Ganancia_Museo_USD AS Ganancia_Museo, f.Total_Pagado AS Total_Recaudado FROM Factura f JOIN Obra o ON f.id_obra = o.id_Obra WHERE DATE(f.Fecha_Venta) BETWEEN ? AND ? ORDER BY f.Fecha_Venta DESC";
    db.query(sql, [fecha_inicio, fecha_fin], (err, results) => {
        if (err) return res.status(500).send(err.message);
        res.json(results);
    });
});

router.get('/consultas/resumen-membresias', (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    const sql = "SELECT m.idMembresia, u.Email, DATE_FORMAT(m.FechaPago, '%Y-%m-%d') AS FechaPago, m.MontoPagado FROM Membresia m JOIN Usuario u ON m.id_usuario = u.id_usuario WHERE DATE(m.FechaPago) BETWEEN ? AND ? ORDER BY m.FechaPago DESC";
    db.query(sql, [fecha_inicio, fecha_fin], (err, results) => {
        if (err) {
            console.error('Error en reporte de membresías:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ==========================================
// 7. RUTAS PARA ENVÍOS (VERSIÓN SIMPLIFICADA)
// ==========================================

// Obtener datos de una factura específica para el envío (SIN columnas de dirección)
router.get('/api/factura/:id', (req, res) => {
    const idFactura = req.params.id;
    console.log('Buscando factura ID:', idFactura);
    
    const query = `
        SELECT f.*, u.Email, c.Nombre, c.Apellido, c.Cedula,
               o.Nombre as nombre_obra, o.Precio
        FROM Factura f
        INNER JOIN Usuario u ON f.id_comprador = u.id_usuario
        INNER JOIN Comprador c ON u.id_usuario = c.id_usuario
        INNER JOIN Obra o ON f.id_obra = o.id_Obra
        WHERE f.id_factura = ?
    `;
    
    db.query(query, [idFactura], (err, results) => {
        if (err) {
            console.error('Error obteniendo factura:', err);
            return res.status(500).json({ success: false, message: 'Error en BD' });
        }
        
        console.log('Resultados factura:', results);
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Factura no encontrada' });
        }
        
        const factura = results[0];
        
        // Como no tenemos columnas de dirección, devolvemos direccion: null
        res.json({ 
            success: true, 
            factura, 
            direccion: null
        });
    });
});

// Registrar un nuevo envío (versión con textos)
router.post('/api/registrar-envio', (req, res) => {
    const { id_factura, estado, municipio, parroquia, direccion_detallada, numero_guia } = req.body;
    
    console.log('Datos recibidos en /api/registrar-envio:', req.body);
    
    if (!id_factura) {
        return res.status(400).json({ 
            success: false, 
            message: 'ID de factura es requerido' 
        });
    }
    
    if (!estado || !municipio || !parroquia || !direccion_detallada) {
        return res.status(400).json({ 
            success: false, 
            message: 'Todos los campos de dirección son obligatorios' 
        });
    }
    
    const checkFacturaQuery = 'SELECT id_factura FROM Factura WHERE id_factura = ?';
    db.query(checkFacturaQuery, [id_factura], (err, facturaResults) => {
        if (err) {
            console.error('Error verificando factura:', err);
            return res.status(500).json({ success: false, message: 'Error en BD' });
        }
        
        if (facturaResults.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'La factura no existe' 
            });
        }
        
        const checkQuery = 'SELECT id_envio FROM Envio WHERE id_factura = ?';
        db.query(checkQuery, [id_factura], (err, results) => {
            if (err) {
                console.error('Error verificando envío:', err);
                return res.status(500).json({ success: false, message: 'Error en BD' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Esta factura ya tiene un envío registrado' 
                });
            }
            
            const insertQuery = `
                INSERT INTO Envio (id_factura, estado, municipio, parroquia, direccion_detallada, numero_guia, fecha_envio) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
            
            db.query(insertQuery, [id_factura, estado, municipio, parroquia, direccion_detallada, numero_guia || null], (err2, result) => {
                if (err2) {
                    console.error('Error registrando envío:', err2);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Error al registrar el envío: ' + err2.message 
                    });
                }
                
                res.json({ 
                    success: true, 
                    message: 'Envío registrado exitosamente',
                    id_envio: result.insertId
                });
            });
        });
    });
});

// ==========================================
// 8. RUTAS PARA DATOS GEOGRÁFICOS
// ==========================================

    router.get('/api/estados', (req, res) => {
        db.query("SELECT id_estado, nombre FROM Estado ORDER BY nombre", (err, results) => {
            if (err) {
                console.error('Error obteniendo estados:', err);
                return res.status(500).json({ success: false, message: 'Error en BD' });
            }
            res.json({ success: true, estados: results });
        });
    });


    router.get('/api/municipios/:id_estado', (req, res) => {
        const { id_estado } = req.params;
        db.query(
            "SELECT id_municipio, nombre FROM Municipio WHERE id_estado = ? ORDER BY nombre", 
            [id_estado], 
            (err, results) => {
                if (err) {
                    console.error('Error obteniendo municipios:', err);
                    return res.status(500).json({ success: false, message: 'Error en BD' });
                }
                res.json({ success: true, municipios: results });
            }
        );
    });


    router.get('/api/parroquias/:id_municipio', (req, res) => {
        const { id_municipio } = req.params;
        db.query(
            "SELECT id_parroquia, nombre FROM Parroquia WHERE id_municipio = ? ORDER BY nombre", 
            [id_municipio], 
            (err, results) => {
                if (err) {
                    console.error('Error obteniendo parroquias:', err);
                    return res.status(500).json({ success: false, message: 'Error en BD' });
                }
                res.json({ success: true, parroquias: results });
            }
        );
    });


module.exports = router;