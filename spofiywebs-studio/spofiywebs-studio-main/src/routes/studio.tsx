import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowUpRight, LogOut, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { lovable } from '@/integrations/lovable'
import { ensureOwner, getStudio } from '@/lib/studio.functions'

export const Route = createFileRoute('/studio')({
  head: () => ({ meta: [
    { title: 'Studio access — spofiywebs' },
    { name: 'description', content: 'Private studio management for spofiywebs.' },
    { property: 'og:title', content: 'Studio access — spofiywebs' },
    { property: 'og:description', content: 'Private studio management for spofiywebs.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: Studio,
})

type Inquiry = { id: string; name: string; email: string; message: string; reply: string | null; created_at: string }
type Work = { id: string; title: string; category: string; image_path: string; imageUrl: string | undefined }

function Studio() {
  const [status, setStatus] = useState<'loading' | 'signed-out' | 'denied' | 'owner'>('loading')
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [tab, setTab] = useState<'Content' | 'Portfolio' | 'Messages'>('Content')
  const [words, setWords] = useState('posters, logos, websites')
  const [bio, setBio] = useState('')
  const [work, setWork] = useState<Work[]>([])
  const [messages, setMessages] = useState<Inquiry[]>([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadOwner() {
    const studio = await getStudio()
    if (studio.content) { setWords(studio.content.words.join(', ')); setBio(studio.content.bio) }
    const [workResult, messagesResult] = await Promise.all([
      supabase.from('portfolio').select('id,title,category,image_path').order('created_at', { ascending: false }),
      supabase.from('inquiries').select('id,name,email,message,reply,created_at').order('created_at', { ascending: false }),
    ])
    setWork((workResult.data ?? []).map(item => ({ ...item, imageUrl: studio.work.find(value => value.id === item.id)?.imageUrl })))
    setMessages(messagesResult.data ?? [])
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setStatus('signed-out'); return }
      try {
        const result = await ensureOwner()
        if (!result.owner) { setStatus('denied'); return }
        setStatus('owner'); await loadOwner()
      } catch { setNotice('Studio access is temporarily unavailable.'); setStatus('denied') }
    })
  }, [])

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('')
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? ''), password = String(data.get('password') ?? '')
    try {
      if (authMode === 'sign-up') {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/studio` } })
        if (error) throw error
        setNotice('Check your email to confirm your account, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const result = await ensureOwner()
        if (!result.owner) { setStatus('denied'); return }
        setStatus('owner'); await loadOwner()
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not sign in.') }
    finally { setBusy(false) }
  }

  async function googleSignIn() {
    setNotice(''); setBusy(true)
    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/studio` })
    if (result.error) setNotice(result.error.message)
    else if (!result.redirected) window.location.reload()
    setBusy(false)
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('')
    const parsed = words.split(',').map(value => value.trim()).filter(Boolean)
    if (!parsed.length || parsed.length > 8 || parsed.some(value => value.length > 30) || bio.trim().length > 1500) { setNotice('Add 1–8 short words and a bio under 1,500 characters.'); setBusy(false); return }
    const { error } = await supabase.from('site_content').update({ words: parsed, bio: bio.trim() }).eq('id', 1)
    setNotice(error ? error.message : 'Changes saved.'); setBusy(false)
  }

  async function addWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('')
    const form = event.currentTarget, data = new FormData(form)
    const title = String(data.get('title') ?? '').trim(), category = String(data.get('category') ?? '')
    const file = data.get('image')
    if (!(file instanceof File) || !file.size || !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { setNotice('Choose an image smaller than 10 MB.'); setBusy(false); return }
    const path = `${crypto.randomUUID()}.${file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'}`
    const uploaded = await supabase.storage.from('portfolio').upload(path, file, { contentType: file.type })
    if (uploaded.error) { setNotice(uploaded.error.message); setBusy(false); return }
    const inserted = await supabase.from('portfolio').insert({ title, category, image_path: path })
    if (inserted.error) { await supabase.storage.from('portfolio').remove([path]); setNotice(inserted.error.message) }
    else { form.reset(); setNotice('Work added.'); await loadOwner() }
    setBusy(false)
  }

  async function removeWork(item: Work) {
    if (!window.confirm(`Remove “${item.title}” from the portfolio?`)) return
    const { error } = await supabase.from('portfolio').delete().eq('id', item.id)
    if (error) { setNotice(error.message); return }
    await supabase.storage.from('portfolio').remove([item.image_path])
    setWork(current => current.filter(value => value.id !== item.id))
  }

  async function reply(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); setBusy(true); setNotice('')
    const data = new FormData(event.currentTarget)
    const { error } = await supabase.from('inquiries').update({ reply: String(data.get('reply') ?? '').trim() || null }).eq('id', id)
    setNotice(error ? error.message : 'Reply saved. The visitor can see it when they return using the same browser.')
    setBusy(false)
    if (!error) await loadOwner()
  }

  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex h-20 max-w-[1384px] items-center justify-between px-6 lg:px-12"><Link to="/" className="font-display text-2xl font-bold">spofiywebs<span className="text-primary">.</span></Link><Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16}/> Back to site</Link></div></header>
    <main className="mx-auto max-w-[1384px] px-6 py-16 lg:px-12">
      {status === 'loading' && <p className="text-muted-foreground">Checking access...</p>}
      {status === 'denied' && <div className="max-w-md"><h1 className="font-display text-4xl">Private studio.</h1><p className="mt-5 text-muted-foreground">This area is only available to the studio owner.</p><Button variant="studioOutline" className="mt-8" onClick={async () => { await supabase.auth.signOut(); setStatus('signed-out') }}>Use another account</Button></div>}
      {status === 'signed-out' && <div className="mx-auto max-w-md"><p className="mb-4 text-xs uppercase tracking-[.2em] text-primary">Private access</p><h1 className="font-display text-5xl">Studio sign in<span className="text-primary">.</span></h1><p className="mt-5 text-sm leading-7 text-muted-foreground">Only the verified studio owner can manage this space.</p>
        <form onSubmit={submitAuth} className="mt-10 space-y-5"><label className="block text-sm">Email<input name="email" required type="email" className="mt-2 w-full border border-border bg-secondary px-4 py-3 outline-none focus:border-primary" /></label><label className="block text-sm">Password<input name="password" required type="password" minLength={6} className="mt-2 w-full border border-border bg-secondary px-4 py-3 outline-none focus:border-primary" /></label><Button type="submit" disabled={busy} variant="studio" className="w-full rounded-none">{authMode === 'sign-in' ? 'Sign in' : 'Create owner account'}</Button></form>
        <Button variant="studioOutline" onClick={googleSignIn} disabled={busy} className="mt-3 w-full rounded-none">Continue with Google</Button>
        <Button variant="studioGhost" onClick={() => { setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in'); setNotice('') }} className="mt-4 p-0 text-sm">{authMode === 'sign-in' ? 'First time? Create an account' : 'Already have an account? Sign in'}</Button>
      </div>}
      {status === 'owner' && <div><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-3 text-xs uppercase tracking-[.2em] text-primary">Owner workspace</p><h1 className="font-display text-5xl">The studio<span className="text-primary">.</span></h1></div><Button variant="studioGhost" onClick={async () => { await supabase.auth.signOut(); setStatus('signed-out') }}><LogOut/> Sign out</Button></div>
        <div className="mt-12 flex gap-8 overflow-x-auto border-b border-border">{(['Content','Portfolio','Messages'] as const).map(item => <Button key={item} variant="studioGhost" onClick={() => { setTab(item); setNotice('') }} className={`h-12 rounded-none border-b-2 px-0 ${tab === item ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}>{item}{item === 'Messages' && messages.filter(message => !message.reply).length > 0 ? ` (${messages.filter(message => !message.reply).length})` : ''}</Button>)}</div>
        {tab === 'Content' && <form onSubmit={saveContent} className="mt-12 max-w-2xl space-y-8"><div><h2 className="font-display text-2xl">Homepage & about</h2><p className="mt-2 text-sm text-muted-foreground">Separate rotating words with commas.</p></div><label className="block text-sm">Headline words<input value={words} onChange={event => setWords(event.target.value)} className="mt-3 w-full border border-border bg-secondary px-4 py-3 outline-none focus:border-primary" /></label><label className="block text-sm">About bio<textarea value={bio} onChange={event => setBio(event.target.value)} rows={6} className="mt-3 w-full border border-border bg-secondary px-4 py-3 outline-none focus:border-primary" /></label><Button disabled={busy} variant="studio" className="rounded-none">Save changes <ArrowUpRight/></Button></form>}
        {tab === 'Portfolio' && <div className="mt-12 grid gap-16 lg:grid-cols-[.85fr_1.15fr]"><form onSubmit={addWork} className="space-y-6"><h2 className="font-display text-2xl">Add work</h2><label className="block text-sm">Title<input name="title" required maxLength={120} className="mt-3 w-full border border-border bg-secondary px-4 py-3 outline-none focus:border-primary" /></label><label className="block text-sm">Category<select name="category" className="mt-3 w-full border border-border bg-secondary px-4 py-3 outline-none focus:border-primary"><option>Poster Design</option><option>Logo Design</option><option>Website Design</option></select></label><label className="block text-sm">Artwork image<input name="image" required type="file" accept="image/*" className="mt-3 block w-full border border-border bg-secondary px-4 py-3 text-sm file:mr-4 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground" /></label><Button disabled={busy} variant="studio" className="rounded-none"><Plus/> Add to portfolio</Button></form><div><h2 className="mb-6 font-display text-2xl">Published work</h2>{work.length ? <div className="space-y-4">{work.map(item => <div key={item.id} className="flex items-center gap-4 border-b border-border pb-4"><img src={item.imageUrl} alt="" className="h-20 w-20 bg-secondary object-cover"/><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.category}</p></div><Button variant="studioGhost" size="icon" aria-label={`Remove ${item.title}`} title={`Remove ${item.title}`} onClick={() => removeWork(item)}><Trash2 size={17}/></Button></div>)}</div> : <p className="text-sm text-muted-foreground">Your uploaded work will appear here. Until then, the public page shows concept studies.</p>}</div></div>}
        {tab === 'Messages' && <div className="mt-12 max-w-4xl"><h2 className="mb-8 font-display text-2xl">Inquiries</h2>{messages.length ? <div className="space-y-8">{messages.map(item => <article key={item.id} className="border-b border-border pb-8"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-display text-xl">{item.name}</h3><a href={`mailto:${item.email}`} className="text-sm text-primary hover:underline">{item.email}</a></div><time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</time></div><p className="my-6 whitespace-pre-wrap text-sm leading-7">{item.message}</p><form onSubmit={event => reply(event, item.id)}><label className="text-xs uppercase tracking-[.16em] text-muted-foreground">Reply<textarea name="reply" key={`${item.id}-${item.reply}`} defaultValue={item.reply ?? ''} rows={3} className="mt-3 block w-full border border-border bg-secondary p-4 text-sm normal-case tracking-normal text-foreground outline-none focus:border-primary" /></label><Button variant="studio" disabled={busy} className="mt-4 rounded-none">Save reply <ArrowUpRight/></Button></form></article>)}</div> : <p className="text-sm text-muted-foreground">No messages yet.</p>}</div>}
      </div>}
      {notice && <p role="status" className="mt-8 text-sm text-primary">{notice}</p>}
    </main>
  </div>
}