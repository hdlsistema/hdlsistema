import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageCircleMore, Send, Wine } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { customerClient } from '../../../services/customer.service'
import { AppSectionHeader, EmptyState, ErrorState, HeroEditorial, LoadingState, WineCard } from '../../components/mobile/PremiumMobileUi'
import { useAppPreferences } from '../../context/AppPreferencesContext'
import { usePublicContent } from '../../hooks/usePublicContent'
import { appPath } from '../../utils/appRoutes'
import { contentRouteId, formatCurrency, imageField, numberField, textField } from '../../utils/publicContent'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function renderInlineMarkdown(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`} className="font-semibold text-[var(--color-ink)]">{part.slice(2, -2)}</strong>
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function renderSommelierMarkdown(content: string): ReactNode {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks.map((block, blockIndex) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    const isList = lines.every((line) => /^[-*]\s+/.test(line))

    if (isList) {
      return (
        <ul key={`list-${blockIndex}`} className="my-2 list-disc space-y-1 pl-5">
          {lines.map((line, lineIndex) => (
            <li key={`${blockIndex}-${lineIndex}`}>{renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>
          ))}
        </ul>
      )
    }

    return (
      <p key={`paragraph-${blockIndex}`} className="my-2 first:mt-0 last:mb-0">
        {lines.map((line, lineIndex) => (
          <span key={`${blockIndex}-${lineIndex}`}>
            {lineIndex > 0 ? <br /> : null}
            {renderInlineMarkdown(line)}
          </span>
        ))}
      </p>
    )
  })
}

export function SommelierScreen() {
  const { t, locale } = useAppPreferences()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { records: wines, loading, error, retry } = usePublicContent('wines')
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState('')

  async function sendMessage() {
    const value = prompt.trim()
    if (!value || sending) return
    if (!session?.access_token) {
      navigate(appPath('/login'))
      return
    }
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: value }
    setMessages((current) => [...current, userMessage])
    setPrompt('')
    setChatError('')
    setSending(true)
    try {
      const response = await customerClient.sommelierMessage(session.access_token, {
        message: value,
        sessionId,
        locale,
      })
      setSessionId(response.data.sessionId)
      setMessages((current) => [
        ...current,
        {
          id: response.data.message.id,
          role: 'assistant',
          content: response.data.message.content,
        },
      ])
    } catch {
      setChatError(t('app.premium.sommelier.error'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="app-page space-y-6">
      <HeroEditorial
        compact
        eyebrow={t('app.premium.home.sommelierTitle')}
        title={t('app.premium.sommelier.title')}
        subtitle={t('app.premium.sommelier.subtitle')}
        image="/hacienda 2.jpg"
        alt={t('app.premium.home.sommelierTitle')}
      />

      <section className="rounded-[1.45rem] border border-[rgba(219,189,148,0.55)] bg-[rgba(255,250,242,0.82)] p-4 shadow-[var(--shadow-card)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <MessageCircleMore size={18} strokeWidth={1.45} className="text-[var(--color-gold)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{t('app.premium.sommelier.realAssistant')}</p>
        </div>
        <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
          {messages.length ? messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-[1.15rem] px-4 py-3 text-[13px] leading-6 ${
                message.role === 'user'
                  ? 'ml-8 bg-[var(--color-burgundy)] text-white'
                  : 'mr-8 border border-[rgba(219,189,148,0.55)] bg-white/76 text-[var(--color-ink)]'
              }`}
            >
              {message.role === 'assistant' ? renderSommelierMarkdown(message.content) : message.content}
            </div>
          )) : (
            <p className="rounded-[1.15rem] border border-[rgba(219,189,148,0.55)] bg-white/70 px-4 py-3 text-[13px] leading-6 text-[var(--color-muted)]">
              {t('app.premium.sommelier.empty')}
            </p>
          )}
          {sending ? <LoadingState label={t('app.premium.sommelier.thinking')} /> : null}
          {chatError ? <ErrorState message={chatError} /> : null}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void sendMessage()
              }
            }}
            placeholder={t('app.premium.sommelier.placeholder')}
            className="min-h-12 min-w-0 flex-1 rounded-full border border-[rgba(219,189,148,0.72)] bg-white/78 px-4 text-[14px] text-[var(--color-ink)] outline-none focus:border-[var(--color-burgundy)]"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!prompt.trim() || sending}
            className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-burgundy)] text-white shadow-[0_16px_30px_rgba(90,0,28,0.22)] disabled:opacity-50"
            aria-label={t('app.premium.sommelier.send')}
          >
            <Send size={18} />
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <AppSectionHeader eyebrow={t('app.premium.wines.eyebrow')} title={t('app.premium.wines.title')} />
        {loading ? (
          <LoadingState label={t('app.premium.wines.loading')} />
        ) : error ? (
          <ErrorState message={error} retryLabel={t('app.premium.retry')} onRetry={retry} />
        ) : wines.length === 0 ? (
          <EmptyState title={t('app.premium.contentPreparing')} description={t('app.premium.informationSoon')} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-3">
            {wines.slice(0, 4).map((wine) => {
              const price = numberField(wine, 'price')
              return (
                <WineCard
                  key={wine.id}
                  wine={{
                    id: contentRouteId(wine),
                    name: textField(wine, 'name', t('app.nav.store')),
                    kind: textField(wine, 'grape_variety') || textField(wine, 'origin'),
                    price: price > 0 ? formatCurrency(price, locale) : t('app.premium.pricePending'),
                    image: imageField(wine, ''),
                  }}
                  badge={t('app.premium.selection')}
                />
              )
            })}
          </div>
        )}
      </section>

      <Link to={appPath('/vinos')} className="app-burgundy-cta flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-[0.95rem] bg-[var(--color-burgundy)] px-4 text-[14px] font-semibold text-white">
        <Wine size={16} />
        {t('app.nav.store')}
      </Link>
    </div>
  )
}
