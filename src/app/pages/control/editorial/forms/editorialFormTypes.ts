import type { FormEvent, ReactNode } from 'react'
import type { ContentEntity, ContentRecord, PublicationAction } from '../../../../../services/content.service'

export type EditorialFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'select'
  | 'benefits'
  | 'eventMetadata'
  | 'campaignAudience'
  | 'campaignContent'

export type EditorialFieldOption = {
  value: string
  label: string
}

export type EditorialField = {
  key: string
  label: string
  type: EditorialFieldType
  required?: boolean
  nullable?: boolean
  publicVisible?: boolean
  helper?: string
  placeholder?: string
  options?: EditorialFieldOption[]
  publishRequired?: boolean
  advanced?: boolean
}

export type EditorialSection = {
  title: string
  description: string
  fields: EditorialField[]
}

export type EditorialDefinition = {
  entity: ContentEntity
  title: string
  subtitle: string
  eyebrow: string
  primaryLabel: string
  secondaryLabel: string
  listLabel: string
  singularLabel: string
  createLabel?: string
  orderBy: 'sort_order' | 'created_at' | 'updated_at' | 'published_at' | 'name' | 'title'
  publishStatus: string
  microcopy: string
  publicSummary: string
  sections: EditorialSection[]
}

export type EditorialFormValues = Record<string, string>
export type EditorialFieldErrors = Record<string, string>

export type EditorialFormProps = {
  definition: EditorialDefinition
  record: ContentRecord | null
  selectedTitle: string
  recordVersion?: number | null
  updatedAtLabel: string
  form: EditorialFormValues
  fieldErrors: EditorialFieldErrors
  saving: boolean
  isBusy: boolean
  success: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onChange: (key: string, value: string) => void
  onPreview: () => void
  onVersions: () => void
  actions: ReactNode
  versions: ReactNode
  token?: string | null
  canWrite?: boolean
  canDelete?: boolean
}

export type ValidationIntent = 'save' | 'publish' | 'schedule'

export type ValidationResult = {
  valid: boolean
  generalMessage: string | null
  fieldErrors: EditorialFieldErrors
  missingForPublish: string[]
}

export type ScheduleDraft = {
  action: PublicationAction
  runAt: string
}
