import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { executiveAssistantClient, type ExecutiveAssistantMessage } from '../../../services/executiveAssistant.service'
import { useAppPreferences } from '../../context/AppPreferencesContext'

type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error'

type AssistantConversationMessage = ExecutiveAssistantMessage & {
  createdAt: string
}

type BrowserSpeechResult = {
  isFinal: boolean
  0: { transcript: string }
}

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: { resultIndex: number; results: ArrayLike<BrowserSpeechResult> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

function stripAssistantFormatting(content: string) {
  return content
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s([{])\*([^*\n]+)\*(?=$|[\s.,;:!?)}\]])/g, '$1$2')
    .replace(/\*/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function ExecutiveAssistant() {
  const { session } = useAuth()
  const { isEnglish } = useAppPreferences()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<AssistantConversationMessage[]>([])
  const [sending, setSending] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState('')
  const [enabled, setEnabled] = useState(false)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const assistantDraftRef = useRef('')
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const voiceActiveRef = useRef(false)
  const browserVoiceRef = useRef(false)
  const voiceAwaitingRef = useRef(false)
  const mutedRef = useRef(false)
  const messagesRef = useRef<HTMLDivElement | null>(null)

  function stopVoice() {
    voiceActiveRef.current = false
    browserVoiceRef.current = false
    voiceAwaitingRef.current = false
    recognitionRef.current?.abort()
    recognitionRef.current = null
    window.speechSynthesis?.cancel()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    peerRef.current?.close()
    streamRef.current = null
    peerRef.current = null
    setVoiceState('idle')
  }

  useEffect(() => stopVoice, [])
  useEffect(() => {
    let active = true
    if (!session?.access_token) {
      setEnabled(false)
      return () => { active = false }
    }
    executiveAssistantClient.status(session.access_token)
      .then((response) => { if (active) setEnabled(response.data.enabled && response.data.readOnly) })
      .catch(() => { if (active) setEnabled(false) })
    return () => { active = false }
  }, [session?.access_token])
  useEffect(() => {
    mutedRef.current = muted
    if (audioRef.current) audioRef.current.muted = muted
    if (muted) window.speechSynthesis?.cancel()
  }, [muted])
  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      const container = messagesRef.current
      if (container) container.scrollTop = container.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [messages, open, sending])

  if (!enabled) return null

  const renderMessageText = (content: string) => {
    const normalized = content.replace(/__([^_]+)__/g, '**$1**').replace(/`([^`]+)`/g, '$1')
    return normalized.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
      const isStrong = part.startsWith('**') && part.endsWith('**')
      const text = isStrong ? part.slice(2, -2) : part.replace(/\*/g, '')
      return isStrong ? <strong key={`${index}-${text}`}>{text}</strong> : text
    })
  }

  const speechText = (content: string) => content
    .replace(/\*|__/g, '')
    .replace(/`/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')

  const messageTimestamp = (createdAt: string) => new Intl.DateTimeFormat(isEnglish ? 'en-US' : 'es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))

  const copy = isEnglish ? {
    eyebrow: 'PRIVATE EXECUTIVE READING', title: 'My assistant', intro: 'A direct reading of the estate operation, refreshed from the Control Center.',
    privacy: 'Read-only. Uses aggregate indicators and never changes records.', open: 'Open conversation', close: 'Close',
    welcome: 'What would you like to know about today’s operation?', placeholder: 'Ask about sales, bookings, occupancy, logistics or customers…', send: 'Send',
    prompts: ['What needs my attention today?', 'Give me the commercial summary', 'Where are the operational risks?'],
    voice: 'Voice conversation', startVoice: 'Start voice', stopVoice: 'Stop', mute: 'Mute response', unmute: 'Hear response',
    states: { idle: 'Ready', connecting: 'Connecting', listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking', error: 'Unavailable' },
    failure: 'The assistant could not consult the operation. Try again in a moment.', accessFailure: 'Your session cannot consult the assistant right now. Sign in again and retry.', voiceFailure: 'Voice could not be started. Check microphone permission and try again.',
  } : {
    eyebrow: 'LECTURA EJECUTIVA PRIVADA', title: 'Mi asistente', intro: 'Una lectura directa de la operación de la Hacienda, actualizada desde el Centro de Control.',
    privacy: 'Sólo consulta. Usa indicadores agregados y nunca modifica registros.', open: 'Abrir conversación', close: 'Cerrar',
    welcome: '¿Qué necesitas saber de la operación de hoy?', placeholder: 'Pregunta por ventas, reservaciones, ocupación, logística o clientes…', send: 'Enviar',
    prompts: ['¿Qué requiere mi atención hoy?', 'Dame el resumen comercial', '¿Dónde están los riesgos operativos?'],
    voice: 'Conversación por voz', startVoice: 'Iniciar conversación', stopVoice: 'Detener', mute: 'Silenciar respuesta', unmute: 'Escuchar respuesta',
    states: { idle: 'Lista', connecting: 'Conectando', listening: 'Escuchando', thinking: 'Analizando', speaking: 'Respondiendo', error: 'No disponible' },
    failure: 'La asistente no pudo consultar la operación. Intenta nuevamente en un momento.', accessFailure: 'Tu sesión no puede consultar la asistente en este momento. Vuelve a iniciar sesión e intenta otra vez.', voiceFailure: 'No fue posible iniciar la voz. Revisa el permiso del micrófono e intenta otra vez.',
  }

  async function sendText(text = message, voiceReply = false) {
    const clean = text.trim()
    if (!clean || sending) return
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }))
    setMessages((current) => [...current, { role: 'user', content: clean, createdAt: new Date().toISOString() }])
    setMessage('')
    setSending(true)
    setError('')
    try {
      const response = await executiveAssistantClient.message(session?.access_token, clean, history)
      const answer = stripAssistantFormatting(response.data.answer)
      setMessages((current) => [...current, { role: 'assistant', content: answer, createdAt: new Date().toISOString() }])
      if (voiceReply && browserVoiceRef.current) {
        speakBrowserAnswer(speechText(answer))
      }
    } catch (requestError) {
      const status = typeof requestError === 'object' && requestError && 'status' in requestError
        ? Number((requestError as { status?: unknown }).status)
        : 0
      setError(status === 401 || status === 403 ? copy.accessFailure : copy.failure)
      if (voiceReply) {
        voiceAwaitingRef.current = false
        setVoiceState('error')
      }
    } finally {
      setSending(false)
    }
  }

  function restartBrowserRecognition() {
    if (!voiceActiveRef.current || !browserVoiceRef.current || voiceAwaitingRef.current) return
    window.setTimeout(() => {
      if (!voiceActiveRef.current || !browserVoiceRef.current || voiceAwaitingRef.current) return
      try {
        recognitionRef.current?.start()
      } catch {
        // El navegador puede mantener la sesión de reconocimiento activa unos milisegundos más.
      }
    }, 220)
  }

  function speakBrowserAnswer(answer: string) {
    voiceAwaitingRef.current = false
    if (!voiceActiveRef.current || !browserVoiceRef.current) return
    if (mutedRef.current || !('speechSynthesis' in window)) {
      setVoiceState('listening')
      restartBrowserRecognition()
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(answer)
    utterance.lang = 'es-MX'
    utterance.rate = 0.88
    utterance.pitch = 0.98
    const voices = window.speechSynthesis.getVoices()
    const preferredNames = ['monica', 'mónica', 'paulina', 'ximena', 'sabina', 'marisol']
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === 'es-mx' && preferredNames.some((name) => voice.name.toLowerCase().includes(name)))
      ?? voices.find((voice) => voice.lang.toLowerCase() === 'es-mx')
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('es'))
      ?? null
    utterance.onstart = () => setVoiceState('speaking')
    utterance.onend = () => {
      if (!voiceActiveRef.current) return
      setVoiceState('listening')
      restartBrowserRecognition()
    }
    utterance.onerror = () => {
      if (!voiceActiveRef.current) return
      setVoiceState('listening')
      restartBrowserRecognition()
    }
    window.speechSynthesis.speak(utterance)
  }

  function startBrowserVoice() {
    const browserWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
    }
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition
    if (!Recognition) throw new Error('browser_speech_unavailable')

    const recognition = new Recognition()
    recognition.lang = 'es-MX'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onstart = () => setVoiceState('listening')
    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result?.[0]?.transcript?.trim() ?? ''
        if (result?.isFinal) finalText += `${transcript} `
        else interim += `${transcript} `
      }
      if (interim.trim()) setMessage(interim.trim())
      if (finalText.trim()) {
        const clean = finalText.trim()
        setMessage('')
        voiceAwaitingRef.current = true
        setVoiceState('thinking')
        void sendText(clean, true)
      }
    }
    recognition.onerror = (event) => {
      if (!voiceActiveRef.current || event.error === 'aborted') return
      voiceAwaitingRef.current = false
      setVoiceState('error')
      setError(event.error === 'not-allowed' ? copy.voiceFailure : copy.failure)
    }
    recognition.onend = () => restartBrowserRecognition()
    recognitionRef.current = recognition
    browserVoiceRef.current = true
    voiceActiveRef.current = true
    recognition.start()
  }

  function handleRealtimeEvent(event: MessageEvent<string>) {
    try {
      const payload = JSON.parse(event.data) as { type?: string; delta?: string; transcript?: string }
      if (payload.type === 'input_audio_buffer.speech_started') setVoiceState('listening')
      if (payload.type === 'input_audio_buffer.speech_stopped') setVoiceState('thinking')
      if (payload.type === 'response.output_audio.started') setVoiceState('speaking')
      if (payload.type === 'conversation.item.input_audio_transcription.completed' && payload.transcript?.trim()) {
        setMessages((current) => [...current, { role: 'user', content: payload.transcript!.trim(), createdAt: new Date().toISOString() }])
      }
      if (['response.output_audio_transcript.delta', 'response.audio_transcript.delta', 'response.output_text.delta'].includes(payload.type ?? '') && payload.delta) {
        assistantDraftRef.current += payload.delta
      }
      if (payload.type === 'response.done') {
        const answer = stripAssistantFormatting(assistantDraftRef.current)
        if (answer) setMessages((current) => [...current, { role: 'assistant', content: answer, createdAt: new Date().toISOString() }])
        assistantDraftRef.current = ''
        setVoiceState('listening')
      }
    } catch {
      // Ignora eventos no conversacionales del canal Realtime.
    }
  }

  async function startVoice() {
    if (peerRef.current || voiceActiveRef.current) return
    setError('')
    setVoiceState('connecting')
    voiceActiveRef.current = true
    try {
      const sessionResponse = await executiveAssistantClient.realtimeSession(session?.access_token)
      const peer = new RTCPeerConnection()
      peerRef.current = peer
      const audio = new Audio()
      audio.autoplay = true
      audio.muted = muted
      audioRef.current = audio
      peer.ontrack = (event) => { audio.srcObject = event.streams[0] }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
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
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      peerRef.current?.close()
      streamRef.current = null
      peerRef.current = null
      voiceActiveRef.current = false
      try {
        startBrowserVoice()
      } catch {
        stopVoice()
        setVoiceState('error')
        setError(copy.voiceFailure)
      }
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
              <aside>
                <div className="control-assistant-identity"><span>Hacienda de Letras</span><strong>Dirección</strong><i /></div>
                <p>{copy.privacy}</p>
                <div className="control-assistant-voice">
                  <span>{copy.voice}</span>
                  <strong className={`is-${voiceState}`}>{copy.states[voiceState]}</strong>
                  {voiceState === 'idle' || voiceState === 'error' ? (
                    <button type="button" className="is-microphone" onClick={() => void startVoice()} aria-label={copy.startVoice}>
                      <Mic size={19} aria-hidden="true" /><span>{copy.startVoice}</span>
                    </button>
                  ) : (
                    <button type="button" className="is-microphone is-active" onClick={stopVoice} aria-label={copy.stopVoice}>
                      <MicOff size={19} aria-hidden="true" /><span>{copy.stopVoice}</span>
                    </button>
                  )}
                  <button type="button" className="is-secondary" onClick={() => setMuted((value) => !value)}>
                    {muted ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
                    <span>{muted ? copy.unmute : copy.mute}</span>
                  </button>
                </div>
              </aside>
              <main>
                <div ref={messagesRef} className="control-assistant-messages" aria-live="polite">
                  {messages.length === 0 ? (
                    <div className="control-assistant-welcome"><span>Mi asistente</span><p>{copy.welcome}</p><div>{copy.prompts.map((prompt) => <button type="button" key={prompt} onClick={() => void sendText(prompt)}>{prompt}</button>)}</div></div>
                  ) : messages.map((item, index) => (
                    <article key={`${item.role}-${item.createdAt}-${index}`} className={`is-${item.role}`}>
                      <span>
                        <b>{item.role === 'assistant' ? copy.title : (isEnglish ? 'You' : 'Tú')}</b>
                        <time dateTime={item.createdAt}>{messageTimestamp(item.createdAt)}</time>
                      </span>
                      <p>{item.role === 'assistant' ? renderMessageText(item.content) : item.content}</p>
                    </article>
                  ))}
                  {sending ? <article className="is-assistant is-loading"><span><b>{copy.title}</b></span><p>{copy.states.thinking}</p></article> : null}
                </div>
                {error ? <p className="control-assistant-error" role="alert">{error}</p> : null}
                <form onSubmit={(event) => { event.preventDefault(); void sendText() }}>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
                      event.preventDefault()
                      void sendText()
                    }}
                    placeholder={copy.placeholder}
                    rows={2}
                  />
                  <button type="submit" disabled={sending || !message.trim()} aria-label={copy.send}><Send size={17} aria-hidden="true" /><span>{copy.send}</span></button>
                </form>
              </main>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
