-- =====================================================
-- ESQUEMA DE BASE DE DATOS - Control de Parqueadero
-- Conjunto Residencial - Sistema con QR
-- Motor: PostgreSQL (Supabase)
-- =====================================================

-- Extensión para generar UUIDs
create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. APARTAMENTOS
-- =====================================================
create table apartments (
  id uuid primary key default uuid_generate_v4(),
  tower text not null,              -- Torre / Bloque
  number text not null,             -- Número de apartamento
  owner_name text not null,         -- Nombre del propietario/residente
  phone text,                       -- Opcional, útil para contactar
  created_at timestamptz default now(),
  unique (tower, number)
);

-- =====================================================
-- 2. PARQUEADEROS
-- =====================================================
create table parking_spots (
  id uuid primary key default uuid_generate_v4(),
  number text not null unique,      -- Número/etiqueta del parqueadero
  apartment_id uuid references apartments(id) on delete set null, -- null = sin asignar
  is_visitor_spot boolean default false, -- true si es parqueadero de visitantes
  created_at timestamptz default now()
);

-- =====================================================
-- 3. VEHÍCULOS (Residentes) - llevan QR fijo
-- =====================================================
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  plate text not null unique,       -- Placa (se guarda en mayúsculas, sin espacios)
  vehicle_type text default 'carro', -- carro, moto, etc.
  apartment_id uuid not null references apartments(id) on delete cascade,
  parking_spot_id uuid references parking_spots(id) on delete set null,
  qr_code text not null unique,     -- Código único que va DENTRO del QR (UUID random, no la placa)
  active boolean default true,      -- Para desactivar un carnet sin borrar el historial
  created_at timestamptz default now()
);

create index idx_vehicles_qr on vehicles(qr_code);
create index idx_vehicles_plate on vehicles(plate);

-- =====================================================
-- 4. VISITANTES - historial para autocompletar
-- =====================================================
create table visitors (
  id uuid primary key default uuid_generate_v4(),
  plate text not null unique,       -- Placa del visitante
  driver_name text,                 -- Nombre de quien conduce (opcional)
  last_apartment_id uuid references apartments(id), -- Último apto visitado (para autocompletar)
  visit_count integer default 1,    -- Cuántas veces ha visitado (informativo)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_visitors_plate on visitors(plate);

-- =====================================================
-- 5. PERFILES (Guardias y Administradores)
-- Se apoya en Supabase Auth: cada fila aquí corresponde 1 a 1
-- con un usuario de auth.users. El login/contraseña los maneja
-- Supabase Auth (seguro, con hash, recuperación de clave, etc).
-- La creación de guardias desde el panel admin se hace mediante
-- una Edge Function protegida (ver /supabase/functions/create-guard).
-- =====================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('admin', 'guard')),
  active boolean default true,
  created_at timestamptz default now()
);

create index idx_profiles_role on profiles(role);

-- =====================================================
-- 7. REGISTROS DE ACCESO (el corazón del sistema)
-- =====================================================
create table access_logs (
  id uuid primary key default uuid_generate_v4(),

  entry_type text not null check (entry_type in ('resident', 'visitor')),

  -- Si es residente, referencia al vehículo (QR). Si es visitante, va null.
  vehicle_id uuid references vehicles(id),

  -- Placa siempre se guarda aquí también (aunque sea residente) para búsquedas rápidas
  plate text not null,

  -- Si es visitante, a qué apartamento va
  destination_apartment_id uuid references apartments(id),

  -- Nombre del conductor (relevante sobre todo para visitantes)
  driver_name text,

  entry_time timestamptz not null default now(),
  exit_time timestamptz,            -- null mientras el vehículo está adentro

  entry_guard_id uuid references profiles(id),
  exit_guard_id uuid references profiles(id),

  -- Alertas
  alert_flag boolean default false,
  alert_type text,                  -- 'duplicate_qr' | 'overstay' | 'unrecognized'

  created_at timestamptz default now()
);

create index idx_access_logs_plate on access_logs(plate);
create index idx_access_logs_open on access_logs(exit_time) where exit_time is null;
create index idx_access_logs_entry_time on access_logs(entry_time);

-- =====================================================
-- VISTA: Aforo actual (vehículos adentro en este momento)
-- =====================================================
create view current_occupancy as
select
  al.id as log_id,
  al.plate,
  al.entry_type,
  al.entry_time,
  al.driver_name,
  coalesce(a1.tower || ' - ' || a1.number, a2.tower || ' - ' || a2.number) as apartment,
  v.parking_spot_id
from access_logs al
left join vehicles v on al.vehicle_id = v.id
left join apartments a1 on v.apartment_id = a1.id
left join apartments a2 on al.destination_apartment_id = a2.id
where al.exit_time is null;

-- =====================================================
-- FUNCIÓN: marcar alertas de "sobreestadía" de visitantes
-- Se llama periódicamente (o al cargar el dashboard admin) para marcar
-- visitantes que llevan más de N horas sin salir.
-- =====================================================
create or replace function flag_overstay_visitors(hours_limit integer default 12)
returns void as $$
begin
  update access_logs
  set alert_flag = true, alert_type = 'overstay'
  where exit_time is null
    and entry_type = 'visitor'
    and entry_time < now() - (hours_limit || ' hours')::interval
    and (alert_type is null or alert_type != 'overstay');
end;
$$ language plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Se activa para que solo usuarios autenticados (guardias/admins)
-- puedan leer/escribir. Ajustar políticas según el método de auth elegido.
-- =====================================================
alter table apartments enable row level security;
alter table parking_spots enable row level security;
alter table vehicles enable row level security;
alter table visitors enable row level security;
alter table profiles enable row level security;
alter table access_logs enable row level security;

-- Cualquier usuario autenticado (guardia o admin) puede leer y escribir
-- en las tablas operativas. El control fino de "solo admin puede borrar
-- apartamentos", etc., se maneja también en la interfaz (ocultando botones),
-- pero las políticas de abajo son la barrera real de seguridad.
create policy "authenticated_full_access" on apartments for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on parking_spots for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on vehicles for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on visitors for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on access_logs for all using (auth.role() = 'authenticated');

-- profiles: todo usuario autenticado puede LEER todos los perfiles
-- (para mostrar "registrado por: Juan Pérez"), pero solo puede
-- modificar su propia fila. La creación de nuevos perfiles de guardia
-- se hace vía Edge Function con permisos elevados (no desde el cliente).
create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
