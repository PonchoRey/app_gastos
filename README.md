# 📱 App Gastos

Una aplicación moderna, rápida y estética para la gestión de finanzas personales (control de ingresos y gastos), construida utilizando tecnologías web puras (Vanilla JS, HTML5, CSS3) y empaquetada como aplicación nativa de Android mediante Capacitor.

## ✨ Características Principales

*   **Arquitectura MVC sin Frameworks:** Rendimiento ultrarrápido al no depender de frameworks reactivos pesados.
*   **Almacenamiento Local (Privacy First):** Todos tus datos financieros se guardan exclusivamente en tu dispositivo utilizando SQLite (vía `Capacitor/JeepSqlite`). No hay servidores de terceros que almacenen tus gastos.
*   **Diseño Premium (Dark Mode):** Interfaz cuidada con micro-animaciones, estados vacíos amigables y un diseño enfocado en la experiencia del usuario (UI/UX).
*   **Gestión de Flujo de Caja:** Soporte dinámico para capturar tanto Gastos como Ingresos, actualizando el balance en tiempo real.
*   **Integración de Inteligencia Artificial (Voz a Texto):** Permite dictar los gastos mediante voz utilizando un modelo *Bring Your Own Key* (BYOK), donde tú proporcionas tu propia clave API para máxima privacidad y control de costos.

## 🛠️ Tecnologías y Arquitectura

El proyecto sigue una estructura **MVC (Modelo-Vista-Controlador)** modificada:
*   `src/js/models/`: Persistencia de datos contra la base de datos local SQLite.
*   `src/js/views/`: Manipulación directa del DOM y enlazado (binding) de eventos.
*   `src/js/controllers/`: Lógica de negocio que conecta Vistas y Modelos.
*   `src/js/app.js`: Punto de entrada que inicializa el enrutador de secciones, la base de datos y los controladores.
