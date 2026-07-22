# Guía de despliegue — Sistema de Control de Parqueadero

Sigue estos pasos en orden. No necesitas pagar nada (todo en planes gratuitos).

## 1. Crear el proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta.
2. Clic en **New Project**.
   - Nombre: `parqueadero-conjunto`
   - Contraseña de base de datos: genera una segura y **guárdala** en un lugar seguro.
   - Región: **South America (São Paulo)** (la más cercana a Colombia).
3. Espera 1-2 minutos mientras se crea.

## 2. Crear las tablas (esquema de base de datos)

1. En el menú izquierdo, ve a **SQL Editor**.
2. Clic en **New query**.
3. Abre el archivo `sql/schema.sql` de este proyecto, copia todo su contenido y pégalo ahí.
4. Clic en **Run** (o Ctrl+Enter). Deberías ver "Success. No rows returned".

## 3. Obtener tus credenciales

1. Ve a **Settings → API**.
2. Copia estos dos valores:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (una clave larga que empieza con `eyJ...`)
3. **Nunca copies ni compartas la `service_role key`** — esa se queda solo en el servidor (Edge Function).

## 4. Configurar las variables de entorno del proyecto

1. En la raíz del proyecto, crea un archivo llamado `.env` (copia `.env.example` y renómbralo).
2. Pégale tus valores:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...tu-clave-larga
   ```

## 5. Crear el primer usuario ADMINISTRADOR

Como la creación de guardias se hace desde la app pero el primer admin no existe todavía,
debes crearlo manualmente **una sola vez**:

1. En Supabase, ve a **Authentication → Users → Add user → Create new user**.
2. Ingresa el correo y contraseña del administrador (ej: `admin@conjunto.com`).
3. Marca "Auto Confirm User" para que no necesite verificar el correo.
4. Copia el **UUID** del usuario que se acaba de crear (aparece en la lista de usuarios).
5. Ve a **SQL Editor** y ejecuta (reemplazando los valores):
   ```sql
   insert into profiles (id, full_name, email, role, active)
   values ('PEGA-AQUI-EL-UUID', 'Nombre del Administrador', 'admin@conjunto.com', 'admin', true);
   ```
6. Ya puedes iniciar sesión en la app con ese correo y contraseña, como administrador.

## 6. Desplegar la Edge Function (creación de guardias)

Esto requiere el CLI de Supabase. Desde tu computador, con Node.js instalado:

```bash
npm install -g supabase
supabase login
cd parqueadero-app
supabase link --project-ref TU-PROJECT-REF   # está en la URL de tu proyecto Supabase
supabase functions deploy create-guard
```

La función usa automáticamente las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
que Supabase ya provee internamente a las Edge Functions — no necesitas configurarlas tú.

Si no tienes forma de instalar el CLI, puedes pedirle a Claude (o a cualquier desarrollador)
que te ayude con este paso puntual — es el único que requiere terminal.

## 7. Probar localmente (opcional pero recomendado)

```bash
npm install
npm run dev
```

Abre la URL que aparece (algo como `http://localhost:5173`) e inicia sesión con tu usuario admin.

## 8. Desplegar en Vercel (para que quede accesible desde los celulares)

1. Sube este proyecto a un repositorio de GitHub (puedes arrastrar los archivos en
   github.com → New repository → "uploading an existing file", o usar git desde terminal).
2. Ve a https://vercel.com → **Add New → Project** → selecciona tu repositorio de GitHub.
3. En **Environment Variables**, agrega las mismas dos variables del `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clic en **Deploy**. En un par de minutos tendrás una URL pública, por ejemplo:
   `https://parqueadero-conjunto.vercel.app`

## 9. Instalar la app en los celulares de los guardias

1. Abre la URL de Vercel en el navegador del celular (Chrome en Android, Safari en iPhone).
2. Debe aparecer una opción "Agregar a pantalla de inicio" o "Instalar app".
3. Una vez instalada, aparece como un ícono normal — se abre sin barra de navegador,
   como una app nativa.

## 10. Cargar los datos iniciales

1. Inicia sesión como administrador.
2. Ve a **Cargar residentes** → descarga la plantilla → llénala con los datos reales de
   los 600 apartamentos/vehículos → súbela.
3. Ve a **Imprimir QR** → imprime las tarjetas → recórtalas y pégalas sobre los carnets
   existentes.
4. Ve a **Guardias** → crea una cuenta para cada guardia (nombre, correo, contraseña temporal).
   Recomienda a cada guardia cambiar su contraseña la primera vez que ingrese
   (esto se puede agregar como mejora futura si lo necesitas).

---

## Notas sobre costos y límites (para que la administración lo sepa)

- **Supabase gratis** incluye 500 MB de base de datos y pausa el proyecto tras 7 días
  sin ningún request (esto no debería pasar si se usa a diario, pero si algún día
  la garita reporta que "no carga", puede ser que el proyecto se pausó por inactividad —
  se reactiva con un clic desde el panel de Supabase).
- **Vercel gratis** no tiene límite de tiempo, solo de ancho de banda (100 GB/mes),
  que es más que suficiente para este uso.
- Si en el futuro el conjunto crece o quieren más funciones (fotos, reportes avanzados),
  el plan pago de Supabase es de USD $25/mes — no es necesario por ahora.
