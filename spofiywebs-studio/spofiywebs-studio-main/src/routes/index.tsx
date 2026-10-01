import { createFileRoute, Link } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, Eye, Instagram, Menu, MessageCircle, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { checkReplies, getStudio, sendInquiry } from '@/lib/studio.functions'
import heroAsset from '@/assets/hero.mp4.asset.json'
import heroWebm from "@/assets/hero.webm.asset.json"
import titan from '@/assets/titan-poster.jpg'
import botanical from '@/assets/botanical-poster.jpg'
import mark from '@/assets/mark-study.jpg'
import web from '@/assets/web-study.jpg'
import titanBack from '@/assets/titan-back-study.jpg.asset.json'
import swordsman from '@/assets/swordsman-study.jpg.asset.json'
import heroPoster from '@/assets/hero-poster.jpg'
import invinciblePreview from '@/assets/invincible-preview.webp'
import circusPreview from '@/assets/circus-preview.webp'
import ballerPreview from '@/assets/baller-preview.webp'
import dollPreview from '@/assets/doll-preview.webp'
import untitledPreview from '@/assets/untitled-preview.webp'
import type { Variant } from '@/components/PosterViewer'

const instagram = 'https://instagram.com/spofiywebs'
const email = 'spofiywebs37@gmail.com'
const whatsappNumber = '923317518912'
const samples = [
  { id: 'sample-1', title: 'The Titan', category: 'Poster Design', imageUrl: titan, sample: true },
  { id: 'sample-2', title: 'After the Bloom', category: 'Poster Design', imageUrl: botanical, sample: true },
  { id: 'sample-3', title: 'Sun / Serpent', category: 'Logo Design', imageUrl: mark, sample: true },
  { id: 'sample-4', title: 'Form & Feeling', category: 'Website Design', imageUrl: web, sample: true },
]
const featuredDrawings = [
  { id: 'titan-back', title: 'Titan — Back Study', category: 'Illustration', imageUrl: titanBack.url, sample: true, orientation: 'portrait' },
  { id: 'swordsman', title: 'The Swordsman', category: 'Illustration', imageUrl: swordsman.url, sample: true, orientation: 'landscape' },
]
const services = [
  { no: '01', name: 'Poster Design', pitch: 'Visually loud ideas made impossible to scroll past.' },
  { no: '02', name: 'Logo Design', pitch: 'Hand-drawn identities with character in every line.' },
  { no: '03', name: 'Website Design', pitch: 'Distinctive digital spaces built to leave a mark.' },
]
const defaultBio = 'I’m an independent designer turning ideas into work that feels impossible to ignore. From expressive posters and hand-drawn marks to websites with a point of view, I make the details count.'
const PosterViewer = lazy(() => import('@/components/PosterViewer').then(module => ({ default: module.PosterViewer })))
const models = [
  { variant: 'invincible', title: '3D poster', category: '3D Poster', preview: invinciblePreview },
  { variant: 'circus', title: 'The Amazing Digital Circus', category: '3D Poster', preview: circusPreview },
  { variant: 'baller', title: 'Baller', category: '3D Character', preview: ballerPreview },
  { variant: 'doll', title: 'Ball-Joint Doll', category: '3D Model', preview: dollPreview },
  { variant: 'untitled', title: 'Untitled', category: '3D Model', preview: untitledPreview },
] as const
type Receipt = { id: string; receipt: string; message?: string; sentAt?: string }
type ProjectView = { title: string; category: string; imageUrl: string } | { title: string; category: string; variant: Variant; preview: string }

function LazyPoster({ variant, preview, title }: { variant: Variant; preview: string; title: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [nearby, setNearby] = useState(false)
  const [canRender3D, setCanRender3D] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setNearby(entry?.isIntersecting ?? false), { rootMargin: '200px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    setCanRender3D(Boolean(gl))

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotionPreference = () => setReducedMotion(mediaQuery.matches)
    syncMotionPreference()
    mediaQuery.addEventListener?.('change', syncMotionPreference)
    return () => mediaQuery.removeEventListener?.('change', syncMotionPreference)
  }, [])

  const shouldRender3D = nearby && canRender3D && !reducedMotion

  return <div ref={container} className="h-full w-full">
    <img src={preview} alt={`${title} preview`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
    {shouldRender3D && <div className="absolute inset-0"><Suspense fallback={null}><PosterViewer variant={variant} /></Suspense></div>}
  </div>
}

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'spofiywebs — Posters, logos & websites' },
    { name: 'description', content: 'Independent creative studio making unforgettable posters, hand-drawn logos and websites. Explore the work and start a project.' },
    { property: 'og:title', content: 'spofiywebs — Posters, logos & websites' },
    { property: 'og:description', content: 'Independent creative studio making unforgettable posters, hand-drawn logos and websites.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Home,
})

function Home() {
  const [content, setContent] = useState<{ words: string[]; bio: string } | null>(null)
  const [work, setWork] = useState<{ id: string; title: string; category: string; imageUrl: string; sample?: boolean }[]>(samples)
  const [wordIndex, setWordIndex] = useState(0)
  const [owner, setOwner] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [replies, setReplies] = useState<{ id: string; reply: string | null }[]>([])
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [whatsappDraft, setWhatsappDraft] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [playVideo, setPlayVideo] = useState(false)
  const [viewing, setViewing] = useState<ProjectView | null>(null)
  const closeView = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!viewing) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeView.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setViewing(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown) }
  }, [viewing])

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (!connection?.saveData && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const startVideo = () => setPlayVideo(true)
      if (document.readyState === 'complete') {
        const timer = window.setTimeout(startVideo, 800)
        return () => window.clearTimeout(timer)
      }
      window.addEventListener('load', startVideo, { once: true })
      return () => window.removeEventListener('load', startVideo)
    }
    return undefined
  }, [])

  useEffect(() => {
    getStudio().then(data => {
      if (data.content) setContent(data.content)
      if (data.work.length) setWork(data.work)
    }).catch(() => {})
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle()
      setOwner(role?.role === 'admin')
    })
    try {
      const saved = JSON.parse(localStorage.getItem('spofiywebs-receipts') ?? '[]')
      if (Array.isArray(saved)) setReceipts(saved)
    } catch { /* ignore invalid local data */ }
  }, [])

  useEffect(() => {
    const words = content?.words?.length ? content.words : ['posters', 'logos', 'websites']
    if (words.length < 2) return
    const timer = window.setInterval(() => setWordIndex(index => (index + 1) % words.length), 2600)
    return () => window.clearInterval(timer)
  }, [content?.words])

  useEffect(() => {
    if (!receipts.length) return
    checkReplies({ data: { receipts } }).then(setReplies).catch(() => {})
  }, [receipts])

  useEffect(() => {
    if (!chatOpen || !receipts.length) return
    const timer = window.setInterval(() => { checkReplies({ data: { receipts } }).then(setReplies).catch(() => {}) }, 20000)
    return () => window.clearInterval(timer)
  }, [chatOpen, receipts])

  async function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true); setNotice(''); setWhatsappDraft('')
    const form = event.currentTarget
    const fields = new FormData(form)
    const message = String(fields.get('message') ?? '')
    const name = String(fields.get('name') ?? '')
    const senderEmail = String(fields.get('email') ?? '')
    try {
      const result = await sendInquiry({ data: {
        name, email: senderEmail, message, website: String(fields.get('website') ?? ''),
      } })
      const next = [...receipts, { ...result, message, sentAt: new Date().toISOString() }].slice(-20)
      localStorage.setItem('spofiywebs-receipts', JSON.stringify(next))
      setReceipts(next); setNotice('Saved here. Send the same message to the studio on WhatsApp:')
      setWhatsappDraft(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I’m ${name} (${senderEmail}).\n\n${message}`)}`)
      form.reset()
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Please try again.') }
    finally { setSending(false) }
  }

  const words = content?.words?.length ? content.words : ['posters', 'logos', 'websites']
  const nav = [ ['Work', '#work'], ['Services', '#services'], ['About', '#about'], ['Contact', '#contact'] ]

  return <div className="overflow-x-hidden bg-background text-foreground">
    <header className="absolute inset-x-0 top-0 z-30 border-b border-foreground/15">
      <div className="mx-auto flex h-20 max-w-[1480px] items-center justify-between px-6 lg:px-12">
        <a href="#home" className="font-display text-2xl font-bold tracking-normal">spofiywebs<span className="text-primary">.</span></a>
        <nav className="hidden items-center gap-9 md:flex" aria-label="Main navigation">
          {nav.map(([label, href]) => <a key={label} href={href} className="text-sm text-foreground/75 transition-colors hover:text-foreground">{label}</a>)}
          <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="transition-colors hover:text-primary"><Instagram size={18}/></a>
          {owner && <Link to="/studio" className="text-sm text-primary">Admin</Link>}
        </nav>
        <Button variant="studioGhost" size="icon" className="md:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</Button>
      </div>
      {menuOpen && <nav className="flex flex-col gap-5 border-t border-border bg-background px-6 py-7 md:hidden" aria-label="Mobile navigation">
        {nav.map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        <a href={instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a>
        {owner && <Link to="/studio">Admin</Link>}
      </nav>}
    </header>

    <main>
      <section id="home" className="relative flex min-h-[min(820px,92svh)] items-end overflow-hidden bg-background pt-32 md:min-h-[min(900px,92svh)]">
         <img src={heroPoster} alt="" fetchPriority="high" className="hero-video absolute inset-0 h-full w-full object-cover" />
         {playVideo && <video className="hero-video absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="none" aria-hidden="true"><source src={heroWebm.url} type="video/webm" /><source src={heroAsset.url} type="video/mp4" /></video>}
        <div className="hero-shade absolute inset-0" />
        <div className="relative z-10 mx-auto flex w-full max-w-[1480px] items-end justify-between px-6 pb-14 lg:px-12 lg:pb-20">
          <div className="max-w-5xl">
            <p className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.22em] text-foreground/80"><span className="h-px w-8 bg-primary"/> Independent creative studio</p>
            <h1 className="font-display text-[clamp(3.25rem,7.7vw,8.3rem)] font-medium leading-[.99]">I want to make<br/>your <span key={`${wordIndex}-${words[wordIndex % words.length]}`} className="word-enter inline-block text-primary">{words[wordIndex % words.length]}</span><br/>unforgettable<span className="text-primary">.</span></h1>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild variant="studio" size="lg" className="h-12 rounded-none px-7"><a href="#work">View the work <ArrowUpRight/></a></Button>
              <Button asChild variant="studioOutline" size="lg" className="h-12 rounded-none px-7"><a href="#contact">Start a project <ArrowRight/></a></Button>
            </div>
          </div>
          <a href="#work" aria-label="Scroll to work" className="hidden h-11 w-11 items-center justify-center rounded-full border border-foreground/50 transition-colors hover:bg-foreground hover:text-background md:flex"><ArrowDown size={18}/></a>
        </div>
      </section>

       <section id="work" className="work-rain relative isolate scroll-mt-8 overflow-hidden px-6 py-24 lg:px-12 lg:py-32">
         <div className="relative z-10 mx-auto max-w-[1384px]">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-7 border-b border-border pb-7">
            <div><p className="mb-4 text-xs font-semibold uppercase tracking-[.22em] text-primary">01 / Selected work</p><h2 className="font-display text-5xl font-medium md:text-7xl">Made to be seen<span className="text-primary">.</span></h2></div>
            <a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary">Full archive on Instagram <ArrowUpRight size={16}/></a>
          </div>
           <div className="mb-20 grid items-start gap-x-8 gap-y-12 md:grid-cols-[.9fr_1.1fr] lg:gap-x-12">
             {featuredDrawings.map((item, index) => <article key={item.id} className={`group min-w-0 ${index === 1 ? 'md:mt-24' : ''}`}>
               <div className={`relative flex items-center justify-center overflow-hidden border border-border/50 bg-secondary/95 p-3 sm:p-5 ${item.orientation === 'portrait' ? 'aspect-[.82]' : 'aspect-[1.4] md:aspect-[1.05]'}`}>
                  <img src={item.imageUrl} alt={`${item.title}, original black-and-white ink drawing`} loading="lazy" decoding="async" className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.025]" />
                  <Button variant="studio" className="absolute bottom-4 left-4 h-10 rounded-none px-4" onClick={() => setViewing({ title: item.title, category: item.category, imageUrl: item.imageUrl })} aria-label={`View ${item.title}`}><Eye size={17}/> View</Button>
                 <a href={item.imageUrl} download={`${item.id}.jpg`} target="_blank" rel="noopener noreferrer" aria-label={`Download ${item.title}`} title={`Download ${item.title}`} className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center bg-background text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"><ArrowDownToLine size={18}/></a>
               </div>
               <div className="mt-5 flex items-start justify-between gap-3 border-t border-border pt-4"><div><p className="mb-1 text-xs uppercase tracking-[.17em] text-muted-foreground">{item.category} / Original drawing</p><h3 className="font-display text-2xl font-medium">{item.title}</h3></div><span className="font-display text-xs text-muted-foreground">0{index + 1}</span></div>
             </article>)}
           </div>
           <div className="mb-8 flex items-center gap-5 border-t border-border pt-7"><span className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Three-dimensional work</span><span className="h-px flex-1 bg-border"/></div>
           <div className="mb-20 grid gap-x-6 gap-y-12 md:grid-cols-2">
            {models.map((model, index) => <article key={model.variant} className={index < 1 ? 'md:col-span-2' : ''}>
              <div className={`relative w-full overflow-hidden bg-secondary ${index < 1 ? 'h-[420px] sm:h-[560px] lg:h-[680px]' : 'h-[420px] sm:h-[500px]'}`}>
                 <LazyPoster variant={model.variant} preview={model.preview} title={model.title} />
                 <span className="pointer-events-none absolute bottom-5 left-5 hidden text-xs uppercase tracking-[.17em] text-foreground/75 sm:block">Drag to explore</span>
                  <Button variant="studio" className="absolute bottom-4 right-4 h-10 rounded-none px-4" onClick={() => setViewing({ title: model.title, category: model.category, variant: model.variant, preview: model.preview })} aria-label={`View ${model.title}`}><Eye size={17}/> View</Button>
              </div>
               <div className="mt-5 flex items-start justify-between gap-3"><div><p className="mb-1 text-xs uppercase tracking-[.17em] text-muted-foreground">{model.category}</p><h3 className="font-display text-2xl font-medium">{model.title}</h3>{model.variant === 'doll' && <p className="mt-2 text-xs text-muted-foreground">Model: <a href="https://sketchfab.com/3d-models/ball-joint-doll-basemesh-df21b9e5b2f34283aafb8bacee141496" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Ball Joint Doll Basemesh</a> by <a href="https://sketchfab.com/chambersu1996" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">ChamberSu1996</a> · <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">CC BY 4.0</a></p>}</div><span className="font-display text-xs text-muted-foreground">{String(index + featuredDrawings.length + 1).padStart(2, '0')}</span></div>
            </article>)}
          </div>
           <div className="mb-8 flex items-center gap-5 border-t border-border pt-7"><span className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Design studies</span><span className="h-px flex-1 bg-border"/></div>
           <div className="grid gap-x-6 gap-y-12 md:grid-cols-2">
            {work.map((item, index) => <article key={item.id} className="group min-w-0">
              <div className={`relative overflow-hidden bg-secondary ${index % 4 === 2 || index % 4 === 3 ? 'aspect-[1.13]' : 'aspect-[1.13]'}`}>
                 <img src={item.imageUrl} alt={`${item.title} — ${item.category}`} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
                 <Button variant="studio" className="absolute bottom-4 left-4 h-10 rounded-none px-4" onClick={() => setViewing({ title: item.title, category: item.category, imageUrl: item.imageUrl })} aria-label={`View ${item.title}`}><Eye size={17}/> View</Button>
                <a href={item.imageUrl} download={item.sample ? `${item.title.toLowerCase().replaceAll(' ', '-')}.jpg` : undefined} target="_blank" rel="noopener noreferrer" aria-label={`Download ${item.title}`} title={`Download ${item.title}`} className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center bg-background text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"><ArrowDownToLine size={18}/></a>
              </div>
                 <div className="mt-5 flex items-start justify-between gap-3"><div><p className="mb-1 text-xs uppercase tracking-[.17em] text-muted-foreground">{item.category}{item.sample ? ' / Concept study' : ''}</p><h3 className="font-display text-2xl font-medium">{item.title}</h3></div><span className="font-display text-xs text-muted-foreground">{String(index + models.length + featuredDrawings.length + 1).padStart(2, '0')}</span></div>
            </article>)}
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-8 border-y border-border bg-[var(--surface-deep)] px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1384px]"><p className="mb-4 text-xs font-semibold uppercase tracking-[.22em] text-primary">02 / What I do</p><h2 className="mb-12 font-display text-5xl font-medium md:text-7xl">The good stuff<span className="text-primary">.</span></h2>
          <div className="grid border-t border-border md:grid-cols-3">{services.map(service => <div key={service.no} className="border-b border-border py-9 md:border-r md:px-8 md:last:border-r-0 md:first:pl-0"><span className="text-xs text-primary">{service.no} /</span><h3 className="mt-12 font-display text-3xl font-medium">{service.name}</h3><p className="mt-4 max-w-xs text-sm leading-7 text-muted-foreground">{service.pitch}</p></div>)}</div>
        </div>
      </section>

      <section id="about" className="scroll-mt-8 px-6 py-24 lg:px-12 lg:py-32"><div className="mx-auto grid max-w-[1384px] gap-12 lg:grid-cols-[1fr_1.25fr] lg:gap-28">
        <div><p className="mb-4 text-xs font-semibold uppercase tracking-[.22em] text-primary">03 / About the studio</p><h2 className="font-display text-5xl font-medium md:text-7xl">A little about<br/>the maker<span className="text-primary">.</span></h2></div>
        <div className="lg:pt-11"><p className="max-w-2xl font-display text-2xl leading-relaxed md:text-3xl">{content?.bio ?? defaultBio}</p><div className="mt-14 border-t border-border pt-7"><p className="mb-5 text-xs uppercase tracking-[.2em] text-muted-foreground">Find me here</p><div className="flex flex-wrap gap-x-12 gap-y-5"><a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-primary"><Instagram size={18}/> @spofiywebs <ArrowUpRight size={15}/></a><a href={`mailto:${email}`} className="inline-flex items-center gap-2 hover:text-primary">{email} <ArrowUpRight size={15}/></a></div></div></div>
      </div></section>

      <section id="contact" className="scroll-mt-8 border-t border-border bg-[var(--surface-deep)] px-6 py-24 lg:px-12 lg:py-32"><div className="mx-auto max-w-[1384px]">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[.22em] text-primary">04 / Contact</p><h2 className="font-display text-5xl font-medium leading-[1.05] md:text-7xl">Have a good<br/>idea? Let’s<br/><span className="text-primary">make it real.</span></h2>
        <div className="mt-9 flex flex-wrap items-center gap-5"><Button variant="studio" size="lg" className="h-12 rounded-none px-7" onClick={() => setChatOpen(true)}><MessageCircle/> Chat with the studio</Button><a href={`mailto:${email}`} className="inline-flex items-center gap-2 text-sm hover:text-primary">Email instead <ArrowUpRight size={16}/></a></div>
      </div></section>
    </main>
    {viewing && <div role="dialog" aria-modal="true" aria-label={`View ${viewing.title}`} className="fixed inset-0 z-[60] flex flex-col bg-background/95" onClick={() => setViewing(null)}>
      <div className="mx-auto flex w-full max-w-[1480px] shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-8">
        <div className="min-w-0"><p className="text-xs uppercase text-muted-foreground">{viewing.category}</p><h2 className="truncate font-display text-xl font-medium sm:text-2xl">{viewing.title}</h2></div>
        <Button ref={closeView} variant="studioGhost" size="icon" className="h-11 w-11 shrink-0" onClick={() => setViewing(null)} aria-label="Close project view"><X size={24}/></Button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden px-3 py-4 sm:px-8 sm:py-6" onClick={event => event.stopPropagation()}>
        {'variant' in viewing ? <div className="relative mx-auto h-full w-full max-w-[1400px] bg-secondary"><LazyPoster variant={viewing.variant} preview={viewing.preview} title={viewing.title}/></div> : <img src={viewing.imageUrl} alt={`${viewing.title} — ${viewing.category}`} className="mx-auto h-full w-full object-contain" />}
      </div>
      <p className="shrink-0 px-5 pb-4 text-center text-xs text-muted-foreground sm:pb-6">{'variant' in viewing ? 'Drag to rotate' : viewing.title}</p>
    </div>}
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      {chatOpen && <section aria-label="Studio chat" className="mb-3 flex h-[min(590px,calc(100dvh-100px))] w-[min(390px,calc(100vw-32px))] flex-col border border-border bg-background shadow-2xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5"><div><p className="font-display text-lg font-medium">spofiywebs<span className="text-primary">.</span></p><p className="text-xs text-muted-foreground">Studio conversation</p></div><Button variant="studioGhost" size="icon" aria-label="Close chat" onClick={() => setChatOpen(false)}><X size={19}/></Button></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
          <div className="max-w-[85%] border-l-2 border-primary bg-secondary px-4 py-3 text-sm leading-6">Hi! Tell me about your project. I’ll reply here when I can.</div>
          {receipts.filter(item => item.message).map(item => <div key={item.id} className="space-y-3"><div className="ml-auto max-w-[85%] whitespace-pre-wrap bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">{item.message}</div>{replies.find(reply => reply.id === item.id)?.reply && <div className="max-w-[85%] whitespace-pre-wrap border-l-2 border-primary bg-secondary px-4 py-3 text-sm leading-6">{replies.find(reply => reply.id === item.id)?.reply}</div>}</div>)}
          {notice && <p role="status" className="text-xs text-muted-foreground">{notice}</p>}
          {whatsappDraft && <Button asChild variant="studio" className="h-10 rounded-none text-xs"><a href={whatsappDraft} target="_blank" rel="noopener noreferrer"><MessageCircle size={15}/> Open WhatsApp to send <ArrowUpRight size={15}/></a></Button>}
        </div>
        <form onSubmit={submitChat} className="shrink-0 space-y-3 border-t border-border p-4"><input name="website" type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          <div className="flex gap-2"><input name="name" type="text" required maxLength={100} placeholder="Your name" aria-label="Your name" className="min-w-0 w-1/2 border border-border bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"/><input name="email" type="email" required maxLength={254} placeholder="Your email" aria-label="Your email" className="min-w-0 w-1/2 border border-border bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"/></div>
          <div className="flex items-end gap-2"><textarea name="message" required maxLength={5000} rows={2} placeholder="Write your message…" aria-label="Your message" className="min-w-0 flex-1 resize-none border border-border bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"/><Button type="submit" variant="studio" size="icon" disabled={sending} aria-label={sending ? 'Sending message' : 'Send chat message'} className="h-11 w-11 shrink-0 rounded-none"><Send size={17}/></Button></div>
        </form>
      </section>}
      <Button variant="studio" size="icon" aria-label={chatOpen ? 'Close chat' : 'Open chat'} title={chatOpen ? 'Close chat' : 'Chat with the studio'} onClick={() => setChatOpen(open => !open)} className="ml-auto h-14 w-14 rounded-full shadow-xl">{chatOpen ? <X size={23}/> : <MessageCircle size={23}/>}</Button>
    </div>
    <footer className="border-t border-border px-6 py-8 lg:px-12"><div className="mx-auto flex max-w-[1384px] flex-wrap items-center justify-between gap-5 text-sm text-muted-foreground"><a href="#home" className="font-display text-xl font-bold text-foreground">spofiywebs<span className="text-primary">.</span></a><span>Independent by design. © {new Date().getFullYear()} spofiywebs</span><a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-foreground">Instagram <ArrowUpRight size={15}/></a></div></footer>
  </div>
}