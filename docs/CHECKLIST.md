# Checklist Maestro — Sistema de Control de Parqueadero
### Conjunto Residencial — Proyecto de 15 días

Marca cada casilla a medida que se complete. Cada fase se revisa y aprueba antes de pasar a la siguiente.

---

## Fase 0 — Preparación de cuentas (responsable: tú)
- [ ] Cuenta creada en Supabase (https://supabase.com)
- [ ] Proyecto Supabase creado (nombre, región São Paulo, contraseña de DB guardada en lugar seguro)
- [ ] Cuenta creada en GitHub (https://github.com)
- [ ] Cuenta creada en Vercel, conectada con GitHub (https://vercel.com)
- [ ] Confirmar con la administración: ¿cómo y cuándo entregarán el listado de los 600 residentes?
- [ ] Confirmar con la administración: nombres de los guardias que van a usar el sistema (para crear sus cuentas más adelante)

## Fase 1 — Base de datos
- [ ] Explicación detallada de cada tabla (contenido de este mensaje)
- [ ] Ajustes al diseño según tus comentarios/dudas
- [ ] Script SQL final (`schema.sql`)
- [ ] Tú ejecutas el script en el SQL Editor de Supabase
- [ ] Verificación: las 7 tablas existen y no hay errores
- [ ] Explicación de las reglas de seguridad (RLS) aplicadas

## Fase 2 — Autenticación y estructura base
- [ ] Explicación del modelo de login (Supabase Auth + roles admin/guardia)
- [ ] Proyecto base React + Vite + PWA
- [ ] Conexión al proyecto de Supabase (variables de entorno)
- [ ] Pantalla de login funcional
- [ ] Creación manual de tu primer usuario ADMIN (paso único)
- [ ] Prueba conjunta: inicias sesión y confirmas que funciona

## Fase 3 — App del guardia (móvil / PWA)
- [ ] Pantalla de escaneo QR (cámara)
- [ ] Lógica: detectar automáticamente si el QR escaneado es entrada o salida
- [ ] Pantalla de búsqueda manual por placa (respaldo sin QR)
- [ ] Pantalla de registro de visitantes (con autocompletado si ya visitó antes)
- [ ] Prueba conjunta: simular 4-5 escenarios (entrada residente, salida residente, entrada visitante, salida visitante, QR dañado)

## Fase 4 — Panel admin: datos maestros
- [ ] Carga masiva de residentes/vehículos desde Excel + plantilla descargable
- [ ] Generación e impresión de QR para carnets
- [ ] Gestión de parqueaderos (crear, asignar a vehículo)
- [ ] Gestión de guardias (crear cuenta, activar/desactivar)
- [ ] Prueba conjunta: subir un Excel de prueba y verificar que se crean bien los registros

## Fase 5 — Panel admin: visibilidad y control
- [ ] Aforo actual en tiempo real (vehículos adentro ahora mismo)
- [ ] Historial de accesos con filtros (placa, fechas) + exportar a Excel
- [ ] Alerta: QR duplicado / doble entrada
- [ ] Alerta: visitante con sobreestadía (mucho tiempo sin salir)
- [ ] Alerta: vehículo no reconocido
- [ ] Prueba conjunta: revisar que las 3 alertas se disparen correctamente

## Fase 6 — Despliegue y entrega
- [ ] Desplegar la Edge Function de creación de guardias en Supabase
- [ ] Subir el proyecto a GitHub
- [ ] Desplegar la app en Vercel (con variables de entorno configuradas)
- [ ] Instalar la PWA en un celular de prueba (Android y/o iPhone)
- [ ] Cargar datos reales (o de prueba si aún no llegan los 600 residentes)
- [ ] Crear cuentas reales de los guardias
- [ ] Guía de uso corta para guardias (cómo escanear, qué hacer si falla)
- [ ] Guía de uso corta para administración (cómo ver reportes, cargar Excel, crear guardias)
- [ ] Entrega final + explicación en vivo

---

### Notas de alcance (para no perder de vista)
- Presupuesto: $0/mes (Supabase + Vercel planes gratuitos)
- Plazo: 15 días
- El QR identifica al **vehículo**, no a la persona
- Visitantes: registro 100% manual (sin QR), con autocompletado por placa
- Parqueaderos: numerados, pero se pueden dejar "sin asignar" si aún no hay esa info
- Soporte post-entrega: no continuo, pero el sistema debe sostenerse ~1 año sin intervención
