# Diagramador UML Colaborativo

[![Node.js CI](https://github.com/Jbenjaminhc/uml-colaborativo-sw1/actions/workflows/nodeci.yml/badge.svg)](https://github.com/Jbenjaminhc/uml-colaborativo-sw1/actions/workflows/nodeci.yml)

Aplicación web colaborativa para crear, editar, almacenar y compartir diagramas de clases UML. El sistema permite modelar clases, interfaces, enumeraciones, atributos, métodos y relaciones, además de importar y exportar modelos y generar una estructura inicial de proyectos Spring Boot.

## Tabla de contenidos

- [Descripción](#descripción)
- [Funcionalidades](#funcionalidades)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Requisitos previos](#requisitos-previos)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Pruebas](#pruebas)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Despliegue](#despliegue)
- [Documentación](#documentación)
- [Contribución](#contribución)
- [Licencia](#licencia)

## Descripción

El **Diagramador UML Colaborativo** está orientado a estudiantes, docentes, desarrolladores y equipos de software que necesitan representar visualmente un modelo de clases y convertirlo en una base de código.

La aplicación combina un editor visual con persistencia, autenticación y colaboración en tiempo real. Los usuarios pueden trabajar sobre diagramas propios o compartidos, asignar permisos a colaboradores y conservar los cambios en MongoDB.

## Funcionalidades

- Registro, verificación e inicio de sesión de usuarios.
- Recuperación y actualización de contraseña.
- Creación, consulta, actualización y eliminación de diagramas.
- Editor visual de diagramas basado en React Flow.
- Modelado de:
  - Clases.
  - Interfaces.
  - Enumeraciones.
  - Atributos.
  - Métodos.
  - Constantes.
  - Relaciones UML.
- Control de visibilidad y colaboración mediante roles de propietario, editor y lector.
- Colaboración en tiempo real con:
  - Presencia de usuarios.
  - Actividad.
  - Cursores.
  - Chat.
  - Sincronización de entidades y relaciones.
- Importación y exportación de modelos en JSON y XMI.
- Generación de proyectos iniciales Java con Spring Boot y Maven.
- Descarga del proyecto generado como archivo ZIP.

## Arquitectura

El repositorio utiliza una arquitectura de tipo monorepo con dos aplicaciones independientes:

```text
Navegador
   |
   | HTTPS y WebSocket
   v
Frontend React
   |
   v
Backend Node.js y Express
   |
   +--> MongoDB / MongoDB Atlas
   |
   +--> EmailJS
   |
   +--> Generador Spring Boot y archivo ZIP
```

### Frontend

El cliente se encuentra en [`client/`](./client/) y es una aplicación React con TypeScript y Vite. Gestiona las vistas, rutas, editor visual, estado de autenticación, estado del diagrama y comunicación con el backend.

### Backend

El servidor se encuentra en [`server/`](./server/) y proporciona:

- API REST con Express.
- Autenticación y autorización mediante JWT.
- Cifrado de contraseñas con bcrypt.
- Validación y persistencia mediante Mongoose.
- Comunicación en tiempo real mediante Socket.IO.
- Parsers y transformadores para JSON y XMI.
- Generación de proyectos Spring Boot.

### Persistencia

MongoDB almacena usuarios, diagramas, entidades UML y relaciones. La conexión se configura mediante `MONGO_URI`, por lo que puede utilizarse MongoDB local durante el desarrollo o MongoDB Atlas en producción.

## Tecnologías

### Cliente

- React 18.
- TypeScript.
- Vite.
- React Router.
- React Flow.
- Material UI.
- Axios.
- Socket.IO Client.
- Vitest y Testing Library.

### Servidor

- Node.js.
- TypeScript.
- Express.
- Mongoose.
- MongoDB.
- Socket.IO.
- JSON Web Tokens.
- bcrypt.
- Zod.
- Supertest.
- Jest.

### Importación y generación

- `fast-xml-parser`.
- `xmlbuilder2`.
- Plantillas Java y Maven.
- Archiver para archivos ZIP.

## Requisitos previos

Antes de iniciar el proyecto se requiere:

- Node.js 18 o superior.
- npm.
- Git.
- MongoDB local o una cuenta de MongoDB Atlas.
- Un navegador web actualizado.

Para verificar Node.js y npm:

```bash
node --version
npm --version
```

## Instalación y ejecución local

### 1. Clonar el repositorio

```bash
git clone https://github.com/Jbenjaminhc/uml-colaborativo-sw1.git
cd uml-colaborativo-sw1
```

### 2. Instalar dependencias del cliente

```bash
cd client
npm install
```

### 3. Instalar dependencias del servidor

```bash
cd ../server
npm install
```

### 4. Configurar las variables del servidor

Crear el archivo `server/.env` a partir de [`server/.env.example`](./server/.env.example):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/uml2code
JWT_SECRET=use-a-long-random-secret
CLIENT_URL=http://localhost:5173

EMAILJS_SERVICE_ID=
EMAILJS_USER_ID=
EMAILJS_ACCESS_KEY=
EMAILJS_VERIFY_TEMPLATE_ID=
EMAILJS_RESET_TEMPLATE_ID=
```

Para utilizar MongoDB Atlas, sustituir únicamente el valor de `MONGO_URI` por la cadena de conexión de Atlas.

### 5. Configurar el cliente

Crear `client/.env` con la URL del backend:

```env
VITE_API_URL=http://localhost:5000
```

### 6. Iniciar el backend

Desde `server/`:

```bash
npm start
```

El servidor queda disponible normalmente en:

```text
http://localhost:5000
```

### 7. Iniciar el frontend

En otra terminal, desde `client/`:

```bash
npm run dev
```

El cliente queda disponible normalmente en:

```text
http://localhost:5173
```

## Variables de entorno

### Servidor

| Variable | Obligatoria | Descripción |
|---|---:|---|
| `PORT` | No | Puerto del servidor. Render lo proporciona automáticamente en producción. |
| `MONGO_URI` | Sí | URI de conexión a MongoDB o MongoDB Atlas. |
| `JWT_SECRET` | Sí | Secreto utilizado para firmar y validar tokens. |
| `CLIENT_URL` | Sí | URL del frontend para enlaces de verificación y recuperación. |
| `EMAILJS_SERVICE_ID` | Para correo | Identificador del servicio EmailJS. |
| `EMAILJS_USER_ID` | Para correo | Identificador público de EmailJS. |
| `EMAILJS_ACCESS_KEY` | Para correo | Credencial de acceso de EmailJS. |
| `EMAILJS_VERIFY_TEMPLATE_ID` | Para verificación | Plantilla de correo de verificación. |
| `EMAILJS_RESET_TEMPLATE_ID` | Para recuperación | Plantilla de recuperación de contraseña. |

### Cliente

| Variable | Obligatoria | Descripción |
|---|---:|---|
| `VITE_API_URL` | Sí | URL pública del backend, por ejemplo `https://uml2code-api.onrender.com`. |

No se deben subir a Git las credenciales reales. Los archivos `.env` deben permanecer fuera del repositorio.

## Scripts disponibles

### Cliente

Ejecutar desde `client/`:

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo de Vite. |
| `npm run build` | Compila TypeScript y genera la aplicación de producción. |
| `npm run preview` | Sirve localmente la compilación de producción. |
| `npm run test` | Ejecuta las pruebas con Vitest. |
| `npm run coverage` | Ejecuta las pruebas y genera cobertura. |
| `npm run lint` | Ejecuta ESLint sobre el cliente. |

### Servidor

Ejecutar desde `server/`:

| Comando | Descripción |
|---|---|
| `npm start` | Inicia el servidor de desarrollo con Nodemon. |
| `npm run build` | Compila TypeScript en `dist/`. |
| `npm run start:prod` | Inicia el servidor compilado. |
| `npm run test` | Ejecuta ESLint y las pruebas con Jest. |
| `npm run coverage` | Ejecuta las pruebas y genera cobertura. |
| `npm run lint` | Ejecuta ESLint sobre el servidor. |

## Pruebas

El proyecto utiliza pruebas unitarias, de integración y de comunicación:

- El cliente utiliza Vitest y Testing Library.
- El servidor utiliza Jest y Supertest.
- Las pruebas de persistencia utilizan MongoDB Memory Server.
- Las pruebas de colaboración utilizan Socket.IO Client y un servidor HTTP de prueba.
- Las pruebas de generación validan parsers, mappers, normalizadores, plantillas y archivos generados.

Para verificar el servidor:

```bash
cd server
npm run build
npm test
```

Para verificar el cliente:

```bash
cd client
npm run build
npm test -- --run
```

## Estructura del proyecto

```text
UML2Code/
├── .github/
│   └── workflows/             Automatización y CI
├── .vscode/                   Configuración del editor
├── client/
│   ├── public/                Recursos públicos, como logo.svg
│   └── src/
│       ├── assets/            Imágenes del bundle
│       ├── components/        Pantallas y componentes React
│       │   ├── alert/         Alertas y contexto de alertas
│       │   ├── auth/          Registro, login y verificación
│       │   ├── chat/          Chat colaborativo
│       │   ├── diagram/       Editor, nodos y relaciones UML
│       │   ├── dialogs/       Diálogos y exportación
│       │   ├── forms/         Formularios, inputs y selects
│       │   ├── header/        Encabezados y menús
│       │   └── user/          Perfil de usuario
│       ├── context/           Estado global y colaboración
│       ├── hooks/             Hooks especializados
│       ├── styles/            Hojas de estilo
│       ├── utils/             Utilidades especializadas
│       ├── App.tsx            Tema, proveedores y rutas
│       ├── index.tsx          Entrada de React
│       ├── index.css          Estilos globales
│       ├── theme.ts           Tema Material UI
│       ├── types.ts           Tipos del cliente
│       ├── utils.ts           Utilidades generales
│       └── vite-env.d.ts      Tipos de entorno de Vite
│   ├── .env.example           Variables de entorno de ejemplo
│   ├── index.html              Documento HTML de la SPA
│   ├── package.json            Dependencias y scripts
│   ├── package-lock.json       Versiones bloqueadas
│   ├── tsconfig.json           Configuración TypeScript
│   ├── tsconfig.node.json      Configuración TypeScript de Vite
│   ├── vercel.json             Reescrituras para Vercel
│   └── vite.config.ts          Configuración de Vite y Vitest
├── server/
│   ├── @types/                Extensiones locales de tipos Express
│   ├── src/
│   │   ├── controllers/       Controladores de aplicación
│   │   ├── export/            Generación y exportación
│   │   ├── handlers/          Eventos Socket.IO
│   │   ├── import/            Importación XMI
│   │   ├── middleware/        Autenticación y middleware
│   │   ├── models/            Modelos Mongoose
│   │   ├── routes/            Rutas REST
│   │   └── services/          Servicios de dominio
│   ├── tests/                 Pruebas unitarias y de integración
│   ├── .jest/                 Variables de entorno de Jest
│   ├── .env.example           Variables de entorno de ejemplo
│   ├── jest.config.ts         Configuración de Jest
│   ├── nodemon.json           Configuración de desarrollo
│   ├── package.json            Dependencias y scripts
│   ├── package-lock.json       Versiones bloqueadas
│   ├── tsconfig.json           Configuración TypeScript
│   └── vercel.json             Configuración histórica de despliegue
└── README.md                  Guía general del proyecto
```

> Las carpetas `docs/` y `Documentacion/` contienen documentación local y están
> excluidas del repositorio mediante el `.gitignore` raíz. No se publican al
> subir el código a GitHub.

## Despliegue

El frontend y el backend pueden permanecer en el mismo repositorio de GitHub y desplegarse como servicios independientes.

### Backend en Render

Crear un **Web Service** conectado al repositorio y configurar:

```text
Root Directory: server
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm run start:prod
Health Check Path: /
```

Variables mínimas:

```env
MONGO_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/uml2code
JWT_SECRET=use-a-long-production-secret
CLIENT_URL=https://tu-frontend.vercel.app
```

El backend utiliza Socket.IO, por lo que debe desplegarse como un Web Service persistente y no como una función serverless.

### Frontend en Vercel

Crear un proyecto conectado al mismo repositorio y configurar:

```text
Root Directory: client
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Variable de entorno:

```env
VITE_API_URL=https://tu-backend.onrender.com
```

La URL de Vercel debe estar permitida por la configuración CORS del backend.

## Documentación

La documentación académica y técnica se conserva localmente en las carpetas
`Documentacion/` y `docs/`. Ambas están excluidas de GitHub para mantener el
repositorio enfocado en el código fuente y los archivos necesarios para el
despliegue.

## Contribución

1. Actualizar la rama local:

   ```bash
   git checkout main
   git pull
   ```

2. Crear una rama de trabajo:

   ```bash
   git checkout -b feature/nombre-del-cambio
   ```

3. Implementar el cambio respetando la estructura del proyecto.
4. Ejecutar las compilaciones y pruebas del cliente y del servidor.
5. Revisar que no se incluyan secretos, archivos `.env`, `node_modules` ni artefactos de compilación innecesarios.
6. Crear un pull request con una descripción clara del cambio y de las verificaciones realizadas.

## Licencia

Consultar el archivo de licencia del repositorio o la información definida por los mantenedores del proyecto antes de redistribuir el software.
