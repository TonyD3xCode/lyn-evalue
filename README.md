# 🚗 LYN AutoSales — Evaluador de Daños

Sistema interno de **LYN AutoSales** para registrar vehículos que ingresan, evaluar sus daños, calcular costos estimados de reparación y generar reportes exportables.

Desarrollado con **Netlify + Neon (PostgreSQL)** y funciones serverless.

---

## ✨ Funcionalidades

- 📋 **Gestión de vehículos**  
  - Crear, editar y eliminar fichas.  
  - Decodificación automática de VIN (NHTSA) → marca, modelo, año, país.  
  - Adjuntar foto principal y notas.

- 🛠️ **Evaluación de daños**  
  - Lista de partes del vehículo (parachoques, puertas, faros, etc.).  
  - Registro de ubicación, severidad (**Bajo / Medio / Alto**) y descripción.  
  - Estimación en **USD** de reparación.  
  - Subida de múltiples fotos por daño: versión **thumb** (listado) + **full** (detalle/reporte).

- 📑 **Reportes**  
  - Severidad global del vehículo.  
  - Total estimado de daños.  
  - Listado con detalle de cada parte afectada.  
  - Exportación rápida a **PDF** (print → save as PDF).

- 🎨 **UI moderna**  
  - Tema oscuro minimalista.  
  - Header con logo corporativo.  
  - Estado vacío claro cuando no hay vehículos ni daños.  
  - Navegación fluida entre vistas.

---

## 🛠️ Tecnologías

- **Frontend:**  
  - HTML, CSS, JavaScript vanilla (sin frameworks pesados).  
  - Responsive para iPad y escritorio.

- **Backend:**  
  - [Netlify Functions](https://docs.netlify.com/functions/overview/) (Node.js).  
  - [pg](https://www.npmjs.com/package/pg) → conexión a Neon (PostgreSQL).  

- **Base de datos:**  
  - [Neon](https://neon.tech/) (PostgreSQL serverless).  
  - Tablas: `vehicles`, `damages`.  
  - Campo `descrption` para detalles de daño.

- **Integraciones:**  
  - API pública de NHTSA para decodificación de VIN.  

---

## 🚀 Despliegue

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/TonyD3xCode/lyn-evalue.git
   cd lyn-evalue

	2.	Configurar Netlify
	•	Crear sitio en Netlify.
	•	Variables de entorno → NEON_DATABASE_URL con tu cadena de conexión a Neon (sslmode=require).
	3.	Configurar Neon
	•	Crear base de datos en Neon.
	•	Ejecutar schema.sql incluido para crear tablas.
	4.	Deploy
	•	Push al repositorio → Netlify se despliega automáticamente.
	•	O usar Drag & Drop del directorio al dashboard de Netlify.

📂 Estructura

lyn-evalue/
├── index.html        # Interfaz principal
├── styles.css        # Estilos (tema oscuro)
├── app.js            # Lógica frontend
├── netlify.toml      # Configuración de Netlify
├── netlify/
│   └── functions/
│       ├── db.mjs        # Cliente de Neon
│       ├── vehicles.mjs  # CRUD vehículos
│       └── damages.mjs   # CRUD daños
├── schema.sql        # Tablas de Neon
└── assets/
    └── logo-lyn.png  # Logo corporativo


👨‍💻 Autor

LYN AutoSales
Proyecto interno corporativo para gestión de vehículos y daños.

⸻

📜 Licencia

Uso interno corporativo.
No está destinado a distribución pública sin autorización de LYN AutoSales.