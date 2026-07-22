import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { downloadAsExcel } from '../../lib/excelUtils'

export default function OccupancyPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadOccupancy() {
    const { data, error } = await supabase
      .from('current_occupancy')
      .select('*')
      .order('entry_time', { ascending: false })
    if (!error) setRows(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadOccupancy()

    // Suscripción en tiempo real: cualquier cambio en access_logs refresca la vista
    const channel = supabase
      .channel('access_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_logs' }, () => {
        loadOccupancy()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  function handleExport() {
    downloadAsExcel(
      rows.map((r) => ({
        placa: r.plate,
        tipo: r.entry_type === 'resident' ? 'Residente' : 'Visitante',
        apartamento: r.apartment || '',
        hora_entrada: new Date(r.entry_time).toLocaleString('es-CO'),
      })),
      `aforo_actual_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Aforo actual'
    )
  }

  return (
    <div>
      <div style={styles.headerRow}>
        <h2 style={styles.h2}>Aforo actual — {rows.length} vehículo(s) adentro</h2>
        <button onClick={handleExport} style={styles.exportBtn}>Exportar a Excel</button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : rows.length === 0 ? (
        <p style={{ color: '#64748b' }}>No hay vehículos dentro del conjunto en este momento.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Placa</th>
              <th style={styles.th}>Tipo</th>
              <th style={styles.th}>Apartamento</th>
              <th style={styles.th}>Hora de entrada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.log_id}>
                <td style={styles.td}>{r.plate}</td>
                <td style={styles.td}>{r.entry_type === 'resident' ? 'Residente' : 'Visitante'}</td>
                <td style={styles.td}>{r.apartment || '—'}</td>
                <td style={styles.td}>{new Date(r.entry_time).toLocaleString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const styles = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  h2: { fontSize: 18, fontWeight: 700, color: '#1e293b' },
  exportBtn: { padding: '10px 16px', borderRadius: 8, border: '1px solid #1e40af', background: '#fff', color: '#1e40af', fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f1f5f9', fontSize: 13, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f1f5f9' },
}
