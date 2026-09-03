import { useRef, useState } from 'react';
import { Camera, Loader2, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface Props {
  open: boolean;
  profissional: { id: string; name: string; specialty: string | null; avatar_url: string | null } | null;
  onClose: () => void;
  onSaved: () => void;
}

const BUCKET = 'fotos';

export function AdminEditarProfissional({ open, profissional, onClose, onSaved }: Props) {
  const [name, setName] = useState(profissional?.name ?? '');
  const [specialty, setSpecialty] = useState(profissional?.specialty ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profissional?.avatar_url ?? null);
  const [preview, setPreview] = useState<string | null>(profissional?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `profissionais/${profissional?.id ?? 'new'}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
    } catch {
      setError(
        'Não foi possível enviar a foto agora. Confira se o Storage está configurado no Supabase (bucket "fotos") e tente novamente.',
      );
      setAvatarUrl(profissional?.avatar_url ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profissional) return;
    setSaving(true);
    setError(null);
    const { error: upErr } = await supabase
      .from('profissionais')
      .update({ name: name.trim(), specialty: specialty.trim() || null, avatar_url: avatarUrl })
      .eq('id', profissional.id);
    setSaving(false);
    if (upErr) {
      setError('Não foi possível salvar. Tente novamente.');
      return;
    }
    onSaved();
    onClose();
  };

  const handleClose = () => {
    if (profissional) {
      setName(profissional.name);
      setSpecialty(profissional.specialty ?? '');
      setAvatarUrl(profissional.avatar_url ?? null);
      setPreview(profissional.avatar_url ?? null);
    }
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Editar perfil profissional" maxWidth="max-w-md">
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Foto do profissional */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/10 flex items-center justify-center shrink-0">
            {preview ? (
              <img src={preview} alt="Foto do profissional" className="w-full h-full object-cover" />
            ) : (
              <Camera size={26} className="text-cream/30" />
            )}
          </div>
          {uploading ? (
            <div className="flex items-center gap-2 text-sm text-cream/50">
              <Loader2 size={16} className="animate-spin" />
              Enviando...
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="secondary" size="sm" onClick={pickFile}>
                <Upload size={15} />
                {preview ? 'Trocar foto' : 'Enviar foto'}
              </Button>
              {avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreview(null);
                    setAvatarUrl(null);
                  }}
                >
                  <X size={15} />
                  Remover foto
                </Button>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        <label className="block">
          <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
            Nome
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome exibido no agendamento"
            className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-cream/60 uppercase tracking-wider mb-1.5 block">
            Especialidade
          </span>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Ex: Especialista em degradê"
            className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-4 py-3 text-sm text-cream placeholder:text-cream/25 outline-none transition-colors focus:border-highlight/60"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading || !name.trim()}>
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
