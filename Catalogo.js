const express = require('express');
const router = express.Router();
const db = require('./database'); 

// Función auxiliar para convertir Buffers a Base64 de forma segura
const bufferToBase64 = (campo) => {
    if (campo && Buffer.isBuffer(campo)) {
        return campo.toString('base64');
    } else if (campo && typeof campo === 'object' && campo.data) {
        return Buffer.from(campo.data).toString('base64');
    }
    return null;
};

// 1. Obtener autores para los filtros del catálogo
router.get('/autores', (req, res) => {
    db.query('SELECT id_Autor, Nombre, Apellido FROM Autor', (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// 2. Obtener obras filtradas para el catálogo principal (CON TODOS LOS DETALLES)
router.get('/obras-filtradas', (req, res) => {
    const { genero, artista, orden } = req.query;
    
    let sql = `
        SELECT
            o.*,
            o.id_obra as id_obra, 
            a.Nombre as AutorNombre, a.Apellido as AutorApellido, 
            g.Descripcion as GeneroNombre, a.id_Autor,
            p.Tecnica, p.Soporte, p.dimensiones_cm,
            ec.Material, ec.Peso_kg, ec.Largo_cm, ec.Ancho_cm, ec.Profundidad_cm,
            f.Formato, f.Camara_Usada,
            orf.Metal_Base, orf.Kilataje, orf.Peso_Gramos as PesoOrfebreria, orf.Piedras_Preciosas
        FROM Obra o
        JOIN Obra_autor oa ON o.id_Obra = oa.Obra_id_Obra
        JOIN Autor a ON oa.Autor_id_Autor = a.id_Autor
        JOIN Genero g ON o.Genero_id_Genero = g.id_Genero
        LEFT JOIN Detalle_Pintura p ON o.id_Obra = p.id_Obra
        LEFT JOIN Detalle_Escultura_Ceramica ec ON o.id_Obra = ec.id_Obra
        LEFT JOIN Detalle_Fotografia f ON o.id_Obra = f.id_Obra
        LEFT JOIN Detalle_Orfebreria orf ON o.id_Obra = orf.id_Obra
        WHERE o.Estado_obra = 'Disponible'
    `;

    if (genero && genero !== 'all') sql += ` AND g.Descripcion = ${db.escape(genero)}`;
    if (artista && artista !== 'all') sql += ` AND a.id_Autor = ${db.escape(artista)}`;
    
    sql += (orden === 'desc') ? " ORDER BY o.Precio DESC" : " ORDER BY o.Precio ASC";

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error en consulta de catálogo:", err);
            return res.status(500).json(err);
        }

        const obrasProcesadas = results.map(obra => {
            if (obra.imagen) {
                obra.imagen = bufferToBase64(obra.imagen);
            }
            return obra;
        });
        res.json(obrasProcesadas);
    });
});

// 3. Detalle de Autor (Perfil individual con obras detalladas)
router.get('/autor-detalle/:id', (req, res) => {
    const id = req.params.id;
    const { ordenDate } = req.query;

    const sqlAutor = `
        SELECT a.*, n.Descripcion as Nacionalidad 
        FROM Autor a 
        JOIN Nacionalidad n ON a.Nacionalidad_id_Nacionalidad = n.id_Nacionalidad 
        WHERE a.id_Autor = ?`;

    let sqlObras = `
        SELECT 
            o.*, g.Descripcion as GeneroNombre,
            p.Tecnica, p.dimensiones_cm,
            ec.Material, ec.Peso_kg, ec.Largo_cm, ec.Ancho_cm, ec.Profundidad_cm,
            f.Formato, orf.Metal_Base, orf.Piedras_Preciosas
        FROM Obra o 
        JOIN Obra_autor oa ON o.id_Obra = oa.Obra_id_Obra 
        JOIN Genero g ON o.Genero_id_Genero = g.id_Genero
        LEFT JOIN Detalle_Pintura p ON o.id_Obra = p.id_Obra
        LEFT JOIN Detalle_Escultura_Ceramica ec ON o.id_Obra = ec.id_Obra
        LEFT JOIN Detalle_Fotografia f ON o.id_Obra = f.id_Obra
        LEFT JOIN Detalle_Orfebreria orf ON o.id_Obra = orf.id_Obra
        WHERE oa.Autor_id_Autor = ? AND o.Estado_obra = 'Disponible'
    `;

    sqlObras += (ordenDate === 'asc') ? " ORDER BY o.Fecha_creacion ASC" : " ORDER BY o.Fecha_creacion DESC";

    db.query(sqlAutor, [id], (err, autorRes) => {
        if (err) return res.status(500).json(err);
        
        db.query(sqlObras, [id], (err, obrasRes) => {
            if (err) return res.status(500).json(err);

            if (autorRes[0] && autorRes[0].Fotografia) {
                autorRes[0].Fotografia = bufferToBase64(autorRes[0].Fotografia);
            }
            
            const obrasBase64 = obrasRes.map(o => {
                if (o.imagen) {
                    o.imagen = bufferToBase64(o.imagen);
                }
                return o;
            });

            res.json({ autor: autorRes[0], obras: obrasBase64 });
        });
    });
});

// 4. Catálogo general de artistas
router.get('/artistas-catalogo', (req, res) => {
    const query = `
        SELECT 
            a.id_Autor, 
            a.Nombre, 
            a.Apellido, 
            a.Fecha_nacimiento, 
            a.Fotografia,
            GROUP_CONCAT(DISTINCT g.Descripcion SEPARATOR ', ') AS Especialidades
        FROM Autor a
        LEFT JOIN Obra_autor oa ON a.id_Autor = oa.Autor_id_Autor
        LEFT JOIN Obra o ON oa.Obra_id_Obra = o.id_Obra
        LEFT JOIN Genero g ON o.Genero_id_Genero = g.id_Genero
        GROUP BY a.id_Autor;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error al obtener artistas:", err);
            return res.status(500).json({ error: "Error en la base de datos", detalles: err });
        }

        const artistas = results.map(autor => {
            if (autor.Fotografia) {
                autor.Fotografia = bufferToBase64(autor.Fotografia);
            }
            return autor;
        });

        res.json(artistas);
    });
});

module.exports = router;