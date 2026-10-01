import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'node:crypto'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import type { Database } from '@/integrations/supabase/types'

function publicClient() {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!
  return createClient<Database>(process.env['SUPABASE_URL']!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers)
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization')
      headers.set('apikey', key)
      return fetch(input, { ...init, headers })
    } },
  })
}

const hash = (receipt: string) => createHash('sha256').update(receipt).digest('hex')

export const getStudio = createServerFn({ method: 'GET' }).handler(async () => {
  const client = publicClient()
  const [contentResult, workResult] = await Promise.all([
    client.from('site_content').select('words,bio').eq('id', 1).single(),
    client.from('portfolio').select('id,title,category,image_path,created_at').order('created_at', { ascending: false }),
  ])
  const work = await Promise.all((workResult.data ?? []).map(async item => {
    const { data } = await client.storage.from('portfolio').createSignedUrl(item.image_path, 3600)
    return { ...item, imageUrl: data?.signedUrl ?? '' }
  }))
  return { content: contentResult.data, work }
})

export const sendInquiry = createServerFn({ method: 'POST' })
  .validator((data: { name: string; email: string; message: string; website?: string }) => data)
  .handler(async ({ data }) => {
    if (data.website) throw new Error('Unable to send this message.')
    const name = data.name.trim(), email = data.email.trim(), message = data.message.trim()
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !message || message.length > 5000) throw new Error('Please check your details and try again.')
    const receipt = randomBytes(32).toString('hex')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: row, error } = await supabaseAdmin.from('inquiries').insert({ name, email, message, receipt_hash: hash(receipt) }).select('id').single()
    if (error || !row) throw new Error('Message could not be sent. Please email instead.')
    return { id: row.id, receipt }
  })

export const checkReplies = createServerFn({ method: 'POST' })
  .validator((data: { receipts: { id: string; receipt: string }[] }) => data)
  .handler(async ({ data }) => {
    const entries = data.receipts.slice(0, 20).filter(item => /^[0-9a-f-]{36}$/.test(item.id) && /^[0-9a-f]{64}$/.test(item.receipt))
    if (!entries.length) return []
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: rows } = await supabaseAdmin.from('inquiries').select('id,reply,receipt_hash').in('id', entries.map(item => item.id))
    return (rows ?? []).filter(row => entries.some(item => item.id === row.id && hash(item.receipt) === row.receipt_hash)).map(row => ({ id: row.id, reply: row.reply }))
  })

export const ensureOwner = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: result, error } = await context.supabase.auth.getUser()
    if (error || !result.user || result.user.email?.toLowerCase() !== 'spofiywebs37@gmail.com' || !result.user.email_confirmed_at) return { owner: false }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error: roleError } = await supabaseAdmin.from('user_roles').upsert({ user_id: context.userId, role: 'admin' }, { onConflict: 'user_id' })
    if (roleError) throw new Error('Owner access is unavailable.')
    return { owner: true }
  })