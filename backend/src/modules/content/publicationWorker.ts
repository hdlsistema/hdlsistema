import { processDuePublicationJobs, processEditorialApprovalReminders } from './content.service'

type WorkerHandle = {
  stop: () => void
}

const DEFAULT_INTERVAL_MS = 60_000

export function startPublicationWorker(): WorkerHandle {
  const intervalMs = Number(process.env.CONTENT_PUBLICATION_WORKER_INTERVAL_MS ?? DEFAULT_INTERVAL_MS)
  const enabled = process.env.CONTENT_PUBLICATION_WORKER_ENABLED !== 'false'
  let running = false

  if (!enabled) {
    return { stop: () => undefined }
  }

  const tick = async () => {
    if (running) return
    running = true
    try {
      const result = await processDuePublicationJobs(10)
      if (result.processed > 0) {
        console.log(`[content-worker] Jobs procesados: ${result.processed}`)
      }
      const reminders = await processEditorialApprovalReminders(25)
      if (reminders.reminders > 0) {
        console.log(`[content-worker] Recordatorios editoriales enviados: ${reminders.reminders}`)
      }
    } catch {
      console.warn('[content-worker] No fue posible procesar jobs vencidos.')
    } finally {
      running = false
    }
  }

  const timer = setInterval(tick, Number.isFinite(intervalMs) ? intervalMs : DEFAULT_INTERVAL_MS)
  timer.unref()
  void tick()

  return {
    stop: () => clearInterval(timer),
  }
}
