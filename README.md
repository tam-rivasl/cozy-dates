# Goals and Memories App

This is a web application built with Next.js and Firebase that helps users track their personal goals, manage tasks, and create memories.

## Features

* Goal tracking
* Task management
* Memory creation and storage
* User authentication with Firebase Authentication
* Data storage with Firebase Firestore

## Installation

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Set up a Firebase project and configure the application with your Firebase project details.
4. Run the development server using `npm run dev`.

## Quickstart actualizado

```bash
# Instalar dependencias existentes
npm install

# Variables de entorno
cp .env.example .env.local
# Completa las credenciales de Supabase/Firebase antes de levantar el proyecto.

# Linter y typecheck
npm run lint
npm run typecheck

# Pruebas automáticas (compila TypeScript a dist-test y ejecuta node --test)
npm run test

# Levantar entorno local
npm run dev
```

## Configuración de cuenta renovada

- Formularios de perfil con datos personales ampliados (nombre, apellido, apodo, edad y correo editable).
- Cambio seguro de contraseña directamente desde la pestaña de perfil.
- Gestión de pareja mediante códigos de invitación compartidos, sin creación duplicada.
- Nuevo selector de temas con "Automático", "Terracota" y "Dark básico" para personalizar la experiencia visual.
- Galería fotográfica optimizada con previsualizaciones responsivas, overlay `+N` y visor inmersivo con fondo difuminado.

