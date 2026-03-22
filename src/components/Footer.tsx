import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-primary text-white/70 py-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-baseline gap-1 mb-4 text-white">
              <span className="font-kenao text-2xl">Huelva</span>
              <span className="font-gordita text-2xl font-light">Church</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Llevando el mensaje de esperanza y el amor de Jesucristo a la ciudad de Huelva y más allá.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4 uppercase tracking-wider text-sm">Enlaces Rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-secondary transition-colors">Inicio</Link></li>
              <li><Link to="/nosotros" className="hover:text-secondary transition-colors">Nosotros</Link></li>
              <li><Link to="/actividades" className="hover:text-secondary transition-colors">Actividades</Link></li>
              <li><Link to="/dar" className="hover:text-secondary transition-colors">Dar</Link></li>
              <li><Link to="/contacto" className="hover:text-secondary transition-colors">Contacto</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4 uppercase tracking-wider text-sm">Horarios</h4>
            <ul className="space-y-2 text-sm">
              <li>Domingos: 18:30h - Culto Principal</li>
              <li>Miércoles: 19:30h - Estudio Bíblico</li>
              <li>Sábados: 19:00h - Jóvenes</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>&copy; {new Date().getFullYear()} HuelvaChurch. Todos los derechos reservados.</p>
          <p className="mt-2 md:mt-0">Diseñado con amor para Huelva.</p>
        </div>
      </div>
    </footer>
  );
}
