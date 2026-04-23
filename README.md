#  🏛️ Museo Contemporáneo - Sistema de Gestión

Este proyecto es una plataforma web integral diseñada para la administración de un **Museo Contemporáneo**. Permite gestionar el catálogo de obras de arte, organizar la información por autores y manejar un sistema de suscripciones para los usuarios.

## 🚀 Características

- **Gestión de Obras:** Registro detallado de piezas artísticas vinculadas a sus respectivos autores.
- **Módulo de Autores:** Organización y visualización de biografías y colecciones por artista.
- **Sistema de Suscripciones:** Control de membresías para el acceso a contenido o servicios del museo.
- **Base de Datos Relacional:** Estructura robusta en MySQL para garantizar la integridad de la información.
- **Interfaz Moderna:** Diseño limpio y minimalista acorde a la estética de un museo contemporáneo.

## 🛠️ Tecnologías Utilizadas

- **Backend:** [Node.js](https://nodejs.org/) con el framework **Express**.
- **Base de Datos:** [MySQL](https://www.mysql.com/) (diseño relacional).
- **Frontend:** HTML5, CSS3 y JavaScript.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
- Node.js (v14 o superior)
- MySQL Server
- Un gestor de paquetes como NPM (incluido con Node.js)


## ✒️ Autores

El desarrollo de este proyecto fue realizado por:

 - Alejandro Briceño
 - Kelvys Concepcion
 - Rolanny Sanchez

## 📂 Estructura del Proyecto

```text
Museo-Contemporaneo/
├── 📁 Administrador/        # Lógica y vistas de administración
│   ├── 📄 (Archivo HTML 1)
│   └── 📄 (Archivo HTML 2)
├── 📁 Assets/               # Recursos (CSS, Imágenes)
├── 📁 Diseño BD/            # Documentación del modelo de datos
├── 📁 Iconos/               # Recursos gráficos
├── 📁 Inicio_sesion/        # Módulo de autenticación
├── 📁 SQL/                  # Scripts de creación de tablas
├── 📁 views/                # Vistas generales del sistema
├── 📄 Admin.js              # Controlador de administración
├── 📄 Catalogo.js           # Lógica del catálogo
├── 📄 Inicio.html           # Página principal
├── 📄 Login.js              # Lógica de acceso
├── 📄 Servidor.js           # Archivo principal de Node.js (Express)
├── 📄 database.js           # Configuración de conexión MySQL
└── 📄 README.md             # Documentación del proyecto
