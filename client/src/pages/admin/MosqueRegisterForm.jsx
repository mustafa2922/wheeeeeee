import { useState, useEffect, useRef } from 'react'
import { useToast }  from '../../components/ui/Toast.jsx'
import { useAuth }   from '../../context/AuthContext.jsx'
import { useAreas }  from '../../hooks/useAreas.js'
import { mosquesApi } from '../../lib/api.js'
import Button        from '../../components/ui/Button.jsx'
import './MosqueRegister.css'

function MosqueRegisterForm({ onSuccess }) {
  const toast   = useToast()
  const mapRef  = useRef(null)
  const markerRef = useRef(null)
  const { role } = useAuth()
  const isSuper = role?.role === 'super_admin'
  const myCityId = role?.city_id

  const [countries, setCountries] = useState([])
  const [cities, setCities]       = useState([])
  const [selectedCountryId, setSelectedCountryId] = useState('')
  const [selectedCityId, setSelectedCityId]       = useState(isSuper ? '' : myCityId)
  
  const { areas } = useAreas(selectedCityId || 0)

  const [step,    setStep]    = useState(0)
  const [form,    setForm]    = useState({
    name: '', name_roman: '', area_id: '', lat: '', lng: ''
  })
  const [loading, setLoading] = useState(false)

  // 1. Initial Load: Fetch Countries for Super Admin or Resolve Admin's Territory
  useEffect(() => {
    if (isSuper) {
      mosquesApi.getCountries().then(setCountries)
    } else {
      mosquesApi.getCityDetail(myCityId).then(data => {
        if (data) {
          setSelectedCountryId(data.country_id)
          setCities([data])
        }
      })
    }
  }, [isSuper, myCityId])

  // 2. Drill Down: Fetch Cities when Country changes
  useEffect(() => {
    if (selectedCountryId) {
      setCities([])
      setSelectedCityId('')
      setForm(prev => ({ ...prev, area_id: '' }))
      mosquesApi.getCities(selectedCountryId).then(setCities)
    }
  }, [selectedCountryId])

  // 3. Init Leaflet map
  useEffect(() => {
    if (step === 1 && mapRef.current && !mapRef.current._leaflet_id) {
       const map = window.L.map(mapRef.current).setView([24.8607, 67.0011], 13)
       window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution: '© OSM'
       }).addTo(map)

       map.on('click', e => {
         const { lat, lng } = e.latlng
         setForm(prev => ({ ...prev, lat: lat.toFixed(7), lng: lng.toFixed(7) }))
         if (markerRef.current) markerRef.current.setLatLng(e.latlng)
         else markerRef.current = window.L.marker(e.latlng).addTo(map)
       })
    }
  }, [step])

  function handleChange(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit() {
    if (!form.lat || !form.lng) {
      toast({ message: 'Tap the map to set a location', type: 'error' })
      return
    }
    setLoading(true)
    try {
      await mosquesApi.create({
        name:       form.name,
        name_roman: form.name_roman || null,
        area_id:    Number(form.area_id),
        city_id:    Number(selectedCityId),
        country_id: Number(isSuper ? selectedCountryId : countries[0]?.id || 1), // Fallback logic
        lat:        parseFloat(form.lat),
        lng:        parseFloat(form.lng),
      })
      toast({ message: 'Masjid successfully established', type: 'success' })
      if (onSuccess) onSuccess()
    } catch (err) {
      toast({ message: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const identityValid = form.name && form.area_id && selectedCityId

  return (
    <div className="mosque-reg">
      <div className="mosque-reg__progress">
        <div className={`mosque-reg__pill ${step === 0 ? 'mosque-reg__pill--active' : ''}`} />
        <div className={`mosque-reg__pill ${step === 1 ? 'mosque-reg__pill--active' : ''}`} />
      </div>

      <div className="mosque-reg__steps" style={{ transform: `translateX(-${step * 50}%)` }}>
        
        <div className="mosque-reg__step">
          <p className="mosque-reg__helper">Assign the full territorial hierarchy</p>
          <div className="mosque-reg__grid">
            <div className="super__form-group">
              <label className="super__form-label">Masjid Name</label>
              <input type="text" className="super__form-input"
                value={form.name} placeholder="e.g. Masjid Al-Noor"
                onChange={e => handleChange('name', e.target.value)}
              />
            </div>

            {/* Tier 1: Country (Super Only) */}
            {isSuper && (
              <div className="super__form-group">
                <label className="super__form-label">Country</label>
                <select className="super__form-input"
                  value={selectedCountryId}
                  onChange={e => setSelectedCountryId(e.target.value)}
                >
                  <option value="">Select country...</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {/* Tier 2: City */}
            <div className="super__form-group">
              <label className="super__form-label">City</label>
              {isSuper ? (
                <select className="super__form-input"
                  value={selectedCityId}
                  onChange={e => { setSelectedCityId(e.target.value); handleChange('area_id', '') }}
                  disabled={!selectedCountryId}
                >
                  <option value="">Select city...</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input className="super__form-input" value="Your Assigned City" disabled />
              )}
            </div>

            {/* Tier 3: Neighborhood */}
            <div className="super__form-group">
              <label className="super__form-label">Neighborhood / Area</label>
              {!selectedCityId ? (
                <p className="mosque-reg__helper" style={{ fontSize: '11px', marginTop: '4px' }}>
                  Please select a city to see areas.
                </p>
              ) : areas.length === 0 ? (
                <p style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 700, marginTop: '8px' }}>
                  ⚠ No areas in this city. Add one in Systems Tab.
                </p>
              ) : (
                <select className="super__form-input"
                  value={form.area_id}
                  onChange={e => handleChange('area_id', e.target.value)}
                >
                  <option value="">Select area...</option>
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="mosque-reg__footer">
            <Button variant="primary" fullWidth onClick={() => setStep(1)} disabled={!identityValid}>
              Continue to Map
            </Button>
          </div>
        </div>

        <div className="mosque-reg__step">
          <p className="mosque-reg__helper">Precisely pin the location</p>
          <div className="mosque-reg__map-container">
            <div className="mosque-reg__hud">
                <span>GEO-TARGETING</span>
                <span>{form.lat ? `${form.lat}, ${form.lng}` : 'WAITING FOR PIN...'}</span>
            </div>
            <div ref={mapRef} className="mosque-reg__map" />
          </div>
          <div className="mosque-reg__footer">
            <button className="super__confirm-btn super__confirm-btn--cancel" style={{ width: '40%' }} onClick={() => setStep(0)}>
              Back
            </button>
            <Button variant="primary" fullWidth loading={loading} onClick={handleSubmit} disabled={!form.lat}>
              Confirm Registration
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default MosqueRegisterForm