import { supabase } from './supabaseClient'
import { normalizePlate } from './accessLogic'

// Genera un UUID v4 sin depender de crypto.randomUUID(), que el navegador
// solo permite en conexiones seguras (HTTPS o localhost exacto).
// crypto.getRandomValues() sí funciona sin ese requisito, así que la usamos
// para mantener la misma aleatoriedad segura (no es Math.random()).
function generateUuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Procesa filas de Excel con columnas: torre, apartamento, propietario, telefono, placa, tipo_vehiculo
// Crea (o reutiliza) el apartamento, y crea el vehículo con un qr_code único.
// Devuelve un resumen: { created, skipped, errors }
export async function bulkImportResidents(rows) {
  const summary = { created: 0, skipped: 0, errors: [] }

  for (const row of rows) {
    try {
      const tower = String(row.torre || '').trim()
      const number = String(row.apartamento || '').trim()
      const owner = String(row.propietario || '').trim()
      const phone = String(row.telefono || '').trim()
      const plate = normalizePlate(String(row.placa || ''))
      const vehicleType = String(row.tipo_vehiculo || 'carro').trim().toLowerCase()

      if (!tower || !number || !owner || !plate) {
        summary.errors.push(`Fila incompleta (torre/apto/propietario/placa requeridos): ${JSON.stringify(row)}`)
        continue
      }

      // Buscar o crear el apartamento
      let { data: apartment } = await supabase
        .from('apartments')
        .select('id')
        .eq('tower', tower)
        .eq('number', number)
        .maybeSingle()

      if (!apartment) {
        const { data: newApt, error: aptError } = await supabase
          .from('apartments')
          .insert({ tower, number, owner_name: owner, phone })
          .select('id')
          .single()
        if (aptError) throw aptError
        apartment = newApt
      }

      // Verificar si la placa ya existe
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('plate', plate)
        .maybeSingle()

      if (existingVehicle) {
        summary.skipped++
        continue
      }

      const qrCode = generateUuid()

      const { error: vehError } = await supabase.from('vehicles').insert({
        plate,
        vehicle_type: vehicleType,
        apartment_id: apartment.id,
        qr_code: qrCode,
      })
      if (vehError) throw vehError

      summary.created++
    } catch (err) {
      summary.errors.push(`Error en fila ${JSON.stringify(row)}: ${err.message}`)
    }
  }

  return summary
}

// Trae todos los vehículos con su info de apartamento, para generar los QR a imprimir
export async function getAllVehiclesForQrPrinting() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, plate, qr_code, apartments(tower, number, owner_name)')
    .eq('active', true)
    .order('plate')

  if (error) throw error
  return data
}

// Crea un guardia llamando a la Edge Function segura (usa el token de sesión del admin)
export async function createGuard({ fullName, email, password }) {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-guard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ full_name: fullName, email, password }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error creando el guardia')
  return data
}