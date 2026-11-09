-- 0003 — Bucket privado de fotos (D3). Objeto em <usuario_id>/<foto_id>.jpg.
-- O banco guarda o caminho do objeto; o app baixa a foto no pull (sem URL pública).
-- O usuário só lê, cria e substitui objetos da própria pasta. Sem delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos: dono lê" on storage.objects;
create policy "fotos: dono lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "fotos: dono envia" on storage.objects;
create policy "fotos: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "fotos: dono substitui" on storage.objects;
create policy "fotos: dono substitui" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
