import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { createGuard } from '../../lib/adminLogic'

export default function GuardsPanel() {
  const [guards, setGuards] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadGuards() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'guard')
      .order('created_at', { ascending: false })
    setGuards(data || [])
  }

  useEffect(() => { loadGuards() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createGuard({ fullName, email, password })
      setFullName('')
      setEmail('')
      setPassword('')
      setShowForm(false)
      loadGuards()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(guard) {
    await supabase.from('profiles').update({ active: !guard.active }).eq('id', guard.id)
    loadGuards()
  }

  return (
    <div>
      <div style={styles.headerRow}>
        <h2 style={styles.h2}>Guardias registrados</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          {showForm ? 'Cancelar' : '+ Nuevo guardia'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <input required placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} style={styles.input} />
          <input required type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
          <input required type="password" placeholder="Contraseña temporal" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} minLength={6} />
          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Creando...' : 'Crear guardia'}
          </button>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Nombre</th>
            <th style={styles.th}>Correo</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {guards.map((g) => (
            <tr key={g.id}>
              <td style={styles.td}>{g.full_name}</td>
              <td style={styles.td}>{g.email}</td>
              <td style={styles.td}>{g.active ? '🟢 Activo' : '🔴 Inactivo'}</td>
              <td style={styles.td}>
                <button onClick={() => toggleActive(g)} style={styles.toggleBtn}>
                  {g.active ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const styles = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  h2: { fontSize: 18, fontWeight: 700, color: '#1e293b' },
  addBtn: { padding: '10px 16px', borderRadius: 8, border: 'none', background: '#1e40af', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  form: { background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 },
  submitBtn: { padding: '10px 16px', borderRadius: 8, border: 'none', background: '#166534', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f1f5f9', fontSize: 13, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f1f5f9' },
  toggleBtn: { padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, cursor: 'pointer' },
}
