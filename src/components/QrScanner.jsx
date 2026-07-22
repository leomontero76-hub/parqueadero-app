import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

// Componente de escaneo de QR. Llama a onScan(texto) cada vez que detecta un código.
// El padre decide qué hacer (buscar vehículo, mostrar error, etc.) y puede
// pausar/reanudar el escaneo para evitar lecturas duplicadas seguidas.
export default function QrScanner({ onScan, active = true }) {
  const scannerRef = useRef(null)
  const isRunningRef = useRef(false)
  const containerId = 'qr-reader-container'
  const [cameraError, setCameraError] = useState(null)

  useEffect(() => {
    if (!active) return
    setCameraError(null)

    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner
    const hasScannedRef = { current: false } // bloqueo inmediato, no depende de React

    const qrSuccessCallback = (decodedText) => {
      // Bloqueo síncrono: apenas se detecta el primer QR válido, se ignora
      // cualquier otro frame que llegue después, sin esperar a que React
      // procese el resultado ni a que la cámara termine de detenerse.
      if (hasScannedRef.current) return
      hasScannedRef.current = true

      // Pausa el reconocimiento de inmediato (la imagen de la cámara puede
      // seguir visible un instante, pero deja de intentar leer códigos).
      try {
        scanner.pause(true)
      } catch (e) {
        // Si ya se estaba deteniendo, ignoramos el error
      }

      onScan(decodedText)
    }
    const qrErrorCallback = () => {
      // Errores de "no se detectó QR en este frame" son normales, se ignoran.
    }
    const config = { fps: 10, qrbox: { width: 250, height: 250 } }

    // Intenta primero con cámara trasera (celulares). Si falla (ej: un
    // computador sin cámara trasera), reintenta con cualquier cámara disponible.
    scanner
      .start({ facingMode: 'environment' }, config, qrSuccessCallback, qrErrorCallback)
      .then(() => {
        isRunningRef.current = true
      })
      .catch(() => {
        return scanner
          .start({ facingMode: 'user' }, config, qrSuccessCallback, qrErrorCallback)
          .then(() => {
            isRunningRef.current = true
          })
      })
      .catch((err) => {
        console.error('No se pudo iniciar ninguna cámara:', err)
        setCameraError(
          'No se pudo acceder a la cámara. Verifica que el navegador tenga permiso ' +
          'de cámara y que no esté siendo usada por otra aplicación.'
        )
      })

    return () => {
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current.clear())
          .catch(() => {})
        isRunningRef.current = false
      }
    }
  }, [active])

  if (cameraError) {
    return (
      <div style={{
        padding: 20, background: '#fef2f2', border: '1px solid #fecaca',
        borderRadius: 12, color: '#991b1b', fontSize: 14,
      }}>
        ⚠️ {cameraError}
        <br /><br />
        Mientras lo resuelves, puedes usar la pestaña "Buscar placa" para registrar entradas y salidas.
      </div>
    )
  }

  return <div id={containerId} style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }} />
}