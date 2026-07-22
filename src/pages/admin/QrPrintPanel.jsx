import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { getAllVehiclesForQrPrinting } from '../../lib/adminLogic'

export default function QrPrintPanel() {
  const [vehicles, setVehicles] = useState([])
  const [qrImages, setQrImages] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await getAllVehiclesForQrPrinting()
      setVehicles(data)

      const images = {}
      for (const v of data) {
        images[v.id] = await QRCode.toDataURL(v.qr_code, { width: 200, margin: 1 })
      }
      setQrImages(images)
      setLoading(false)
    }
    load()
  }, [])

  function handlePrint() {
    window.print()
  }

  if (loading) return <p>Generando códigos QR...</p>

  return (
    <div>
      <div style={styles.headerRow} className="no-print">
        <h2 style={styles.h2}>QR para imprimir — {vehicles.length} vehículo(s)</h2>
        <button onClick={handlePrint} style={styles.printBtn}>Imprimir todos</button>
      </div>
      <p style={styles.text} className="no-print">
        Cada tarjeta corresponde a un vehículo. Recórtalas y pégalas sobre el carnet
        existente del conductor. El código no contiene la placa directamente, así que
        si necesitas reemplazar un QR dañado, elimina el vehículo viejo y créalo de nuevo
        (o contáctame para agregar función de "regenerar QR").
      </p>

      <div style={styles.grid} id="print-area">
        {vehicles.map((v) => (
          <div key={v.id} style={styles.card}>
            <img src={qrImages[v.id]} alt="QR" style={styles.qrImg} />
            <p style={styles.plate}>{v.plate}</p>
            <p style={styles.apto}>{v.apartments.tower} - {v.apartments.number}</p>
            <p style={styles.owner}>{v.apartments.owner_name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  h2: { fontSize: 18, fontWeight: 700, color: '#1e293b' },
  text: { fontSize: 13, color: '#64748b', marginBottom: 20, maxWidth: 600 },
  printBtn: { padding: '10px 16px', borderRadius: 8, border: 'none', background: '#1e40af', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 },
  card: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12,
    textAlign: 'center', pageBreakInside: 'avoid',
  },
  qrImg: { width: '100%', maxWidth: 140 },
  plate: { fontWeight: 700, fontSize: 14, marginTop: 6 },
  apto: { fontSize: 12, color: '#475569' },
  owner: { fontSize: 11, color: '#94a3b8' },
}