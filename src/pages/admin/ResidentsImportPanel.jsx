import { useState } from 'react'
import { readExcelFile, downloadResidentTemplate } from '../../lib/excelUtils'
import { bulkImportResidents } from '../../lib/adminLogic'

export default function ResidentsImportPanel() {
  const [fileName, setFileName] = useState(null)
  const [preview, setPreview] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setSummary(null)
    try {
      const rows = await readExcelFile(file)
      setPreview(rows)
    } catch (err) {
      alert('No se pudo leer el archivo: ' + err.message)
    }
  }

  async function handleImport() {
    if (preview.length === 0) return
    setLoading(true)
    try {
      const result = await bulkImportResidents(preview)
      setSummary(result)
      setPreview([])
      setFileName(null)
    } catch (err) {
      alert('Error en la importación: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={styles.h2}>Cargar residentes y vehículos</h2>
      <p style={styles.text}>
        Sube un Excel con las columnas: <strong>torre, apartamento, propietario, telefono, placa, tipo_vehiculo</strong>.
        Un mismo apartamento puede repetirse en varias filas si tiene más de un vehículo.
        El sistema genera automáticamente el código QR de cada vehículo.
      </p>

      <button onClick={downloadResidentTemplate} style={styles.templateBtn}>
        Descargar plantilla de ejemplo
      </button>

      <div style={styles.uploadBox}>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
        {fileName && <p style={styles.fileName}>{fileName} — {preview.length} filas detectadas</p>}
      </div>

      {preview.length > 0 && (
        <>
          <div style={styles.previewBox}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {Object.keys(preview[0]).map((key) => (
                    <th key={key} style={styles.th}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 8).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={styles.td}>{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 8 && <p style={styles.moreRows}>... y {preview.length - 8} filas más</p>}
          </div>

          <button onClick={handleImport} disabled={loading} style={styles.importBtn}>
            {loading ? 'Importando...' : `Confirmar importación (${preview.length} filas)`}
          </button>
        </>
      )}

      {summary && (
        <div style={styles.summaryBox}>
          <p>✅ Creados: <strong>{summary.created}</strong></p>
          <p>⏭️ Omitidos (placa ya existía): <strong>{summary.skipped}</strong></p>
          {summary.errors.length > 0 && (
            <>
              <p style={{ color: '#dc2626' }}>⚠️ Errores: {summary.errors.length}</p>
              <ul style={{ fontSize: 12, color: '#991b1b', maxHeight: 150, overflowY: 'auto' }}>
                {summary.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  h2: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 },
  text: { fontSize: 14, color: '#475569', marginBottom: 16, lineHeight: 1.5 },
  templateBtn: { padding: '10px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', marginBottom: 16 },
  uploadBox: { padding: 20, border: '2px dashed #cbd5e1', borderRadius: 12, marginBottom: 16, background: '#fff' },
  fileName: { marginTop: 10, fontSize: 13, color: '#166534' },
  previewBox: { overflowX: 'auto', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', fontSize: 13 },
  th: { textAlign: 'left', padding: 8, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' },
  td: { padding: 8, borderBottom: '1px solid #f1f5f9' },
  moreRows: { fontSize: 12, color: '#64748b', marginTop: 8 },
  importBtn: { padding: '12px 20px', borderRadius: 10, border: 'none', background: '#1e40af', color: '#fff', fontWeight: 600, cursor: 'pointer' },
  summaryBox: { marginTop: 16, padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' },
}
