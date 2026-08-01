# Sistema Editorial - Hacienda de Letras OS

## Alcance

La Fase 4B convierte el Centro de Control en la base editorial productiva para contenido administrable. Supabase y el backend son la fuente única de verdad; la app pública solo consume contenido publicado y filtrado.

No conecta todavía todos los formularios del Centro de Control y no inicia Fase 5.

## Modelo Editorial

Las entidades iniciales son:

- `wines`
- `experiences`
- `events`
- `promotions`
- `membership_plans`
- `campaigns`

El patrón editorial común agrega visibilidad, orden, ventana de publicación, autoría, publicación, archivado, borrado lógico, versión, `locale` y `metadata`.

La función `is_content_live()` considera:

- `status` publicado.
- `visible_in_app = true`.
- `deleted_at is null`.
- `archived_at is null`.
- `publish_at` nulo o vigente.
- `unpublish_at` nulo o futuro.

## Contenido Bilingüe

La estrategia elegida es tabla base + tabla de traducciones. La migración `022_content_translations.sql` crea `content_translations` para soportar español e inglés sin duplicar lógica de negocio.

Soporta:

- `es`, `es-MX`, `en`, `en-US`.
- Fallback a español.
- Slug por idioma.
- Título, subtítulo, descripciones, notas, beneficios, mensaje promocional y SEO.
- Estado de traducción.
- Publicación por idioma.
- Auditoría y versionado por idioma.

Un contenido no se considera listo para experiencia bilingüe completa si falta una traducción obligatoria.

## Roles

- `super_admin`: todo.
- `admin`: crear, editar, publicar, despublicar, programar, archivar, restaurar, duplicar y borrar.
- `operations`: experiencias, slots, eventos, tickets y reservaciones relacionadas.
- `marketing`: promociones, campañas y contenido editorial.
- `finance`: vinos, precios y planes de membresía.
- `viewer`: lectura en Centro de Control.
- `customer`: sin acceso administrativo.

Los permisos se basan en `roles` y `user_roles`; no se usan correos ni metadata editable.

## Endpoints Administrativos

Rutas:

- `GET /api/admin/wines`
- `GET /api/admin/experiences`
- `GET /api/admin/events`
- `GET /api/admin/promotions`
- `GET /api/admin/membership-plans`
- `GET /api/admin/campaigns`

Operaciones comunes:

- `GET /`
- `GET /:id`
- `POST /`
- `PATCH /:id`
- `DELETE /:id`
- `POST /:id/publish`
- `POST /:id/unpublish`
- `POST /:id/schedule`
- `POST /:id/duplicate`
- `POST /:id/archive`
- `POST /:id/restore`
- `GET /:id/versions`
- `POST /:id/versions/:version/restore`
- `POST /:id/preview-token`

Todas requieren autenticación, autorización, allowlist explícita de entidad y validación con Zod.

## Endpoints Públicos

- `GET /api/public/wines`
- `GET /api/public/wines/:slug`
- `GET /api/public/experiences`
- `GET /api/public/experiences/:slug`
- `GET /api/public/events`
- `GET /api/public/events/:slug`
- `GET /api/public/promotions`
- `GET /api/public/membership-plans`

Siempre filtran contenido live, visible, no archivado, no eliminado, vigente, ordenado por `sort_order` y por `locale`.

Nunca devuelven auditoría, versiones, autores internos, metadata interna, tokens, secretos ni costos internos.

## Preview

`content_preview_tokens` guarda solo `token_hash`. El token plano se entrega una vez al usuario autorizado y no se registra en logs.

El endpoint `GET /api/preview/:token` valida hash, expiración y revocación. Responde 404 cuando el token no existe, expiró o fue revocado, para evitar enumeración.

## Scheduler

`content_publication_jobs` maneja:

- `publish`
- `unpublish`
- `archive`
- `restore`

Estados:

- `pending`
- `processing`
- `completed`
- `failed`
- `cancelled`

El worker interno de backend procesa jobs vencidos por lotes, usa locking por estado, no detiene la API si un job falla y soporta apagado limpio.

## Versionado y Restore

`content_versions` guarda snapshots antes de cambios críticos en updates/deletes y permite restauración controlada desde backend. No guarda contraseñas, tokens ni datos completos de pagos.

Las restauraciones limpian `deleted_at` y `archived_at`, mantienen el control por rol y disparan auditoría.

## RLS y Realtime

RLS queda activo en tablas editoriales y auxiliares. Las políticas públicas solo leen contenido live; las administrativas usan funciones de permisos por entidad.

Realtime queda preparado para:

- `wines`
- `experiences`
- `events`
- `promotions`
- `content_translations`
- `content_versions`
- `content_publication_jobs`

No se exponen canales privados ni drafts a clientes.

## Cache

Los endpoints públicos usan `Cache-Control` corto:

- `max-age=60`
- `stale-while-revalidate=120`

La invalidación operativa ocurre al publicar, editar, despublicar o archivar porque la consulta pública filtra estado y ventana de publicación en cada lectura.

## Pruebas

Validado:

- Migraciones 019-023 aplicadas e idempotentes.
- Columnas, constraints, índices, funciones, triggers, policies, RLS y realtime.
- Backend con typecheck y pruebas automatizadas.
- Prueba real controlada con vino, experiencia y evento.
- Preview hash-only y revocable.
- Scheduler ejecutado una vez contra jobs vencidos.
- Sin secretos impresos.
- Copia seed visible corregida con acentos donde aplicaba.

## Riesgos Pendientes

- Fase 4B no conecta todos los formularios del Centro de Control.
- Google y Apple Auth quedan documentados para la app nativa, no implementados en esta fase.
- La app nativa bilingüe requiere integración frontend específica en fases posteriores.
