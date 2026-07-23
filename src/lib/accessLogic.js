import { supabase } from './supabaseClient'

// Normaliza una placa: mayúsculas, sin espacios ni guiones
export function normalizePlate(plate) {
  return plate.trim().toUpperCase().replace(/[\s-]/g, '')
}

// Busca si un vehículo (por placa) ya tiene un registro ABIERTO (entrada sin salida)
async function findOpenLogByPlate(plate) {
  const { data, error } = await supabase
    .from('access_logs')
    .select('*')
    .eq('plate', plate)
    .is('exit_time', null)
    .order('entry_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

// Flujo para VEHÍCULO RESIDENTE (por QR o por placa manual)
// Decide automáticamente si es entrada o salida según si ya está adentro.
export async function processResidentAccess({ vehicle, guardId }) {
  const plate = normalizePlate(vehicle.plate)
  const openLog = await findOpenLogByPlate(plate)

  if (openLog) {
    // Ya estaba adentro -> esto es una SALIDA
    const { error } = await supabase
      .from('access_logs')
      .update({ exit_time: new Date().toISOString(), exit_guard_id: guardId })
      .eq('id', openLog.id)

    if (error) throw error
    return { type: 'exit', plate }
  }

  // No estaba adentro -> esto es una ENTRADA
  const { error } = await supabase.from('access_logs').insert({
    entry_type: 'resident',
    vehicle_id: vehicle.id,
    plate,
    driver_name: null,
    entry_guard_id: guardId,
  })

  if (error) throw error
  return { type: 'entry', plate }
}

// Busca un vehículo por su código QR
export async function findVehicleByQr(qrCode) {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, apartments(tower, number, owner_name)')
    .eq('qr_code', qrCode)
    .eq('active', true)
    .maybeSingle()

  if (error) throw error
  return data
}

// Busca un vehículo residente por placa (respaldo manual)
export async function findVehicleByPlate(plate) {
  const normalized = normalizePlate(plate)
  const { data, error } = await supabase
    .from('vehicles')
    .select('*, apartments(tower, number, owner_name)')
    .eq('plate', normalized)
    .eq('active', true)
    .maybeSingle()

  if (error) throw error
  return data
}

// Busca historial de un visitante por placa (para autocompletar)
export async function findVisitorByPlate(plate) {
  const normalized = normalizePlate(plate)
  const { data, error } = await supabase
    .from('visitors')
    .select('*, apartments:last_apartment_id(tower, number)')
    .eq('plate', normalized)
    .maybeSingle()

  if (error) throw error
  return data
}

// Registra la ENTRADA de un visitante (siempre se registra manualmente)
export async function registerVisitorEntry({ plate, driverName, apartmentId, guardId }) {
  const normalized = normalizePlate(plate)

  // Alerta: ¿ya hay un registro abierto con esta placa? (posible error / duplicado)
  const openLog = await findOpenLogByPlate(normalized)
  const alertFlag = !!openLog
  const alertType = openLog ? 'duplicate_qr' : null

  const { error: logError } = await supabase.from('access_logs').insert({
    entry_type: 'visitor',
    plate: normalized,
    driver_name: driverName || null,
    destination_apartment_id: apartmentId,
    entry_guard_id: guardId,
    alert_flag: alertFlag,
    alert_type: alertType,
  })
  if (logError) throw logError

  // Actualiza (o crea) el historial del visitante para autocompletar la próxima vez
  const { data: existing } = await supabase
    .from('visitors')
    .select('id, visit_count')
    .eq('plate', normalized)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('visitors')
      .update({
        driver_name: driverName || null,
        last_apartment_id: apartmentId,
        visit_count: (existing.visit_count || 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('visitors').insert({
      plate: normalized,
      driver_name: driverName || null,
      last_apartment_id: apartmentId,
    })
  }

  return { alertFlag, alertType }
}

// Reglas de tarifa de visitantes: primeras 2 horas gratis, luego $1.500 COP
// por cada hora o fracción de hora adicional (si se pasa 1 minuto, se cobra
// la hora completa).
const FREE_MINUTES = 120
const RATE_PER_HOUR = 1500

export function calculateVisitorFee(entryTime, exitTime) {
  const minutes = Math.round((new Date(exitTime) - new Date(entryTime)) / 60000)
  if (minutes <= FREE_MINUTES) {
    return { fee: 0, billableHours: 0, totalMinutes: minutes }
  }
  const extraMinutes = minutes - FREE_MINUTES
  const billableHours = Math.ceil(extraMinutes / 60) // cualquier fracción cuenta como hora completa
  return { fee: billableHours * RATE_PER_HOUR, billableHours, totalMinutes: minutes }
}

// Registra la SALIDA de un visitante (buscado por placa)
export async function registerVisitorExit({ plate, guardId }) {
  const normalized = normalizePlate(plate)
  const openLog = await findOpenLogByPlate(normalized)

  if (!openLog) {
    throw new Error('No se encontró un registro de entrada abierto para esta placa.')
  }

  const exitTime = new Date().toISOString()
  const { fee, billableHours, totalMinutes } = calculateVisitorFee(openLog.entry_time, exitTime)

  const { error } = await supabase
    .from('access_logs')
    .update({ exit_time: exitTime, exit_guard_id: guardId, fee_amount: fee })
    .eq('id', openLog.id)

  if (error) throw error
  return { ...openLog, exit_time: exitTime, fee, billableHours, totalMinutes }
}

// Registra un intento de escaneo de QR que no corresponde a ningún vehículo
// activo (carnet no reconocido, dañado, o posible QR falso/clonado).
// Se guarda como un registro ya cerrado (no cuenta como "adentro"), solo
// para que quede trazabilidad y la alerta sea visible para administración.
export async function logUnrecognizedQr({ qrCode, guardId }) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('access_logs').insert({
    entry_type: 'visitor',
    plate: `QR-DESCONOCIDO`,
    driver_name: `Código escaneado: ${qrCode.slice(0, 40)}`,
    entry_time: now,
    exit_time: now,
    entry_guard_id: guardId,
    alert_flag: true,
    alert_type: 'unrecognized',
  })
  if (error) throw error
}

// Búsqueda general por placa (para el respaldo manual / botón "buscar")
// Devuelve info combinada: si es residente, si tiene registro abierto, etc.
export async function searchByPlate(plate) {
  const normalized = normalizePlate(plate)

  const [vehicle, openLog] = await Promise.all([
    findVehicleByPlate(normalized),
    findOpenLogByPlate(normalized),
  ])

  return { vehicle, openLog, plate: normalized }
}