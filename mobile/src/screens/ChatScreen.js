import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  FlatList, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, fonts } from '../theme';

function MessageBubble({ message, isOwn }) {
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
      <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{message.message}</Text>
      <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>{time}</Text>
    </View>
  );
}

function ConversationItem({ contact, lastMessage, unread, onPress }) {
  const initial = (contact?.display_name || contact?.email || '?')[0].toUpperCase();
  return (
    <TouchableOpacity style={styles.convItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.convAvatar}>
        <Text style={styles.convAvatarText}>{initial}</Text>
      </View>
      <View style={styles.convInfo}>
        <Text style={styles.convName}>{contact?.display_name || contact?.email || 'Usuario'}</Text>
        <Text style={styles.convLastMsg} numberOfLines={1}>{lastMessage || 'Sin mensajes'}</Text>
      </View>
      {unread > 0 && (
        <View style={styles.convBadge}>
          <Text style={styles.convBadgeText}>{unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('sender_id, receiver_id, message, created_at, read')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    // Group by contact
    const contactMap = {};
    data.forEach(msg => {
      const contactId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!contactMap[contactId]) {
        contactMap[contactId] = { contactId, lastMessage: msg.message, lastTime: msg.created_at, unread: 0 };
      }
      if (msg.receiver_id === user.id && !msg.read) contactMap[contactId].unread++;
    });

    // Fetch contact profiles
    const contactIds = Object.keys(contactMap);
    if (contactIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email, role')
        .in('id', contactIds);
      
      const convs = Object.values(contactMap).map(c => ({
        ...c,
        contact: profiles?.find(p => p.id === c.contactId) || { id: c.contactId },
      }));
      convs.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
      setConversations(convs);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Fetch messages for selected contact
  const fetchMessages = useCallback(async () => {
    if (!user || !selectedContact) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);

    // Mark as read
    await supabase
      .from('chat_messages')
      .update({ read: true })
      .eq('sender_id', selectedContact.id)
      .eq('receiver_id', user.id)
      .eq('read', false);
  }, [user, selectedContact]);

  useEffect(() => { if (selectedContact) fetchMessages(); }, [fetchMessages, selectedContact]);

  // Real-time subscription
  useEffect(() => {
    if (!user || !selectedContact) return;
    const channel = supabase
      .channel('chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new.sender_id === selectedContact.id) {
          setMessages(prev => [...prev, payload.new]);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, selectedContact]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const { data } = await supabase
      .from('chat_messages')
      .insert({ sender_id: user.id, receiver_id: selectedContact.id, message: newMessage.trim() })
      .select()
      .single();
    if (data) setMessages(prev => [...prev, data]);
    setNewMessage('');
    setSending(false);
  };

  // Conversation list view
  if (!selectedContact) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.title}>Mensajes</Text>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Sin conversaciones</Text>
            <Text style={styles.emptyDesc}>Conecta con un coach o atleta para empezar a chatear</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.convList}>
            {conversations.map(conv => (
              <ConversationItem
                key={conv.contactId}
                contact={conv.contact}
                lastMessage={conv.lastMessage}
                unread={conv.unread}
                onPress={() => setSelectedContact(conv.contact)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // Chat view
  const contactName = selectedContact.display_name || selectedContact.email || 'Usuario';
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <StatusBar style="light" />
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setSelectedContact(null)} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Atrás</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <View style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>{contactName[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.chatHeaderName}>{contactName}</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isOwn={item.sender_id === user.id} />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!newMessage.trim() || sending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  title: { fontSize: 28, ...fonts.bold, color: colors.textPrimary },
  // Conversation list
  convList: { paddingHorizontal: spacing.xl },
  convItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  convAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  convAvatarText: { fontSize: 18, ...fonts.bold, color: colors.accent },
  convInfo: { flex: 1 },
  convName: { fontSize: 15, ...fonts.semibold, color: colors.textPrimary },
  convLastMsg: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  convBadge: {
    backgroundColor: colors.accent, borderRadius: 12,
    minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  convBadgeText: { fontSize: 12, ...fonts.bold, color: '#fff' },
  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 18, ...fonts.bold, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyDesc: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  // Chat header
  chatHeader: {
    paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    backgroundColor: colors.bgElevated, borderBottomWidth: 1, borderBottomColor: colors.glassBorder,
  },
  backBtn: { marginBottom: spacing.sm },
  backBtnText: { fontSize: 14, color: colors.accent, ...fonts.semibold },
  chatHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chatAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  chatAvatarText: { fontSize: 14, ...fonts.bold, color: colors.accent },
  chatHeaderName: { fontSize: 16, ...fonts.semibold, color: colors.textPrimary },
  // Messages
  messageList: { padding: spacing.lg, paddingBottom: spacing.xl },
  bubble: {
    maxWidth: '78%', padding: spacing.md, borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  bubbleOwn: {
    backgroundColor: colors.accent, alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.bgElevated, alignSelf: 'flex-start',
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.glassBorder,
  },
  bubbleText: { fontSize: 15, color: colors.textPrimary, lineHeight: 20 },
  bubbleTextOwn: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  bubbleTimeOwn: { color: 'rgba(255,255,255,0.7)' },
  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    paddingBottom: 34, backgroundColor: colors.bgElevated,
    borderTopWidth: 1, borderTopColor: colors.glassBorder,
  },
  input: {
    flex: 1, backgroundColor: colors.bg, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    color: colors.textPrimary, fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: '#fff', ...fonts.bold },
});
