import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMapsLibrary, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { MapPin, User, Clock, ExternalLink, AlertTriangle, Map as MapIcon, LayoutGrid } from 'lucide-react';

export interface CelulaMapData {
  id: string;
  leader: string;
  name?: string;
  address: string;
  barriada: string;
  ciudad: string;
  schedule: string;
  googleMapsLink?: string;
  lugar?: string;
  municipio?: string;
  lugarDetalle?: string;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

function GeocodedMarker({ celula, setOpenInfoWindow, isOpen }: { celula: CelulaMapData, setOpenInfoWindow: (id: string | null) => void, isOpen: boolean }) {
  const geocodingLib = useMapsLibrary('geocoding');
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    if (!geocodingLib) return;
    const geocoder = new geocodingLib.Geocoder();
    
    // Resolve address dynamically based on 'lugar' option selected
    let fullAddress = '';
    if (celula.lugar === 'Ciudad de Huelva') {
      fullAddress = `${celula.address}, ${celula.barriada || ''}, Huelva, España`;
    } else if (celula.lugar === 'Otro Municipio de Huelva') {
      fullAddress = `${celula.address}, ${celula.municipio || ''}, Huelva, España`;
    } else if (celula.lugar === 'Sevilla') {
      fullAddress = `${celula.address}, Sevilla, España`;
    } else if (celula.lugar === 'Portugal') {
      fullAddress = `${celula.address}, Portugal`;
    } else if (celula.lugar === 'Otro') {
      fullAddress = `${celula.address}, ${celula.lugarDetalle || ''}`;
    } else {
      // Robust backwards compatibility fallback
      fullAddress = `${celula.address}, ${celula.barriada || ''}, ${celula.ciudad || 'Huelva'}, España`;
    }
    
    geocoder.geocode({ address: fullAddress }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setPosition({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        });
      } else {
        console.warn('Geocoding failed for', fullAddress, status);
      }
    });
  }, [geocodingLib, celula]);

  if (!position) return null;

  return (
    <>
      <AdvancedMarker ref={markerRef} position={position} onClick={() => setOpenInfoWindow(isOpen ? null : celula.id)}>
        <Pin background="#2D4B73" glyphColor="#fff" borderColor="#1e3452" />
      </AdvancedMarker>
      {isOpen && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpenInfoWindow(null)} headerContent={celula.name || 'Célula de Grupo'}>
          <div className="p-2 min-w-[220px] text-sm text-slate-800 font-gordita">
            <p className="mb-1"><strong className="text-secondary font-kenao tracking-widest text-base">Líder/Líderes:</strong> <span className="font-semibold text-slate-700">{celula.leader}</span></p>
            <p className="mb-1"><strong className="text-secondary font-kenao tracking-widest text-base">Día y Hora:</strong> <span className="font-semibold text-slate-700">{celula.schedule}</span></p>
            <p className="mb-1"><strong className="text-secondary font-kenao tracking-widest text-base">Dirección:</strong> <span className="font-semibold text-slate-700">{celula.address}</span></p>
            
            {/* Dynamic visual representation based on place type */}
            {(!celula.lugar || celula.lugar === 'Ciudad de Huelva') && (
              <p className="mb-3"><strong className="text-secondary font-kenao tracking-widest text-base">Barriada:</strong> <span className="font-semibold text-slate-700">{celula.barriada}</span></p>
            )}
            {celula.lugar === 'Otro Municipio de Huelva' && (
              <p className="mb-3"><strong className="text-secondary font-kenao tracking-widest text-base">Municipio:</strong> <span className="font-semibold text-slate-700">{celula.municipio}</span></p>
            )}
            {celula.lugar === 'Sevilla' && (
              <p className="mb-3"><strong className="text-secondary font-kenao tracking-widest text-base">Ciudad:</strong> <span className="font-semibold text-slate-700">Sevilla</span></p>
            )}
            {celula.lugar === 'Portugal' && (
              <p className="mb-3"><strong className="text-secondary font-kenao tracking-widest text-base">País:</strong> <span className="font-semibold text-slate-700">Portugal</span></p>
            )}
            {celula.lugar === 'Otro' && (
              <p className="mb-3"><strong className="text-secondary font-kenao tracking-widest text-base">Lugar:</strong> <span className="font-semibold text-slate-700">{celula.lugarDetalle}</span></p>
            )}
            
            {celula.googleMapsLink && (
              <a href={celula.googleMapsLink} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-[#2D4B73] text-white rounded-lg py-2.5 mt-2 hover:bg-[#1e3452] font-bold transition-colors uppercase tracking-wider text-xs">
                Ver en Google Maps
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function CelulasCardsList({ celulas }: { celulas: CelulaMapData[] }) {
  const getGoogleMapsLink = (c: CelulaMapData) => {
    if (c.googleMapsLink && c.googleMapsLink.trim().length > 0) return c.googleMapsLink;
    const query = encodeURIComponent(`${c.address}, ${c.barriada || c.municipio || 'Huelva'}, España`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
      {celulas.map((celula) => (
        <div 
          key={celula.id} 
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-kenao text-xl text-primary">{celula.name || 'Célula de Grupo'}</h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {celula.barriada || celula.municipio || celula.ciudad || 'Huelva'}
              </span>
            </div>

            <div className="space-y-2 text-sm text-slate-600 mb-6 font-gordita">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-secondary shrink-0" />
                <span className="font-medium text-slate-800">{celula.leader}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-secondary shrink-0" />
                <span>{celula.schedule}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <span>{celula.address}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
            <a
              href={getGoogleMapsLink(celula)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#2D4B73] hover:bg-[#1e3452] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-colors uppercase tracking-wider"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver en Maps</span>
            </a>
            <button
              type="button"
              onClick={() => {
                const formEl = document.getElementById('join-form');
                if (formEl) {
                  formEl.scrollIntoView({ behavior: 'smooth' });
                  // Try to select cell in form dropdown
                  const selectEl = formEl.querySelector('select') as HTMLSelectElement | null;
                  if (selectEl && celula.name) {
                    selectEl.value = celula.name;
                    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }
              }}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors uppercase tracking-wider"
            >
              Unirme
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InteractiveCelulasMap({ celulas }: { celulas: CelulaMapData[] }) {
  const [openInfoWindowId, setOpenInfoWindowId] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');

  // Listen for Google Maps authentication failures (e.g., RefererNotAllowedMapError)
  useEffect(() => {
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps auth error detected (gm_authFailure). Possible cause: HTTP Referrer restrictions in Google Cloud Console.');
      setAuthError(true);
      if (typeof prevAuthFailure === 'function') {
        prevAuthFailure();
      }
    };
    return () => {
      (window as any).gm_authFailure = prevAuthFailure;
    };
  }, []);

  if (!hasValidKey) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-[2rem] p-8 md:p-12 text-center w-full">
          <h2 className="text-2xl font-kenao text-primary mb-4">Se requiere Clave de API de Google Maps</h2>
          <p className="text-slate-500 mb-6 max-w-lg text-sm font-gordita">
            Para ver el mapa interactivo se necesita una clave de Google Maps configurada. A continuación puedes consultar todas las ubicaciones de nuestras células:
          </p>
          <div className="text-left bg-white p-6 rounded-xl border border-slate-200 text-sm space-y-2 shadow-sm font-medium text-slate-700 max-w-md w-full mb-6">
            <p><strong className="text-primary">1.</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp_mcp_codeassist_v1_aistudio" target="_blank" rel="noopener" className="text-secondary hover:underline">Obtén tu clave de API de Google Maps</a></p>
            <p><strong className="text-primary">2.</strong> Añádela como Secreto: <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">GOOGLE_MAPS_PLATFORM_KEY</code></p>
          </div>
        </div>
        <CelulasCardsList celulas={celulas} />
      </div>
    );
  }

  // Current domain helper for diagnostic advice
  const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://huelvachurch.ai.studio';

  // Coordenadas centrales de Huelva, Andalucía
  const defaultCenter = { lat: 37.2614, lng: -6.9447 };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Switcher & Counter Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'map' && !authError
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Mapa Interactivo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'list' || authError
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Lista de Células ({celulas.length})</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-gordita">
          Mostrando <strong>{celulas.length}</strong> {celulas.length === 1 ? 'ubicación activa' : 'ubicaciones activas'}
        </span>
      </div>

      {/* Domain authorization warning banner if Google Maps rejected the domain */}
      {authError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900 shadow-sm font-gordita">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <h4 className="font-bold text-base text-amber-950">
                Aviso para administradores: Autorización de Dominio en Google Cloud
              </h4>
              <p className="text-amber-800">
                Google Maps no ha podido cargar el mapa en esta URL (error <code>RefererNotAllowedMapError</code>). Esto ocurre cuando la clave de API tiene restricciones de sitios web (HTTP referrers) en Google Cloud Console que no incluyen el dominio actual:
              </p>
              <div className="bg-white/80 border border-amber-200 rounded-xl p-3 font-mono text-xs text-slate-800 break-all select-all">
                {currentDomain}/*
              </div>
              <p className="text-xs text-amber-800">
                <strong>Cómo solucionarlo en 1 minuto:</strong>
              </p>
              <ol className="list-decimal pl-5 text-xs text-amber-800 space-y-1">
                <li>Ve a <a href="https://console.cloud.google.com/apis/credentials?utm_campaign=gmp_mcp_codeassist_v1_aistudio" target="_blank" rel="noopener noreferrer" className="underline font-bold text-secondary">Google Cloud Console &gt; Credenciales</a>.</li>
                <li>Edita tu clave de API de Google Maps.</li>
                <li>En <strong>Restricciones de aplicaciones &gt; Sitios web (referentes HTTP)</strong>, añade:
                  <ul className="list-disc pl-4 mt-1 font-mono text-[11px] text-slate-700">
                    <li><code>https://huelvachurch.ai.studio/*</code></li>
                    <li><code>*.ai.studio/*</code></li>
                  </ul>
                </li>
                <li>Guarda los cambios (tardan unos 2-5 minutos en propagarse en los servidores de Google).</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Map or Cards List */}
      {activeTab === 'map' && !authError ? (
        <div className="w-full h-[500px] md:h-[650px] rounded-[2rem] overflow-hidden shadow-sm border border-slate-200 relative z-10 bg-slate-100">
          <APIProvider 
            apiKey={API_KEY} 
            version="weekly"
            onError={() => {
              console.warn('APIProvider load error, falling back gracefully');
              setAuthError(true);
            }}
          >
            <Map
              defaultCenter={defaultCenter}
              defaultZoom={13}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: '100%', height: '100%' }}
            >
              {celulas.map(celula => (
                <GeocodedMarker 
                  key={celula.id} 
                  celula={celula} 
                  isOpen={openInfoWindowId === celula.id}
                  setOpenInfoWindow={setOpenInfoWindowId}
                />
              ))}
            </Map>
          </APIProvider>
        </div>
      ) : (
        <CelulasCardsList celulas={celulas} />
      )}
    </div>
  );
}

