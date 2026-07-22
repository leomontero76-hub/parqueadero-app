import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function ParkingSpotsPanel() {
  const [spots, setSpots] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [newNumber, setNewNumber] = useState('')
  const [isVisitorSpot, setIsVisitorSpot] = useState(false)

  async function loadData() {
    const { data: spotsData } = await supabase
      .from('parking_spots')
      .select('*, apartments(tower, number)')
      .order('number')
    setSpots(spotsData || [])

    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('id, plate, apartment_id, parking_spot_id, apartments(tower, number)')
      .order('plate')
    setVehicles(vehiclesData || [])
  }

  useEffect(() => { loadData() }, [])

  async function handleAddSpot(e) {
    e.preventDefault()
    if (!newNumber.trim()) return
    await supabase.from('parking_spots').insert({ number: newNumber.trim(), is_visitor_spot: isVisitorSpot })
    setNewNumber('')
    setIsVisitorSpot(false)
    loadData()
  }

  async function handleAssign(spot, vehicleId) {
    // Libera CUALQUIER vehículo que actualmente tenga este parqueadero asignado
    // (una consulta directa a la base de datos, no depende de lo que haya
    // cargado en el estado local, así se corrige cualquier dato duplicado
    // que haya quedado de antes).
    const { error: clearError } = await supabase
      .from('vehicles')
      .update({ parking_spot_id: null })
      .eq('parking_spot_id', spot.id)

    if (clearError) {
      alert('Error liberando el parqueadero: ' + clearError.message)
      return
    }

    // Si se eligió un vehículo nuevo (no "Sin asignar"), se lo asignamos
    if (vehicleId) {
      const { error } = await supabase
        .from('vehicles')
        .update({ parking_spot_id: spot.id })
        .eq('id', vehicleId)
      if (error) {
        alert('Error asignando el parqueadero: ' + error.message)
        return
      }
    }

    loadData()
  }

  return (
    <div>
      <h2 style={styles.h2}>Parqueaderos</h2>
      <p style={styles.text}>
        Crea los números de parqueadero y opcionalmente asígnalos a un vehículo residente.
        Los que no asignes quedan disponibles para completarlos después.
      </p>

      <form onSubmit={handleAddSpot} style={styles.form}>
        <input
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          placeholder="Número de parqueadero"
          style={styles.input}
        />
        <label style={styles.checkboxLabel}>
          <input type="checkbox" checked={isVisitorSpot} onChange={(e) => setIsVisitorSpot(e.target.checked)} />
          Es de visitantes
        </label>
        <button type="submit" style={styles.addBtn}>Agregar</button>
      </form>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Parqueadero</th>
            <th style={styles.th}>Tipo</th>
            <th style={styles.th}>Vehículo asignado</th>
          </tr>
        </thead>
        <tbody>
          {spots.map((s) => {
            const assignedVehicle = vehicles.find((v) => v.parking_spot_id === s.id)
            return (
              <tr key={s.id}>
                <td style={styles.td}>{s.number}</td>
                <td style={styles.td}>{s.is_visitor_spot ? 'Visitante' : 'Residente'}</td>
                <td style={styles.td}>
                  <select
                    value={assignedVehicle?.id || ''}
                    onChange={(e) => handleAssign(s, e.target.value || null)}
                    style={styles.select}
                  >
                    <option value="">Sin asignar</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} — {v.apartments?.tower} {v.apartments?.number}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const styles = {
  h2: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 },
  text: { fontSize: 13, color: '#64748b', marginBottom: 16, maxWidth: 600 },
  form: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 },
  checkboxLabel: { fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 },
  addBtn: { padding: '10px 16px', borderRadius: 8, border: 'none', background: '#1e40af', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f1f5f9', fontSize: 13, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f1f5f9' },
  select: { padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 },
}