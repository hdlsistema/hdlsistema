import type { ContentEntity } from '../../../../../services/content.service'
import type { EditorialDefinition, EditorialFieldOption } from './editorialFormTypes'

export const contentStatuses: EditorialFieldOption[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicado' },
  { value: 'scheduled', label: 'Programado' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'archived', label: 'Archivado' },
]

export const eventStatuses: EditorialFieldOption[] = [
  ...contentStatuses,
  { value: 'sold_out', label: 'Agotado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'completed', label: 'Completado' },
]

export const campaignStatuses: EditorialFieldOption[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'scheduled', label: 'Programada' },
  { value: 'active', label: 'Activa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
]

export const editorialDefinitions: Record<ContentEntity, EditorialDefinition> = {
  wines: {
    entity: 'wines',
    title: 'Vinos',
    subtitle: 'Catálogo real conectado al backend editorial.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'name',
    secondaryLabel: 'sku',
    listLabel: 'vinos',
    singularLabel: 'vino',
    orderBy: 'name',
    publishStatus: 'published',
    microcopy: 'Este contenido será visible en la app cuando esté publicado.',
    publicSummary: 'La app pública usa nombre, descripción, ficha, precio, inventario, imagen y visibilidad.',
    sections: [
      {
        title: 'Información principal',
        description: 'Identifica el vino y prepara el enlace público.',
        fields: [
          { key: 'name', label: 'Nombre', type: 'text', required: true, publishRequired: true, publicVisible: true },
          { key: 'slug', label: 'Slug', type: 'text', required: true, publishRequired: true, publicVisible: true, helper: 'Usa minúsculas, números y guiones.' },
          { key: 'sku', label: 'SKU', type: 'text', required: true },
          { key: 'subtitle', label: 'Descripción corta', type: 'text', nullable: true, publicVisible: true },
          { key: 'description', label: 'Descripción larga', type: 'textarea', nullable: true, publishRequired: true, publicVisible: true },
        ],
      },
      {
        title: 'Ficha del vino',
        description: 'Datos de etiqueta para orientar al cliente.',
        fields: [
          { key: 'grape_variety', label: 'Varietal / uva', type: 'text', nullable: true, publicVisible: true },
          { key: 'origin', label: 'Origen', type: 'text', nullable: true, publicVisible: true },
          { key: 'vintage', label: 'Añada', type: 'number', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Precio y disponibilidad',
        description: 'Información operativa que afecta compra y disponibilidad.',
        fields: [
          { key: 'price', label: 'Precio', type: 'number', required: true, publishRequired: true, publicVisible: true },
          { key: 'stock_quantity', label: 'Inventario', type: 'number', required: true, publishRequired: true, publicVisible: true },
          { key: 'featured', label: 'Destacado', type: 'boolean', publicVisible: true },
        ],
      },
      {
        title: 'Contenido visible en app',
        description: 'Controla si el vino aparece para clientes cuando el estado lo permita.',
        fields: [
          { key: 'cover_image_url', label: 'Imagen principal URL', type: 'text', nullable: true, publicVisible: true },
          { key: 'visible_in_app', label: 'Visible en app', type: 'boolean', publicVisible: true },
          { key: 'sort_order', label: 'Orden de aparición', type: 'number', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Estado editorial',
        description: 'Guardar no publica por sí solo; publicar hace visible el contenido si también está marcado como visible.',
        fields: [
          { key: 'status', label: 'Estado editorial', type: 'select', options: contentStatuses },
          { key: 'publish_at', label: 'Publicar desde', type: 'datetime', nullable: true },
          { key: 'unpublish_at', label: 'Retirar desde', type: 'datetime', nullable: true },
        ],
      },
    ],
  },
  experiences: {
    entity: 'experiences',
    title: 'Experiencias',
    subtitle: 'Experiencias publicables, editables y programables desde el backend.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'title',
    secondaryLabel: 'slug',
    listLabel: 'experiencias',
    singularLabel: 'experiencia',
    orderBy: 'title',
    publishStatus: 'published',
    microcopy: 'Describe qué vivirá el visitante antes de publicar la experiencia.',
    publicSummary: 'La app pública usa título, descripciones, duración, precio, capacidad, ubicación e imagen.',
    sections: [
      {
        title: 'Información principal',
        description: 'Nombre público y enlace de la experiencia.',
        fields: [
          { key: 'title', label: 'Título', type: 'text', required: true, publishRequired: true, publicVisible: true },
          { key: 'slug', label: 'Slug', type: 'text', required: true, publishRequired: true, publicVisible: true, helper: 'Usa minúsculas, números y guiones.' },
          { key: 'subtitle', label: 'Subtítulo', type: 'text', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Detalle de experiencia',
        description: 'Texto editorial que ayuda a decidir la reservación.',
        fields: [
          { key: 'short_description', label: 'Descripción corta', type: 'textarea', nullable: true, publicVisible: true },
          { key: 'description', label: 'Descripción larga', type: 'textarea', nullable: true, publishRequired: true, publicVisible: true },
          { key: 'location', label: 'Ubicación o sede', type: 'text', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Capacidad y horarios',
        description: 'Datos mínimos para operar la experiencia.',
        fields: [
          { key: 'duration_minutes', label: 'Duración en minutos', type: 'number', required: true, publishRequired: true, publicVisible: true },
          { key: 'capacity', label: 'Capacidad', type: 'number', required: true, publishRequired: true, publicVisible: true },
        ],
      },
      {
        title: 'Precio y reservación',
        description: 'Define precio base y presencia destacada.',
        fields: [
          { key: 'base_price', label: 'Precio base', type: 'number', required: true, publishRequired: true, publicVisible: true },
          { key: 'featured', label: 'Destacada', type: 'boolean', publicVisible: true },
        ],
      },
      {
        title: 'Contenido visible en app',
        description: 'Controla visibilidad, imagen y orden.',
        fields: [
          { key: 'cover_image_url', label: 'Imagen principal URL', type: 'text', nullable: true, publicVisible: true },
          { key: 'visible_in_app', label: 'Visible en app', type: 'boolean', publicVisible: true },
          { key: 'sort_order', label: 'Orden de aparición', type: 'number', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Estado editorial',
        description: 'Guardar borrador no publica la experiencia.',
        fields: [
          { key: 'status', label: 'Estado editorial', type: 'select', options: contentStatuses },
          { key: 'publish_at', label: 'Publicar desde', type: 'datetime', nullable: true },
          { key: 'unpublish_at', label: 'Retirar desde', type: 'datetime', nullable: true },
        ],
      },
    ],
  },
  events: {
    entity: 'events',
    title: 'Eventos',
    subtitle: 'Eventos reales con publicación, agenda y control de aforo.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'title',
    secondaryLabel: 'venue',
    listLabel: 'eventos',
    singularLabel: 'evento',
    orderBy: 'title',
    publishStatus: 'published',
    microcopy: 'Las fechas se muestran en horario local configurado para Hacienda.',
    publicSummary: 'La app pública usa título, fechas, sede, aforo, venta activa, descripciones e imagen.',
    sections: [
      {
        title: 'Información del evento',
        description: 'Nombre público, enlace y textos principales.',
        fields: [
          { key: 'title', label: 'Título', type: 'text', required: true, publishRequired: true, publicVisible: true },
          { key: 'slug', label: 'Slug', type: 'text', required: true, publishRequired: true, publicVisible: true, helper: 'Usa minúsculas, números y guiones.' },
          { key: 'subtitle', label: 'Subtítulo', type: 'text', nullable: true, publicVisible: true },
          { key: 'short_description', label: 'Descripción corta', type: 'textarea', nullable: true, publicVisible: true },
          { key: 'description', label: 'Descripción larga', type: 'textarea', nullable: true, publishRequired: true, publicVisible: true },
        ],
      },
      {
        title: 'Fecha y ubicación',
        description: 'Agenda visible para visitantes.',
        fields: [
          { key: 'start_at', label: 'Inicio', type: 'datetime', required: true, publishRequired: true, publicVisible: true },
          { key: 'end_at', label: 'Fin', type: 'datetime', required: true, publicVisible: true },
          { key: 'venue', label: 'Ubicación', type: 'text', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Capacidad y acceso',
        description: 'Controla aforo y venta desde la app.',
        fields: [
          { key: 'capacity', label: 'Capacidad', type: 'number', required: true, publishRequired: true, publicVisible: true },
          { key: 'sold_count', label: 'Vendidos', type: 'number' },
          { key: 'sales_enabled', label: 'Venta activa', type: 'boolean', publicVisible: true },
        ],
      },
      {
        title: 'Contenido visible en app',
        description: 'Define visibilidad, imagen y prioridad.',
        fields: [
          { key: 'cover_image_url', label: 'Imagen principal URL', type: 'text', nullable: true, publicVisible: true },
          { key: 'featured', label: 'Destacado', type: 'boolean', publicVisible: true },
          { key: 'visible_in_app', label: 'Visible en app', type: 'boolean', publicVisible: true },
          { key: 'sort_order', label: 'Orden de aparición', type: 'number', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Estado editorial',
        description: 'Publicar hace visible el evento cuando también está marcado como visible.',
        fields: [
          { key: 'status', label: 'Estado editorial', type: 'select', options: eventStatuses },
          { key: 'publish_at', label: 'Publicar desde', type: 'datetime', nullable: true },
          { key: 'unpublish_at', label: 'Retirar desde', type: 'datetime', nullable: true },
        ],
      },
    ],
  },
  promotions: {
    entity: 'promotions',
    title: 'Promociones',
    subtitle: 'Ofertas reales para publicar, pausar, programar o archivar.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'name',
    secondaryLabel: 'code',
    listLabel: 'promociones',
    singularLabel: 'promoción',
    orderBy: 'name',
    publishStatus: 'published',
    microcopy: 'Define con claridad la vigencia y condiciones para evitar confusión en clientes.',
    publicSummary: 'La app pública usa nombre, descripción, descuento, vigencia, segmento y visibilidad.',
    sections: [
      {
        title: 'Información de promoción',
        description: 'Identidad y mecánica principal.',
        fields: [
          { key: 'name', label: 'Nombre', type: 'text', required: true, publishRequired: true, publicVisible: true },
          { key: 'code', label: 'Código', type: 'text', nullable: true, publicVisible: true },
          { key: 'description', label: 'Descripción / condiciones', type: 'textarea', nullable: true, publishRequired: true, publicVisible: true },
          { key: 'promotion_type', label: 'Tipo de promoción', type: 'text', required: true, publishRequired: true, publicVisible: true },
        ],
      },
      {
        title: 'Vigencia',
        description: 'Periodo durante el cual la promoción estará disponible.',
        fields: [
          { key: 'starts_at', label: 'Inicio', type: 'datetime', nullable: true, publicVisible: true },
          { key: 'ends_at', label: 'Fin', type: 'datetime', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Condiciones',
        description: 'Reglas económicas de la promoción.',
        fields: [
          { key: 'discount_type', label: 'Tipo de descuento', type: 'text', required: true, publishRequired: true, publicVisible: true },
          { key: 'discount_value', label: 'Valor del descuento', type: 'number', required: true, publishRequired: true, publicVisible: true },
          { key: 'minimum_amount', label: 'Monto mínimo', type: 'number', publicVisible: true },
          { key: 'maximum_discount', label: 'Descuento máximo', type: 'number', nullable: true, publicVisible: true },
          { key: 'target_segment', label: 'Segmento', type: 'text', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Visibilidad',
        description: 'Controla aparición en app.',
        fields: [
          { key: 'visible_in_app', label: 'Visible en app', type: 'boolean', publicVisible: true },
          { key: 'sort_order', label: 'Orden de aparición', type: 'number', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Estado editorial',
        description: 'Guardar no publica automáticamente.',
        fields: [
          { key: 'status', label: 'Estado editorial', type: 'select', options: contentStatuses },
          { key: 'publish_at', label: 'Publicar desde', type: 'datetime', nullable: true },
          { key: 'unpublish_at', label: 'Retirar desde', type: 'datetime', nullable: true },
        ],
      },
    ],
  },
  'membership-plans': {
    entity: 'membership-plans',
    title: 'Planes de membresía',
    subtitle: 'Planes reales del club conectados a publicación editorial.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'name',
    secondaryLabel: 'code',
    listLabel: 'planes',
    singularLabel: 'plan',
    orderBy: 'name',
    publishStatus: 'published',
    microcopy: 'Publica solo planes con beneficios claros para el cliente.',
    publicSummary: 'La app pública usa nombre, descripción, precio, periodo, beneficios, límites y visibilidad.',
    sections: [
      {
        title: 'Información del plan',
        description: 'Nombre y descripción del plan.',
        fields: [
          { key: 'name', label: 'Nombre del plan', type: 'text', required: true, publishRequired: true, publicVisible: true },
          { key: 'code', label: 'Código', type: 'text', required: true, publishRequired: true },
          { key: 'description', label: 'Descripción', type: 'textarea', nullable: true, publishRequired: true, publicVisible: true },
        ],
      },
      {
        title: 'Precio y vigencia',
        description: 'Costo y periodo de cobro.',
        fields: [
          { key: 'price', label: 'Precio', type: 'number', required: true, publishRequired: true, publicVisible: true },
          { key: 'billing_period', label: 'Vigencia / periodo de cobro', type: 'text', required: true, publishRequired: true, publicVisible: true },
          { key: 'daily_sommelier_limit', label: 'Límite diario de sommelier', type: 'number', publicVisible: true },
        ],
      },
      {
        title: 'Beneficios',
        description: 'Escribe un beneficio por línea. Se guarda como objeto JSON compatible con el backend.',
        fields: [
          { key: 'benefits', label: 'Beneficios', type: 'benefits', publishRequired: true, publicVisible: true },
        ],
      },
      {
        title: 'Condiciones',
        description: 'Disponibilidad y prioridad dentro de la app.',
        fields: [
          { key: 'active', label: 'Activo', type: 'boolean', publicVisible: true },
          { key: 'visible_in_app', label: 'Visible en app', type: 'boolean', publicVisible: true },
          { key: 'sort_order', label: 'Orden de aparición', type: 'number', nullable: true, publicVisible: true },
        ],
      },
      {
        title: 'Estado editorial',
        description: 'Guardar borrador no publica el plan.',
        fields: [
          { key: 'status', label: 'Estado editorial', type: 'select', options: contentStatuses },
          { key: 'publish_at', label: 'Publicar desde', type: 'datetime', nullable: true },
          { key: 'unpublish_at', label: 'Retirar desde', type: 'datetime', nullable: true },
        ],
      },
    ],
  },
  campaigns: {
    entity: 'campaigns',
    title: 'Campañas',
    subtitle: 'Campañas reales administradas desde el backend común.',
    eyebrow: 'Contenido editorial',
    primaryLabel: 'name',
    secondaryLabel: 'channel',
    listLabel: 'campañas',
    singularLabel: 'campaña',
    orderBy: 'name',
    publishStatus: 'active',
    microcopy: 'La audiencia y el contenido se guardan como JSON guiado, sin pedirle al equipo escribir código.',
    publicSummary: 'Campañas no tienen endpoint público; el backend las mantiene como operación administrativa.',
    sections: [
      {
        title: 'Información de campaña',
        description: 'Nombre, canal y fecha de ejecución.',
        fields: [
          { key: 'name', label: 'Nombre', type: 'text', required: true, publishRequired: true },
          { key: 'channel', label: 'Canal', type: 'text', required: true, publishRequired: true },
          { key: 'scheduled_at', label: 'Programación', type: 'datetime', nullable: true },
        ],
      },
      {
        title: 'Audiencia',
        description: 'Define a quién va dirigida sin editar JSON crudo.',
        fields: [
          { key: 'audience_definition', label: 'Audiencia objetivo', type: 'campaignAudience', publishRequired: true },
        ],
      },
      {
        title: 'Contenido',
        description: 'Mensaje principal que recibirá la audiencia.',
        fields: [
          { key: 'content', label: 'Contenido de campaña', type: 'campaignContent', publishRequired: true },
        ],
      },
      {
        title: 'Vigencia',
        description: 'Estado y visibilidad operativa de la campaña.',
        fields: [
          { key: 'visible_in_app', label: 'Visible en app', type: 'boolean' },
          { key: 'status', label: 'Estado editorial', type: 'select', options: campaignStatuses },
        ],
      },
      {
        title: 'Estado editorial',
        description: 'Activar una campaña requiere audiencia y contenido.',
        fields: [
          { key: 'publish_at', label: 'Publicar desde', type: 'datetime', nullable: true },
          { key: 'unpublish_at', label: 'Retirar desde', type: 'datetime', nullable: true },
        ],
      },
    ],
  },
}

export function getStatusOptions(entity: ContentEntity) {
  return editorialDefinitions[entity].sections
    .flatMap((section) => section.fields)
    .find((field) => field.key === 'status')?.options ?? contentStatuses
}
