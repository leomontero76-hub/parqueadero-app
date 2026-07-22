-- =====================================================
-- SCRIPT DE LIMPIEZA
-- Borra todo lo relacionado al sistema de parqueadero,
-- para poder ejecutar schema.sql desde cero sin conflictos.
-- Seguro de correr aunque algunas tablas no existan.
-- =====================================================

drop view if exists current_occupancy cascade;
drop function if exists flag_overstay_visitors(integer) cascade;

drop table if exists access_logs cascade;
drop table if exists profiles cascade;
drop table if exists visitors cascade;
drop table if exists vehicles cascade;
drop table if exists parking_spots cascade;
drop table if exists apartments cascade;
