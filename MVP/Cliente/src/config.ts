// Configurações públicas da barbearia usadas na home / confirmação.
// Podem ser sobrescritas por env; serviços reais devem ler da tabela `barbearia_config` (settingsService).

export interface PublicSettings {
  nome: string;
  whatsapp: string;
  instagram: string;
  endereco: string;
  mapsEmbedUrl: string;
}

export const defaultPublicSettings: PublicSettings = {
  nome: 'Alcateia Barber',
  whatsapp: (import.meta.env.VITE_BARBEARIA_WHATSAPP as string | undefined) || '',
  instagram: (import.meta.env.VITE_INSTAGRAM_URL as string | undefined) || '#',
  endereco: 'Alcatéia Barbearia',
  mapsEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4318.6965425811695!2d-49.12235538883765!3d-15.335913485180663!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935cc14a8df8df73%3A0x8e073b50d314c9db!2sAlcat%C3%A9ia%20Barbearia!5e1!3m2!1sen!2sbr!4v1787967265768!5m2!1sen!2sbr',
};

export const businessHours = {
  startHour: 9,
  endHour: 17,
  intervalMinutes: 30,
};
