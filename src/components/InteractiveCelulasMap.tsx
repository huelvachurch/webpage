import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMapsLibrary, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';

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
          <div className="p-2 min-w-[200px] text-sm text-slate-800">
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
              <a href={celula.googleMapsLink} target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-[#2D4B73] text-white rounded-lg py-3 mt-2 hover:bg-[#1e3452] font-bold transition-colors uppercase tracking-wider text-xs">
                Ver en Google Maps
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function InteractiveCelulasMap({ celulas }: { celulas: CelulaMapData[] }) {
  const [openInfoWindowId, setOpenInfoWindowId] = useState<string | null>(null);

  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-[2rem] p-8 md:p-12 text-center h-[500px] w-full max-w-5xl mx-auto">
        <h2 className="text-2xl font-kenao text-primary mb-4">Se requiere Clave de API de Google Maps</h2>
        <p className="text-slate-500 mb-6 max-w-lg text-sm">
          Has solicitado mostrar un mapa interactivo con las ubicaciones de tus células. Para habilitarlo, por favor sigue estos pasos, o de lo contrario solo verás las tarjetas estáticas debajo.
        </p>
        <div className="text-left bg-white p-6 rounded-xl border border-slate-200 text-sm space-y-2 shadow-sm font-medium text-slate-700">
          <p><strong className="text-primary">1.</strong> <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener" className="text-secondary hover:underline">Obtén tu clave de API de Google Maps</a></p>
          <p><strong className="text-primary">2.</strong> Añádela de forma segura como Secreto:</p>
          <ul className="list-disc pl-8 mt-2 space-y-1 text-slate-500 text-xs">
            <li>Abre <strong>Settings</strong> (⚙️ Icono de tuerca en la esquina superior derecha)</li>
            <li>Selecciona <strong>Secrets</strong></li>
            <li>Escribe <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">GOOGLE_MAPS_PLATFORM_KEY</code> y pulsa <strong>Enter</strong></li>
            <li>Pega tu clave secreta de API y pulsa <strong>Enter</strong></li>
          </ul>
        </div>
      </div>
    );
  }

  // Coordenadas centrales de Huelva, Andalucía
  const defaultCenter = { lat: 37.2614, lng: -6.9447 };

  return (
    <div className="w-full h-[500px] md:h-[650px] rounded-[2rem] overflow-hidden shadow-sm border border-slate-200 max-w-5xl mx-auto relative z-10">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={13}
          mapId="HUELVA_CELULAS_MAP"
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
  );
}
