import { EditorialFormShell } from '../EditorialFormShell'
import type { EditorialFormProps } from './editorialFormTypes'
import { EventTicketTypesPanel } from './EventTicketTypesPanel'

export function EventEditorialForm(props: EditorialFormProps) {
  return (
    <div className="min-w-0 space-y-5">
      <EditorialFormShell {...props} />
      <EventTicketTypesPanel eventId={props.record?.id ?? null} token={props.token} canWrite={props.canWrite} canDelete={props.canDelete} />
    </div>
  )
}
