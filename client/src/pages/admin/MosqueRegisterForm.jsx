import { useState, useEffect, useRef } from 'react'
import { useLang }   from '../../context/LangContext.jsx'
import { useToast }  from '../../components/ui/Toast.jsx'
import { useAreas }  from '../../hooks/useAreas.js'
import { mosquesApi } from '../../lib/api.js'
import Card          from '../../components/ui/Card.jsx'
import Button        from '../../components/ui/Button.jsx'
import './AdminPanel.css'

// Leaflet loaded via CDN in index.html — accessed as window.L
function MosqueRegisterForm() {
  const { t }   = useLang()
  const toast   = useToast()
  const mapRef  = useRef(null)
  const markerRef = useRef(null)
  const { areas } = useAreas(1)

  const [form,    setForm]    = useState({
    name: '', name_roman: '', area_id: '', lat: '', lng: ''
  })
  const [loading, setLoading] = useState(false)

  // Init Leaflet map after mount
  useEffect(() => {
    if (mapRef.current._leaflet_id) return // already initialised

    const map = window.L.map(mapRef.current).setView([24.8607, 67.0011], 13)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    map.on('click', e => {
      const { lat, lng } = e.latlng
      setForm(prev => ({ ...prev, lat: lat.toFixed(7), lng: lng.toFixed(7) }))
      if (markerRef.current) markerRef.current.setLatLng(e.latlng)
      else markerRef.current = window.L.marker(e.latlng).addTo(map)
    })
  }, [])

  function handleChange(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit() {
    if (!form.name || !form.area_id || !form.lat || !form.lng) {
      toast({ message: 'Name, area, and map pin required', type: 'error' })
      return
    }
    setLoading(true)
    try {
      await mosquesApi.create({
        name:       form.name,
        name_roman: form.name_roman || null,
        area_id:    Number(form.area_id),
        lat:        parseFloat(form.lat),
        lng:        parseFloat(form.lng),
      })
      // Bust mosque cache so home page picks up new entry
      sessionStorage.removeItem('mosques_cache')
      toast({ message: 'Mosque registered', type: 'success' })
      setForm({ name: '', name_roman: '', area_id: '', lat: '', lng: '' })
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
    } catch (err) {
      toast({ message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="admin__form-title">Register Mosque</h2>

      <Card className="admin__form-card">
        <div className="admin__field">
          <label className="admin__label">Name (Urdu / Arabic)</label>
          <input type="text" className="admin__input"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="مسجد کا نام"
          />
        </div>
        <div className="admin__field">
          <label className="admin__label">Name (Roman / English)</label>
          <input type="text" className="admin__input"
            value={form.name_roman}
            onChange={e => handleChange('name_roman', e.target.value)}
            placeholder="Masjid name in English"
          />
        </div>
        <div className="admin__field">
          <label className="admin__label">Area</label>
          <select className="admin__input"
            value={form.area_id}
            onChange={e => handleChange('area_id', e.target.value)}
          >
            <option value="">Select area...</option>
            {areas.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Leaflet map — click to drop pin */}
      <div className="admin__map-label">
        Tap the map to pin the mosque location
      </div>
      <div ref={mapRef} className="admin__map" aria-label="Map to pin mosque location" />

      {form.lat && (
        <p className="admin__coords">
          Pinned: {form.lat}, {form.lng}
        </p>
      )}

      <Button
        variant="primary"
        fullWidth
        loading={loading}
        onClick={handleSubmit}
        className="admin__submit-btn"
      >
        Register Mosque
      </Button>
    </div>
  )
}

export default MosqueRegisterForm