import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import OccupancyPanel from './admin/OccupancyPanel'
import ResidentsImportPanel from './admin/ResidentsImportPanel'
import QrPrintPanel from './admin/QrPrintPanel'
import GuardsPanel from './admin/GuardsPanel'
import ParkingSpotsPanel from './admin/ParkingSpotsPanel'
import AlertsPanel from './admin/AlertsPanel'
import HistoryPanel from './admin/HistoryPanel'
import StorageAlert from './admin/StorageAlert'

const SECTIONS = [
  { id: 'occupancy', label: 'Aforo actual', component: OccupancyPanel },
  { id: 'history', label: 'Historial', component: HistoryPanel },
  { id: 'alerts', label: 'Alertas', component: AlertsPanel },
  { id: 'residents', label: 'Cargar residentes', component: ResidentsImportPanel },
  { id: 'qr', label: 'Imprimir QR', component: QrPrintPanel },
  { id: 'parking', label: 'Parqueaderos', component: ParkingSpotsPanel },
  { id: 'guards', label: 'Guardias', component: GuardsPanel },
]

export default function AdminDashboard() {
  const { profile, logout } = useAuth()
  const [activeSection, setActiveSection] = useState('occupancy')

  const ActiveComponent = SECTIONS.find((s) => s.id === activeSection)?.component

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>🅿️ Parqueadero</div>
          <div style={styles.adminName}>{profile?.full_name}</div>
        </div>
        <nav style={styles.nav}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{ ...styles.navItem, ...(activeSection === s.id ? styles.navItemActive : {}) }}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <button onClick={logout} style={styles.logoutBtn}>Cerrar sesión</button>
      </aside>

      <main style={styles.mainWrapper}>
        <StorageAlert />
        <div style={styles.content}>
          {ActiveComponent && <ActiveComponent />}
        </div>
      </main>
    </div>
  )
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', background: '#f8fafc' },
  sidebar: {
    width: 220, background: '#0f172a', color: '#fff', display: 'flex',
    flexDirection: 'column', padding: 20, flexShrink: 0,
  },
  sidebarHeader: { marginBottom: 24 },
  logo: { fontSize: 17, fontWeight: 700 },
  adminName: { fontSize: 12, opacity: 0.6, marginTop: 4 },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: {
    textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none',
    background: 'transparent', color: '#cbd5e1', fontSize: 14, cursor: 'pointer',
  },
  navItemActive: { background: '#1e40af', color: '#fff', fontWeight: 600 },
  logoutBtn: {
    marginTop: 20, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155',
    background: 'transparent', color: '#cbd5e1', fontSize: 13, cursor: 'pointer',
  },
  content: { flex: 1, padding: 28, overflowX: 'auto' },
  mainWrapper: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
}