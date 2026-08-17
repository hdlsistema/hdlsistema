import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { executiveAssistantClient, type ExecutiveAssistantMessage } from '../../../services/executiveAssistant.service'
import { useAppPreferences } from '../../context/AppPreferencesContext'

const executiveUserIds = new Set([
  '5d816bfe-1ff3-40ae-ab45-5f0e7ef9a62b',
  '26f0de80-f99d-4f16-b071-c5d5199f100e',
])

type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error'

export function ExecutiveAssistant() {
  const { session } = useAuth()
  const { isEnglish } = useAppPreferences()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ExecutiveAssistantMessage[]>([])
  const [sending, setSending] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState('')
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const assistantDraftRef = useRef('')

  const userId = session?.user?.id
  const enabled = Boolean(userId && executiveUserIds.has(userId))

  function stopVoice() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    peerRef.current?.close()
    streamRef.current = null
    peerRef.current = null
    setVoiceState('idle')
  }

  useEffect(() => stopVoice, [])
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted
  }, [muted])

  if (!enabled) return null

  const copy = isEnglish ? {
    eyebrow: 'PRIVATE EXECUTIVE READING', title: 'My assistant', intro: 'A direct reading of the estate operation, refreshed from the Control Center.',
    privacy: 'Read-only. Uses aggregate indicators and never changes records.', open: 'Open conversation', close: 'Close',
    welcome: 'What would you like to know about today’s operation?', placeholder: 'Ask about sales, bookings, occupancy, logistics or customers…', send: 'Send',
    prompts: ['What needs my attention today?', 'Give me the commercial summary', 'Where are the operational risks?'],
    voice: 'Voice conversation', startVoice: 'Start voice', stopVoice: 'Stop', mute: 'Mute response', unmute: 'Hear response',
    states: { idle: 'Ready', connecting: 'Connecting', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking', error: 'Unavailable' },
    failure: 'The assistant could not respond. Try again in a moment.', voiceFailure: 'Voice could not be started. Check microphone permission and try again.',
  } : {
    eyebrow: 'LECTURA EJECUTIVA PRIVADA', title: 'Mi asistente', intro: 'Una lectura directa de la operación de la Hacienda, actualizada desde el Centro de Control.',
    privacy: 'Sólo consulta. Usa indicadores agregados y nunca modifica registros.', open: 'Abrir conversación', close: 'Cerrar',
    welcome: '¿Qué necesitas saber de la operación de hoy?', placeholder: 'Pregunta por ventas, reservaciones, ocupación, logística o clientes…', send: 'Enviar',
    prompts: ['¿Qué requiere mi atención hoy?', 'Dame el resumen comercial', '¿Dónde están los riesgos operativos?'],
    voice: 'Conversación por voz', startVoice: 'Iniciar conversación', stopVoice: 'Detener', mute: 'Silenciar respuesta', unmute: 'Escuchar respuesta',
    states: { idle: 'Lista', connecting: 'Conectando', listening: 'Escuchando', thinking: 'Analizando', speaking: 'Respondiendo', error: 'No disponible' },
    failure: 'La asistente no pudo responder. Intenta nuevamente en un momento.', voiceFailure: 'No fue posible iniciar la voz. Revisa el permiso del micrófono e intenta otra vez.',
  }

  async function sendText(text = message) {
    const clean = text.trim()
    if (!clean || sending) return
    const history = messages.slice(-8)
    setMessages((current) => [...current, { role: 'user', content: clean }])
    setMessage('')
    setSending(true)
    setError('')
    try {
      const response = await executiveAssistantClient.message(session?.access_token, clean, history)
      setMessages((current) => [...current, { role: 'assistant', content: response.data.answer }])
    } catch {
      setError(copy.failure)
    } finally {
      setSending(false)
    }
  }

  function handleRealtimeEvent(event: MessageEvent<string>) {
    try {
      const payload = JSON.parse(event.data) as { type?: string; delta?: string; transcript?: string }
      if (payload.type === 'input_audio_buffer.speech_started') setVoiceState('listening')
      if (payload.type === 'input_audio_buffer.speech_stopped') setVoiceState('thinking')
      if (payload.type === 'response.output_audio.started') setVoiceState('speaking')
      if (payload.type === 'conversation.item.input_audio_transcription.completed' && payload.transcript?.trim()) {
        setMessages((current) => [...current, { role: 'user', content: payload.transcript!.trim() }])
      }
      if (['response.output_audio_transcript.delta', 'response.audio_transcript.delta', 'response.output_text.delta'].includes(payload.type ?? '') && payload.delta) {
        assistantDraftRef.current += payload.delta
      }
      if (payload.type === 'response.done') {
        const answer = assistantDraftRef.current.trim()
        if (answer) setMessages((current) => [...current, { role: 'assistant', content: answer }])
        assistantDraftRef.current = ''
        setVoiceState('listening')
      }
    } catch {
      // Ignora eventos no conversacionales del canal Realtime.
    }
  }

  async function startVoice() {
    if (peerRef.current) return
    setError('')
    setVoiceState('connecting')
    try {
      const sessionResponse = await executiveAssistantClient.realtimeSession(session?.access_token)
      const peer = new RTCPeerConnection()
      const audio = new Audio()
      audio.autoplay = true
      audio.muted = muted
      audioRef.current = audio
      peer.ontrack = (event) => { audio.srcObject = event.streams[0] }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => peer.addTrack(track, stream))
      const channel = peer.createDataChannel('oai-events')
      channel.onopen = () => setVoiceState('listening')
      channel.onmessage = handleRealtimeEvent
      channel.onerror = () => setVoiceState('error')
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      const answer = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionResponse.data.clientSecret}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })
      if (!answer.ok) throw new Error('realtime_connection_failed')
      await peer.setRemoteDescription({ type: 'answer', sdp: await answer.text() })
      peerRef.current = peer
      streamRef.current = stream
    } catch {
      stopVoice()
      setVoiceState('error')
      setError(copy.voiceFailure)
    }
  }

  return (
    <>
      <section className="control-executive-assistant-card">
        <div className="control-executive-assistant-card__mark" aria-hidden="true"><span>HDL</span><i /></div>
        <div className="control-executive-assistant-card__copy"><p>{copy.eyebrow}</p><h2>{copy.title}</h2><span>{copy.intro}</span><small>{copy.privacy}</small></div>
        <button type="button" onClick={() => setOpen(true)}>{copy.open}<span aria-hidden="true">→</span></button>
      </section>

      {open ? (
        <div className="control-assistant-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section className="control-assistant-dialog" role="dialog" aria-modal="true" aria-labelledby="assistant-title">
            <header><div><p>{copy.eyebrow}</p><h2 id="assistant-title">{copy.title}</h2></div><button type="button" onClick={() => { stopVoice(); setOpen(false) }}>{copy.close}</button></header>
            <div className="control-assistant-dialog__body">
              <aside><div className="control-assistant-identity"><span>Hacienda de Letras</span><strong>Dirección</strong><i /></div><p>{copy.privacy}</p><div className="control-assistant-voice"><span>{copy.voice}</span><strong className={`is-${voiceState}`}>{copy.states[voiceState]}</strong>{voiceState === 'idle' || voiceState === 'error' ? <button type="button" onClick={() => void startVoice()}>{copy.startVoice}</button> : <button type="button" onClick={stopVoice}>{copy.stopVoice}</button>}<button type="button" className="is-secondary" onClick={() => setMuted((value) => !value)}>{muted ? copy.unmute : copy.mute}</button></div></aside>
              <main><div className="control-assistant-messages" aria-live="polite">{messages.length === 0 ? <div className="control-assistant-welcome"><span>Mi asistente</span><p>{copy.welcome}</p><div>{copy.prompts.map((prompt) => <button type="button" key={prompt} onClick={() => void sendText(prompt)}>{prompt}</button>)}</div></div> : messages.map((item, index) => <article key={`${item.role}-${index}`} className={`is-${item.role}`}><span>{item.role === 'assistant' ? copy.title : (isEnglish ? 'You' : 'Tú')}</span><p>{item.content}</p></article>)}{sending ? <article className="is-assistant is-loading"><span>{copy.title}</span><p>{copy.states.thinking}</p></article> : null}</div>{error ? <p className="control-assistant-error">{error}</p> : null}<form onSubmit={(event) => { event.preventDefault(); void sendText() }}><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={copy.placeholder} rows={2} /><button type="submit" disabled={sending || !message.trim()}>{copy.send}</button></form></main>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
