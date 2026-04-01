cat > lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export const db = {
  async createChat(name: string) {
    const { data, error } = await supabase
      .from('chats')
      .insert({ name, current_users: 1 })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getChat(chatId: string) {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single()
    if (error) throw error
    return data
  },

  async addMessage(chatId: string, encryptedContent: string, senderName: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        encrypted_content: encryptedContent,
        sender_name: senderName
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getMessages(chatId: string, limit: number = 500) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(limit)
    if (error) throw error
    return data
  },

  async addParticipant(chatId: string, userName: string) {
    const { error } = await supabase
      .from('participants')
      .insert({ chat_id: chatId, user_name: userName })
    if (error) throw error
  },

  async removeParticipant(chatId: string, userName: string) {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_name', userName)
    if (error) throw error
  },

  async getParticipants(chatId: string) {
    const { data, error } = await supabase
      .from('participants')
      .select('user_name')
      .eq('chat_id', chatId)
    if (error) throw error
    return data.map(p => p.user_name)
  },

  async getParticipantCount(chatId: string) {
    const { count, error } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId)
    if (error) throw error
    return count || 0
  },

  async createInvite(chatId: string, code: string) {
    const { data, error } = await supabase
      .from('invites')
      .insert({
        chat_id: chatId,
        code,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async validateInvite(code: string) {
    const { data, error } = await supabase
      .from('invites')
      .select('chat_id')
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (error) throw error
    return data
  },
}
EOF