import * as XLSX from 'xlsx'

// Lee un archivo Excel/CSV y lo convierte en un array de objetos JS
export function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        resolve(json)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}

// Genera y descarga un archivo Excel a partir de un array de objetos
export function downloadAsExcel(data, filename = 'reporte.xlsx', sheetName = 'Datos') {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename)
}

// Plantilla de ejemplo para que la administración sepa cómo llenar el Excel de residentes
export function downloadResidentTemplate() {
  const sample = [
    { torre: 'Torre 1', apartamento: '101', propietario: 'Juan Pérez', telefono: '3001234567', placa: 'ABC123', tipo_vehiculo: 'carro' },
    { torre: 'Torre 1', apartamento: '101', propietario: 'Juan Pérez', telefono: '3001234567', placa: 'XYZ987', tipo_vehiculo: 'moto' },
  ]
  downloadAsExcel(sample, 'plantilla_residentes.xlsx', 'Residentes')
}
