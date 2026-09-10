export interface ShareableCourse {
  id: string;
  title: string;
  requiresCellSupervision?: boolean;
}

export function getCourseShareLegend(course: ShareableCourse): string {
  if (course.requiresCellSupervision) {
    return `Curso ${course.title}. Imprescindible estar vinculado a una célula.`;
  }
  return `Curso ${course.title}. Imprescindible iniciar sesión.`;
}

export function getCourseShareUrl(courseId: string): string {
  const origin = window.location.origin;
  return `${origin}/cursos/${courseId}`;
}

export async function shareCourse(course: ShareableCourse): Promise<{
  success: boolean;
  copiedToClipboard?: boolean;
  sharedNatively?: boolean;
  message: string;
}> {
  const legend = getCourseShareLegend(course);
  const url = getCourseShareUrl(course.id);
  const shareText = `${legend}\n${url}`;

  // Try Web Share API first
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Curso: ${course.title}`,
        text: legend,
        url: url,
      });
      return {
        success: true,
        sharedNatively: true,
        message: '¡Curso compartido!',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          message: 'Compartir cancelado',
        };
      }
      console.warn('Native share failed, falling back to clipboard:', err);
    }
  }

  // Fallback: Copy full text (legend + URL) to clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareText);
      return {
        success: true,
        copiedToClipboard: true,
        message: '¡Enlace y leyenda copiados al portapapeles!',
      };
    }
  } catch (clipErr) {
    console.warn('Clipboard writeText failed:', clipErr);
  }

  // Legacy fallback
  try {
    const textarea = document.createElement('textarea');
    textarea.value = shareText;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return {
      success: true,
      copiedToClipboard: true,
      message: '¡Enlace y leyenda copiados al portapapeles!',
    };
  } catch {
    return {
      success: false,
      message: 'No se pudo copiar el enlace automáticamente.',
    };
  }
}
