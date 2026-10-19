import { defaultPublicSettings, type PublicSettings } from '../config';
import { getSupabase, shouldUseFallback } from '../lib/supabase';
import { friendlyError } from './errors';

/**
 * Retorna as configurações públicas da barbearia.
 * Em modo de demonstração (Sem Supabase), usa configurações padrão/environment.
 */
export async function fetchSettings(): Promise<PublicSettings> {
  if (shouldUseFallback()) {
    return defaultPublicSettings;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('barbearia_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) return defaultPublicSettings;

    const whatsappNumber = (data.whatsapp || defaultPublicSettings.whatsapp).replace(/\D/g, '');

    return {
      nome: data.nome || defaultPublicSettings.nome,
      whatsapp: whatsappNumber,
      instagramUrl: data.instagram_url || defaultPublicSettings.instagramUrl,
      whatsappUrl: data.whatsapp_url || (whatsappNumber ? `https://wa.me/${whatsappNumber}` : defaultPublicSettings.whatsappUrl),
      endereco: data.endereco || defaultPublicSettings.endereco,
      mapsEmbedUrl: data.maps_embed_url || defaultPublicSettings.mapsEmbedUrl,
    };
  } catch (e) {
    return defaultPublicSettings;
  }
}
