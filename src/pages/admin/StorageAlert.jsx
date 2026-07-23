import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const FREE_TIER_LIMIT_MB = 500
const WARNING_THRESHOLD = 0.8 // 80%

export default function StorageAlert() {
  const [usageMb, setUsageMb] = useState(null)

  useEffect(() => {
    async function checkStorage() {
      const { data, error } = await supabase.rpc('get_database_size_mb')
      if (!error && data != null) setUsageMb(data)
    }
    checkStorage()
  }, [])

  if (usageMb == null) return null

  const percentage = usageMb / FREE_TIER_LIMIT_MB
  if (percentage < WARNING_THRESHOLD) return null

  const isCritical = percentage >= 0.95

  return (
    <div style={{ ...styles.banner, ...(isCritical ? styles.critical : styles.warning) }}>
      ⚠️ El almacenamiento de la base de datos está al <strong>{Math.round(percentage * 100)}%</strong> del
      plan gratuito ({usageMb} MB de {FREE_TIER_LIMIT_MB} MB). Contacta a soporte técnico para archivar
      registros antiguos o ampliar el plan antes de que el sistema deje de recibir nuevos registros.
    </div>
  )
}

const styles = {
  banner: {
    padding: '10px 20px', fontSize: 13, fontWeight: 600, textAlign: 'center',
  },
  warning: { background: '#fef9c3', color: '#854d0e' },
  critical: { background: '#fee2e2', color: '#991b1b' },
}