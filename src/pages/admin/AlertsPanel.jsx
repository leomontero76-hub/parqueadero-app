import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const ALERT_LABELS = {
  duplicate_qr: '⚠️ Posible QR duplicado / doble entrada',
  overstay: '⏱️ Visitante con mucho tiempo adentro',
  unrecognized: '❓ Vehículo no reconocido',
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadAlerts() {
    // Marca automáticamente sobreestadías de visitantes (más de 12 horas) antes de listar
    await supabase.rpc('flag_overstay_visitors', { hours_limit: 12 })

    const { data } = await supabase
      .from('access_logs')
      .select('*')
      .eq('alert_flag', true)
      .order('entry_time', { ascending: false })
      .limit(100)
    setAlerts(data || [])
    setLoading(false)
  }

  useEffect(() => { loadAlerts() }, [])

  return (
    <div>
      <h2 style={styles.h2}>Alertas</h2>
      <p style={styles.text}>
        Se muestran registros con: QR duplicado (entrada mientras ya estaba adentro),
        visitantes con más de 12 horas sin salir, o vehículos no reconocidos.
      </p>

      {loading ? (
        <p>Cargando...</p>
      ) : alerts.length === 0 ? (
        <p style={{ color: '#64748b' }}>No hay alertas activas. 👍</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Alerta</th>
              <th style={styles.th}>Placa</th>
              <th style={styles.th}>Entrada</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td style={styles.td}>{ALERT_LABELS[a.alert_type] || a.alert_type}</td>
                <td style={styles.td}>{a.plate}</td>
                <td style={styles.td}>{new Date(a.entry_time).toLocaleString('es-CO')}</td>
                <td style={styles.td}>{a.exit_time ? 'Ya salió' : 'Adentro'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const styles = {
  h2: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 },
  text: { fontSize: 13, color: '#64748b', marginBottom: 16, maxWidth: 600 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f1f5f9', fontSize: 13, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f1f5f9' },
}
