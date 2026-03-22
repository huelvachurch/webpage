import { Post } from '../types';

export const posts: Post[] = [
  {
    id: 'campamento-verano-2024',
    title: "Campamento de Verano 2024",
    excerpt: "Ya están abiertas las inscripciones para nuestro campamento anual. ¡No te lo pierdas!",
    content: `
      <p>Estamos muy emocionados de anunciar que las inscripciones para nuestro Campamento de Verano 2024 ya están abiertas. Este año, nuestro tema es "Caminando en la Luz".</p>
      <p>Será una semana llena de aventuras, compañerismo, estudio de la Biblia y crecimiento espiritual en un entorno natural increíble.</p>
      <h3>Detalles del Evento:</h3>
      <ul>
        <li><strong>Fecha:</strong> 15 al 21 de Julio, 2024</li>
        <li><strong>Lugar:</strong> Sierra de Huelva</li>
        <li><strong>Edades:</strong> 12 a 17 años</li>
      </ul>
      <p>No pierdas la oportunidad de vivir una experiencia transformadora. ¡Inscríbete hoy mismo!</p>
    `,
    date: "20 Mar 2024",
    category: "Eventos",
    tags: ["Campamento", "Jóvenes", "Verano"],
    image: "https://images.unsplash.com/photo-1523580494112-071d16940d14?auto=format&fit=crop&q=80&w=800",
    featured: true
  },
  {
    id: 'nuevo-horario-estudio-biblico',
    title: "Nuevo horario de Estudio Bíblico",
    excerpt: "A partir del próximo mes, nos reuniremos los jueves a las 20:00h para profundizar en la Palabra.",
    content: `
      <p>Queremos informar a toda la congregación sobre el cambio de horario en nuestras reuniones de Estudio Bíblico.</p>
      <p>A partir del próximo mes de Abril, nos reuniremos todos los jueves a las 20:00h en el salón principal de la iglesia.</p>
      <p>Este tiempo es fundamental para nuestro crecimiento espiritual, donde profundizamos en las Escrituras y compartimos nuestras reflexiones en comunidad.</p>
      <p>¡Te esperamos!</p>
    `,
    date: "15 Mar 2024",
    category: "Anuncios",
    tags: ["Estudio Bíblico", "Crecimiento", "Palabra"],
    image: "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&q=80&w=800",
    featured: true
  },
  {
    id: 'proyecto-huelva-sonrie',
    title: "Proyecto Huelva Sonríe",
    excerpt: "Gracias a todos los voluntarios que participaron en la última jornada de ayuda social.",
    content: `
      <p>El pasado sábado llevamos a cabo una nueva jornada del Proyecto Huelva Sonríe, nuestra iniciativa de ayuda social en la ciudad.</p>
      <p>Queremos expresar nuestro más profundo agradecimiento a todos los voluntarios que dedicaron su tiempo y esfuerzo para bendecir a las familias más necesitadas de nuestro entorno.</p>
      <p>Juntos, estamos siendo las manos y los pies de Jesús en Huelva.</p>
      <p>Si deseas unirte a este proyecto, no dudes en contactarnos.</p>
    `,
    date: "10 Mar 2024",
    category: "Social",
    tags: ["Obra Social", "Voluntariado", "Huelva"],
    image: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&q=80&w=800",
    featured: true
  }
];
