import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { downloadAsExcel } from '../../lib/excelUtils'
import { normalizePlate } from '../../lib/accessLogic'

export default function HistoryPanel() {
  const [plateFilter, setPlateFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    setLoading(true)
    let query = supabase
      .from('access_logs')
      .select('*, apartments:destination_apartment_id(tower, number)')
      .order('entry_time', { ascending: false })
      .limit(500)

    if (plateFilter.trim()) query = query.eq('plate', normalizePlate(plateFilter))
    if (dateFrom) query = query.gte('entry_time', new Date(dateFrom).toISOString())
    if (dateTo) query = query.lte('entry_time', new Date(dateTo + 'T23:59:59').toISOString())

    const { data, error } = await query
    if (!error) setRows(data || [])
    setSearched(true)
    setLoading(false)
  }

  function handleExport() {
    downloadAsExcel(
      rows.map((r) => ({
        placa: r.plate,
        tipo: r.entry_type === 'resident' ? 'Residente' : 'Visitante',
        entrada: new Date(r.entry_time).toLocaleString('es-CO'),
        salida: r.exit_time ? new Date(r.exit_time).toLocaleString('es-CO') : 'Aún adentro',
        apartamento_destino: r.apartments ? `${r.apartments.tower} ${r.apartments.number}` : '',
        tarifa_cobrada: r.entry_type === 'visitor' ? `$${(r.fee_amount || 0).toLocaleString('es-CO')}` : '',
        alerta: r.alert_flag ? r.alert_type : '',
      })),
      `historial_accesos_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Historial'
    )
  }

  return (
    <div>
      <h2 style={styles.h2}>Historial de accesos</h2>

      <form onSubmit={handleSearch} style={styles.form}>
        <input
          placeholder="Filtrar por placa (opcional)"
          value={plateFilter}
          onChange={(e) => setPlateFilter(e.target.value)}
          style={styles.input}
        />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={styles.input} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={styles.input} />
        <button type="submit" style={styles.searchBtn}>Buscar</button>
      </form>

      {searched && (
        <>
          <div style={styles.headerRow}>
            <p style={{ fontSize: 13, color: '#64748b' }}>{rows.length} resultado(s)</p>
            {rows.length > 0 && <button onClick={handleExport} style={styles.exportBtn}>Exportar a Excel</button>}
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Placa</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Entrada</th>
                <th style={styles.th}>Salida</th>
                <th style={styles.th}>Destino</th>
                <th style={styles.th}>Tarifa</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={r.alert_flag ? { background: '#fef2f2' } : {}}>
                  <td style={styles.td}>{r.plate}</td>
                  <td style={styles.td}>{r.entry_type === 'resident' ? 'Residente' : 'Visitante'}</td>
                  <td style={styles.td}>{new Date(r.entry_time).toLocaleString('es-CO')}</td>
                  <td style={styles.td}>{r.exit_time ? new Date(r.exit_time).toLocaleString('es-CO') : '—'}</td>
                  <td style={styles.td}>{r.apartments ? `${r.apartments.tower} ${r.apartments.number}` : '—'}</td>
                  <td style={styles.td}>
                    {r.entry_type === 'visitor' && r.exit_time
                      ? `$${(r.fee_amount || 0).toLocaleString('es-CO')}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

const styles = {
  h2: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 },
  form: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 },
  searchBtn: { padding: '10px 16px', borderRadius: 8, border: 'none', background: '#1e40af', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exportBtn: { padding: '8px 14px', borderRadius: 8, border: '1px solid #1e40af', background: '#fff', color: '#1e40af', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f1f5f9', fontSize: 13, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f1f5f9' },
}