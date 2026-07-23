import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import QrScanner from '../components/QrScanner'
import {
  findVehicleByQr,
  processResidentAccess,
  searchByPlate,
  findVisitorByPlate,
  registerVisitorEntry,
  registerVisitorExit,
  normalizePlate,
  logUnrecognizedQr,
} from '../lib/accessLogic'
import { supabase } from '../lib/supabaseClient'

const TABS = { SCAN: 'scan', MANUAL: 'manual', VISITOR: 'visitor' }

export default function GuardHome() {
  const { profile, logout } = useAuth()
  const [tab, setTab] = useState(TABS.SCAN)
  const [message, setMessage] = useState(null) // { type: 'success'|'error'|'warning', text }
  const [scanActive, setScanActive] = useState(true)
  const [awaitingNext, setAwaitingNext] = useState(false) // true = cámara pausada tras un escaneo exitoso
  const [busy, setBusy] = useState(false)
  const messageTimeoutRef = useRef(null)

  function showMessage(type, text, timeout = 4000) {
    // Cancela cualquier temporizador pendiente de un mensaje anterior,
    // para que no borre este mensaje nuevo antes de tiempo.
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current)
      messageTimeoutRef.current = null
    }
    setMessage({ type, text })
    if (timeout) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessage(null)
        messageTimeoutRef.current = null
      }, timeout)
    }
  }

  function handleScanNext() {
    setAwaitingNext(false)
    setScanActive(true)
  }

  // ---------- Flujo QR (residentes) ----------
  async function handleQrScan(decodedText) {
    if (busy) return
    setBusy(true)
    setScanActive(false)
    try {
      const vehicle = await findVehicleByQr(decodedText)
      if (!vehicle) {
        await logUnrecognizedQr({ qrCode: decodedText, guardId: profile.id })
        showMessage('error', 'QR no reconocido. Se guardó como alerta para administración. Verifica el carnet o usa el registro manual.', 6000)
        return
      }
      const result = await processResidentAccess({ vehicle, guardId: profile.id })
      const apto = `${vehicle.apartments.tower} - ${vehicle.apartments.number}`
      const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      if (result.type === 'entry') {
        showMessage('success', `✅ ENTRADA — Placa ${result.plate} — Apto ${apto} — ${hora}`)
      } else {
        showMessage('success', `🚪 SALIDA — Placa ${result.plate} — Apto ${apto} — ${hora}`)
      }
    } catch (err) {
      showMessage('error', 'Error al procesar el QR: ' + err.message)
    } finally {
      setBusy(false)
      // La cámara queda PAUSADA hasta que el guardia confirme escanear el siguiente
      // vehículo. Esto evita que, si el QR sigue frente a la cámara, se procese
      // el mismo carnet una y otra vez alternando entrada/salida.
      setAwaitingNext(true)
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Portería</div>
          <div style={styles.headerSubtitle}>{profile?.full_name}</div>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>Salir</button>
      </header>

      <nav style={styles.tabs}>
        <TabButton active={tab === TABS.SCAN} onClick={() => { setTab(TABS.SCAN); setAwaitingNext(false); setScanActive(true) }}>Escanear QR</TabButton>
        <TabButton active={tab === TABS.MANUAL} onClick={() => setTab(TABS.MANUAL)}>Buscar placa</TabButton>
        <TabButton active={tab === TABS.VISITOR} onClick={() => setTab(TABS.VISITOR)}>Visitante</TabButton>
      </nav>

      {message && (
        <div style={{ ...styles.banner, ...bannerStyle(message.type) }}>{message.text}</div>
      )}

      <main style={styles.content}>
        {tab === TABS.SCAN && (
          <div>
            {awaitingNext ? (
              <div style={styles.awaitingBox}>
                <p style={styles.hint}>Listo. Retira el carnet de la cámara antes de escanear el siguiente vehículo.</p>
                <button onClick={handleScanNext} style={{ ...styles.primaryBtn, width: '100%' }}>
                  📷 Escanear siguiente vehículo
                </button>
              </div>
            ) : (
              <>
                <p style={styles.hint}>Apunta la cámara al QR del carnet del vehículo.</p>
                <QrScanner onScan={handleQrScan} active={scanActive} />
              </>
            )}
          </div>
        )}

        {tab === TABS.MANUAL && (
          <ManualPlateSearch guardId={profile.id} showMessage={showMessage} />
        )}

        {tab === TABS.VISITOR && (
          <VisitorPanel guardId={profile.id} showMessage={showMessage} />
        )}
      </main>
    </div>
  )
}

// ---------- Sub-componente: búsqueda/respaldo manual por placa (residentes) ----------
function ManualPlateSearch({ guardId, showMessage }) {
  const [plate, setPlate] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!plate.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await searchByPlate(plate)
      setResult(res)
      if (!res.vehicle) {
        showMessage('warning', 'Esta placa no está registrada como residente. Puedes usar la pestaña "Visitante".', 6000)
      }
    } catch (err) {
      showMessage('error', 'Error buscando la placa: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister() {
    if (!result?.vehicle) return
    setLoading(true)
    try {
      const res = await processResidentAccess({ vehicle: result.vehicle, guardId })
      const apto = `${result.vehicle.apartments.tower} - ${result.vehicle.apartments.number}`
      const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      showMessage('success', res.type === 'entry' ? `✅ ENTRADA — Apto ${apto} — ${hora}` : `🚪 SALIDA — Apto ${apto} — ${hora}`)
      setResult(null)
      setPlate('')
    } catch (err) {
      showMessage('error', 'Error registrando: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p style={styles.hint}>Úsalo cuando el QR esté dañado o el celular no tenga cámara disponible.</p>
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          placeholder="Placa (ej: ABC123)"
          style={styles.input}
          autoCapitalize="characters"
        />
        <button type="submit" disabled={loading} style={styles.primaryBtn}>Buscar</button>
      </form>

      {result?.vehicle && (
        <div style={styles.resultCard}>
          <p><strong>Placa:</strong> {result.vehicle.plate}</p>
          <p><strong>Apartamento:</strong> {result.vehicle.apartments.tower} - {result.vehicle.apartments.number}</p>
          <p>
            <strong>Estado actual:</strong>{' '}
            {result.openLog
              ? `Adentro desde las ${new Date(result.openLog.entry_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
              : 'Afuera'}
          </p>
          <button onClick={handleRegister} disabled={loading} style={styles.primaryBtn}>
            {result.openLog ? 'Registrar SALIDA' : 'Registrar ENTRADA'}
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- Sub-componente: registro de visitantes (con autocompletado) ----------
function VisitorPanel({ guardId, showMessage }) {
  const [mode, setMode] = useState('entry') // 'entry' | 'exit'
  const [plate, setPlate] = useState('')
  const [driverName, setDriverName] = useState('')
  const [apartmentQuery, setApartmentQuery] = useState('')
  const [apartmentOptions, setApartmentOptions] = useState([])
  const [selectedApartment, setSelectedApartment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [autocompleted, setAutocompleted] = useState(false)

  async function handlePlateBlur() {
    if (!plate.trim()) return
    try {
      const visitor = await findVisitorByPlate(plate)
      if (visitor) {
        setDriverName(visitor.driver_name || '')
        if (visitor.apartments) {
          setSelectedApartment({
            id: visitor.last_apartment_id,
            tower: visitor.apartments.tower,
            number: visitor.apartments.number,
          })
          setApartmentQuery(`${visitor.apartments.tower} - ${visitor.apartments.number}`)
        }
        setAutocompleted(true)
      } else {
        setAutocompleted(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleApartmentSearch(query) {
    setApartmentQuery(query)
    setSelectedApartment(null)
    if (query.trim().length < 1) {
      setApartmentOptions([])
      return
    }
    const { data } = await supabase
      .from('apartments')
      .select('id, tower, number, owner_name')
      .or(`tower.ilike.%${query}%,number.ilike.%${query}%`)
      .limit(8)
    setApartmentOptions(data || [])
  }

  async function handleEntrySubmit(e) {
    e.preventDefault()
    if (!selectedApartment) {
      showMessage('error', 'Selecciona el apartamento destino de la lista.')
      return
    }
    setLoading(true)
    try {
      const { alertFlag } = await registerVisitorEntry({
        plate,
        driverName,
        apartmentId: selectedApartment.id,
        guardId,
      })
      const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      if (alertFlag) {
        showMessage('warning', '⚠️ Esta placa ya tenía un registro abierto (posible duplicado). Entrada registrada igualmente.', 6000)
      } else {
        showMessage('success', `✅ ENTRADA visitante — Placa ${normalizePlate(plate)} — Destino ${selectedApartment.tower}-${selectedApartment.number} — ${hora}`)
      }
      resetForm()
    } catch (err) {
      showMessage('error', 'Error registrando entrada: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExitSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await registerVisitorExit({ plate, guardId })
      const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      const horas = Math.floor(result.totalMinutes / 60)
      const mins = result.totalMinutes % 60
      const tiempoTexto = `${horas}h ${mins}min`
      const tarifaTexto = result.fee > 0
        ? `— Tarifa: $${result.fee.toLocaleString('es-CO')}`
        : '— Sin costo (dentro de las 2 horas gratis)'
      showMessage(
        'success',
        `🚪 SALIDA visitante — Placa ${normalizePlate(plate)} — Tiempo: ${tiempoTexto} ${tarifaTexto} — ${hora}`,
        7000
      )
      resetForm()
    } catch (err) {
      showMessage('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setPlate('')
    setDriverName('')
    setApartmentQuery('')
    setSelectedApartment(null)
    setAutocompleted(false)
  }

  return (
    <div>
      <div style={styles.subTabs}>
        <TabButton small active={mode === 'entry'} onClick={() => { setMode('entry'); resetForm() }}>Entrada</TabButton>
        <TabButton small active={mode === 'exit'} onClick={() => { setMode('exit'); resetForm() }}>Salida</TabButton>
      </div>

      <form onSubmit={mode === 'entry' ? handleEntrySubmit : handleExitSubmit}>
        <label style={styles.label}>Placa</label>
        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          onBlur={mode === 'entry' ? handlePlateBlur : undefined}
          required
          style={styles.input}
          placeholder="Placa del visitante"
          autoCapitalize="characters"
        />

        {mode === 'entry' && (
          <>
            {autocompleted && (
              <p style={styles.autoNote}>✓ Visitante conocido, datos autocompletados</p>
            )}
            <label style={styles.label}>Nombre del conductor (opcional)</label>
            <input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              style={styles.input}
              placeholder="Nombre"
            />

            <label style={styles.label}>Apartamento destino</label>
            <input
              value={apartmentQuery}
              onChange={(e) => handleApartmentSearch(e.target.value)}
              style={styles.input}
              placeholder="Buscar torre o número"
            />
            {apartmentOptions.length > 0 && !selectedApartment && (
              <div style={styles.dropdown}>
                {apartmentOptions.map((apt) => (
                  <div
                    key={apt.id}
                    style={styles.dropdownItem}
                    onClick={() => {
                      setSelectedApartment(apt)
                      setApartmentQuery(`${apt.tower} - ${apt.number}`)
                      setApartmentOptions([])
                    }}
                  >
                    {apt.tower} - {apt.number} ({apt.owner_name})
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button type="submit" disabled={loading} style={{ ...styles.primaryBtn, marginTop: 16, width: '100%' }}>
          {loading ? 'Guardando...' : mode === 'entry' ? 'Registrar entrada' : 'Registrar salida'}
        </button>
      </form>
    </div>
  )
}

function TabButton({ active, onClick, children, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tabBtn,
        ...(active ? styles.tabBtnActive : {}),
        ...(small ? { padding: '8px 16px', fontSize: 13 } : {}),
      }}
    >
      {children}
    </button>
  )
}

function bannerStyle(type) {
  if (type === 'success') return { background: '#dcfce7', color: '#166534' }
  if (type === 'error') return { background: '#fee2e2', color: '#991b1b' }
  return { background: '#fef9c3', color: '#854d0e' }
}

const styles = {
  page: { minHeight: '100vh', background: '#f8fafc', paddingBottom: 40 },
  header: {
    background: '#1e40af', color: '#fff', padding: '16px 20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 700 },
  headerSubtitle: { fontSize: 13, opacity: 0.85 },
  logoutBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
    padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
  },
  tabs: { display: 'flex', gap: 8, padding: 16, background: '#fff', borderBottom: '1px solid #e2e8f0' },
  subTabs: { display: 'flex', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1',
    background: '#fff', color: '#334155', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  tabBtnActive: { background: '#1e40af', color: '#fff', border: '1px solid #1e40af' },
  content: { padding: 20, maxWidth: 480, margin: '0 auto' },
  hint: { color: '#64748b', fontSize: 13, marginBottom: 12 },
  awaitingBox: { padding: 20, background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe' },
  banner: { margin: '0 20px', padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600 },
  searchForm: { display: 'flex', gap: 8 },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #cbd5e1',
    fontSize: 15, boxSizing: 'border-box',
  },
  primaryBtn: {
    padding: '12px 18px', borderRadius: 10, border: 'none', background: '#1e40af',
    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  resultCard: {
    marginTop: 16, padding: 16, borderRadius: 12, background: '#fff',
    border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8,
  },
  label: { fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6, marginTop: 14 },
  autoNote: { fontSize: 12, color: '#166534', marginTop: 6 },
  dropdown: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 4,
    maxHeight: 180, overflowY: 'auto',
  },
  dropdownItem: { padding: '10px 14px', fontSize: 14, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
}