# Lumina Studio — Sistema de Reservas

Un sistema de reservas de belleza/bienestar reutilizable construido con **Flask + PostgreSQL** (backend) y **HTML/CSS/JS Vanilla** (frontend).

---

## Estructura del proyecto

```
Sistema_reservas/
├── backend/
│   ├── app.py                # Punto de entrada Flask
│   ├── config.py             # Configuración desde .env
│   ├── models.py             # Modelos SQLAlchemy
│   ├── seed.py               # Script de datos de demostración
│   ├── .env.example          # Plantilla de variables de entorno
│   ├── requirements.txt      # Dependencias Python
│   └── routes/
│       ├── services.py       # GET /api/services
│       ├── professionals.py  # GET /api/professionals
│       ├── availability.py   # GET /api/availability
│       └── appointments.py   # POST /api/appointments + upload
└── frontend/
    ├── index.html            # Landing page (HU01)
    ├── booking.html          # Wizard de reserva (HU02-HU06)
    ├── css/
    │   ├── style.css         # Sistema de diseño global
    │   └── booking.css       # Estilos del wizard
    └── js/
        ├── api.js            # Llamadas a la API
        ├── main.js           # Lógica de la landing page
        └── booking.js        # Lógica del wizard de reserva
```

---

## ⚙️ Configuración del Backend

### 1. Instalar PostgreSQL

Descarga desde: https://www.postgresql.org/download/

Durante la instalación, anota tu **usuario** (por defecto `postgres`) y **contraseña**.

### 2. Crear la base de datos

Abre **pgAdmin** o la consola de PostgreSQL (`psql`) y ejecuta:

```sql
CREATE DATABASE lumina_studio;
```

### 3. Configurar variables de entorno

En la carpeta `backend/`, copia el archivo de ejemplo:

```powershell
cd backend
copy .env.example .env
```

Edita `.env` con tus credenciales reales:

```
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/lumina_studio
SECRET_KEY=un-secreto-aleatorio-muy-largo
```

### 4. Crear entorno virtual e instalar dependencias

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Arrancar el servidor

```powershell
python app.py
```

El backend correrá en: **http://localhost:5000**

### 6. Poblar la base de datos con datos de demo

```powershell
python seed.py
```

Esto crea 3 profesionales, 8 servicios y sus horarios de trabajo.

---

## 🌐 Configuración del Frontend

El frontend es HTML estático — no necesita servidor. Puedes:

**Opción A — Abrir directamente el archivo** (puede tener limitaciones con ES modules):
```
Doble click en frontend/index.html
```

**Opción B — Servidor local con Python** (recomendado):
```powershell
cd frontend
python -m http.server 3000
```
Luego abre: **http://localhost:3000**

**Opción C — VS Code con Live Server** (extensión de VS Code)

---

## 🔌 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/services` | Todos los servicios |
| GET | `/api/services/<id>` | Un servicio |
| GET | `/api/services/categories` | Categorías únicas |
| GET | `/api/professionals` | Todos los profesionales |
| GET | `/api/professionals/<id>` | Un profesional |
| GET | `/api/professionals/by-service/<id>` | Profesionales para un servicio |
| GET | `/api/availability/<prof_id>/<YYYY-MM-DD>` | Horarios disponibles |
| POST | `/api/appointments` | Crear una cita |
| GET | `/api/appointments/<id>` | Detalle de una cita |
| PATCH | `/api/appointments/<id>/cancel` | Cancelar cita |
| POST | `/api/upload` | Subir imagen de diseño |

---

## 🗄️ Esquema de la Base de Datos

- **professionals** — Profesionales del salón
- **services** — Servicios ofrecidos
- **professional_services** — Relación M2M profesional ↔ servicio
- **working_hours** — Horarios de trabajo por día
- **appointments** — Citas reservadas

---

## 📋 User Stories implementadas

| HU | Descripción | Implementación |
|----|-------------|----------------|
| HU01 | Acceder a la página e información del negocio | `index.html` completo |
| HU02 | Seleccionar un servicio | Paso 1 del wizard con filtros por categoría |
| HU03 | Seleccionar un profesional | Paso 2 izquierdo — lista filtrada por servicio |
| HU04 | Seleccionar fecha y hora | Paso 2 derecho — calendario + slots de tiempo |
| HU05 | Datos personales + imagen de diseño | Paso 3 — formulario completo |
| HU06 | Confirmación de cita | Modal de confirmación con detalles |

---

## 🎨 Paleta de diseño

- **Fondo**: `#FDF5F3` (crema blush)
- **Primario**: `#A85070` (rosa mauve)
- **Oscuro**: `#3D2535` (ciruela oscuro)
- **Tipografías**: Cormorant Garamond (títulos) + Jost (cuerpo)
