import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Clock, MessageCircle, Instagram, Facebook, Youtube } from 'lucide-react';

export default function Contacto() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Información General',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const mailtoSubject = encodeURIComponent(`[Contacto Web] ${formData.subject} - ${formData.name}`);
    const mailtoBody = encodeURIComponent(
      `Nombre: ${formData.name}\n` +
      `Email: ${formData.email}\n\n` +
      `Mensaje:\n${formData.message}`
    );
    
    window.location.href = `mailto:huelvachurch@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;
    setSubmitted(true);
    
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: 'Información General', message: '' });
    }, 5000);
  };

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-secondary tracking-wider uppercase text-sm font-bold mb-4">Contacto</h2>
          <h1 className="text-5xl md:text-6xl font-kenao text-primary mb-6">Estamos aquí para ti</h1>
          <p className="text-primary/70 text-xl max-w-3xl mx-auto leading-relaxed">
            Si tienes alguna pregunta, necesitas oración o simplemente quieres saber más sobre nuestra iglesia, no dudes en contactarnos.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mt-1">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-kenao text-primary mb-2">Dirección</h4>
                  <p className="text-primary/70 leading-relaxed">
                    <a 
                      href="https://maps.app.goo.gl/WPjd55a8XpctoAgS7" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:text-secondary underline decoration-dotted transition-colors"
                    >
                      Calle De Los Marismeños, 6, Huelva<br/>
                      (arriba del Supermercado El Jamón)
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mt-1">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-kenao text-primary mb-2">Teléfono</h4>
                  <p className="text-primary/70 leading-relaxed">
                    (+34) 621 34 77 21
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mt-1">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-kenao text-primary mb-2">Email</h4>
                  <p className="text-primary/70 leading-relaxed">
                    huelvachurch@gmail.com
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mt-1">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xl font-kenao text-primary mb-2">Celebración Principal</h4>
                  <p className="text-primary/70 leading-relaxed">
                    Domingos<br/>
                    18:30h
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xl font-kenao text-primary mb-6">Nuestras Redes Sociales</h4>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/huelvachurch/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary/40 hover:bg-secondary hover:text-primary transition-all shadow-sm">
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="https://www.facebook.com/huelvachurch" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary/40 hover:bg-secondary hover:text-primary transition-all shadow-sm">
                  <Facebook className="w-6 h-6" />
                </a>
                <a href="https://www.youtube.com/@huelvachurch" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary/40 hover:bg-secondary hover:text-primary transition-all shadow-sm">
                  <Youtube className="w-6 h-6" />
                </a>
                <a href="https://chat.whatsapp.com/KYIoRdfL0lI5TlKKW5o8nN" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary/40 hover:bg-secondary hover:text-primary transition-all shadow-sm">
                  <MessageCircle className="w-6 h-6" />
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-slate-50 p-12 rounded-[3rem] border border-slate-100 shadow-sm"
          >
            <h4 className="text-3xl font-kenao text-primary mb-8">Envíanos un mensaje</h4>
            {submitted ? (
              <div className="bg-green-50 border border-green-200 text-green-800 p-8 rounded-3xl text-center">
                <p className="font-bold text-xl mb-3">¡Formulario Generado!</p>
                <p className="text-sm mb-4 leading-relaxed">Se está abriendo tu cliente de correo electrónico para enviar el mensaje directamente a <strong>huelvachurch@gmail.com</strong>.</p>
                <p className="text-xs text-green-700">Si no se abrió automáticamente, puedes enviarlo directamente a ese email.</p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-primary/80 mb-2">Nombre</label>
                    <input 
                      type="text" 
                      id="name" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white" 
                      placeholder="Tu nombre" 
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-primary/80 mb-2">Email</label>
                    <input 
                      type="email" 
                      id="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white" 
                      placeholder="tu@email.com" 
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-bold text-primary/80 mb-2">Asunto</label>
                  <select 
                    id="subject" 
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white appearance-none"
                  >
                    <option value="Información General">Información General</option>
                    <option value="Petición de Oración">Petición de Oración</option>
                    <option value="Obra Social">Obra Social</option>
                    <option value="Células">Células</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-bold text-primary/80 mb-2">Mensaje</label>
                  <textarea 
                    id="message" 
                    rows={5} 
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all bg-white" 
                    placeholder="¿En qué podemos ayudarte?"
                  ></textarea>
                </div>
                <button type="submit" className="w-full bg-primary text-white font-bold py-5 px-8 rounded-2xl hover:bg-secondary hover:text-primary transition-all transform hover:-translate-y-1 shadow-lg">
                  Enviar Mensaje
                </button>
              </form>
            )}
          </motion.div>
        </div>

        {/* Real Interactive Map */}
        <div className="aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl bg-slate-200 relative border border-slate-100">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3175.7196614761005!2d-6.936070624090234!3d37.27807757211116!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd11cf098dfc3383%3A0x6a053c8f8b394dc!2sCalle%20de%20los%20Marisme%C3%B1os%2C%206%2C%2021005%20Huelva%2C%20Spain!5e0!3m2!1sen!2ses!4v1712345678901!5m2!1sen!2ses"
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen={true} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa de ubicación"
            className="absolute inset-0 w-full h-full"
          ></iframe>
          <div className="absolute bottom-6 left-6 z-10">
            <a 
              href="https://maps.app.goo.gl/WPjd55a8XpctoAgS7"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary text-white font-bold py-3.5 px-6 rounded-2xl hover:bg-secondary hover:text-primary transition-all shadow-xl text-sm inline-flex items-center gap-2 border border-white/10"
            >
              <MapPin className="w-4 h-4 text-secondary fill-secondary" />
              Abrir en Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
