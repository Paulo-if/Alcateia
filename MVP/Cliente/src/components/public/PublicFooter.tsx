import { Instagram } from 'lucide-react';
import type { PublicSettings } from '../../config';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.174-.297-.019-.458.13-.606.132-.132.297-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.05-.52-.099-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.873.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M20.52 3.449A11.87 11.87 0 0 0 12.05 0C5.495 0 .16 5.334.157 11.892c0 2.096.548 4.142 1.588 5.945L0 24l6.305-1.654a11.88 11.88 0 0 0 5.68 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.363-8.452zM12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.437-9.884 9.889-9.884a9.82 9.82 0 0 1 6.988 2.898 9.83 9.83 0 0 1 2.892 6.994c-.003 5.45-4.438 9.884-9.886 9.884z" />
    </svg>
  );
}

interface Props {
  settings: PublicSettings;
}

export function PublicFooter({ settings }: Props) {
  const whatsappNumber = settings.whatsapp.replace(/\D/g, '');
  const instagramUrl = settings.instagram === '#' ? null : settings.instagram;

  return (
    <footer className="public-footer">
      <p className="footer-brand">Alcateia Barber</p>

      <div className="social-links">
        {instagramUrl && (
          <a
            className="social-link"
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram da Alcateia Barber"
          >
            <Instagram size={22} />
          </a>
        )}
        {whatsappNumber && (
          <a
            className="social-link"
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp da Alcateia Barber"
          >
            <WhatsAppIcon />
          </a>
        )}
      </div>
    </footer>
  );
}