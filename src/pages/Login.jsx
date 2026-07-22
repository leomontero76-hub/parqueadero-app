import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await login(email, password)
    setLoading(false)
    if (error) setError('Usuario o contraseña incorrectos.')
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Control de Parqueadero</h1>
        <p style={styles.subtitle}>Ingresa con tu cuenta</p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
            placeholder="guardia@conjunto.com"
          />

          <label style={styles.label}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
            placeholder="••••••••"
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    padding: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  title: { fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6, marginTop: 14 },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    fontSize: 15,
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    marginTop: 24,
    padding: '13px',
    borderRadius: 10,
    border: 'none',
    background: '#1e40af',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: { color: '#dc2626', fontSize: 13, marginTop: 12 },
}
