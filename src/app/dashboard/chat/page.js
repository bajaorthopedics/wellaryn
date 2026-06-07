'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import {
  fetchChatContacts,
  fetchMessages,
  sendMessage,
  markMessagesRead,
} from '@/lib/supabase/data-service';
import styles from './chat.module.css';

// ─── Helpers ─────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateString, lang) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (lang === 'en') {
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d`;
  }
  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'ayer';
  return `${diffDays}d`;
}

function formatMessageTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDateLabel(dateString, lang) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return t('dashboard.chat.today', lang);
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return t('dashboard.chat.yesterday', lang);
  }
  return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getRoleBadgeClass(role) {
  if (role === 'coach') return styles.roleBadgeCoach;
  if (role === 'doctor') return styles.roleBadgeDoctor;
  return styles.roleBadgeAthlete;
}

function getRoleName(role, lang) {
  const names = {
    coach: { en: 'Coach', es: 'Coach' },
    doctor: { en: 'Doctor', es: 'Doctor' },
    athlete: { en: 'Athlete', es: 'Atleta' },
  };
  return names[role]?.[lang] || role;
}

// ─── Chat Page ───────────────────────────────────────────────

export default function ChatPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { lang } = useLanguage();

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const messageAreaRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Load contacts ──────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    if (!user?.id || !profile?.role) return;
    try {
      const data = await fetchChatContacts(user.id, profile.role);
      setContacts(data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  }, [user?.id, profile?.role]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // ─── Load messages for selected contact ─────────────────────
  const loadMessages = useCallback(async () => {
    if (!user?.id || !selectedContact?.id) return;
    setLoadingMessages(true);
    try {
      const data = await fetchMessages(user.id, selectedContact.id);
      setMessages(data);

      // Mark as read
      await markMessagesRead(user.id, selectedContact.id);

      // Update local contact unread count
      setContacts((prev) =>
        prev.map((c) =>
          c.id === selectedContact.id ? { ...c, unreadCount: 0 } : c
        )
      );
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [user?.id, selectedContact?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ─── Auto-scroll to bottom ──────────────────────────────────
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ─── Supabase Realtime subscription ─────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const supabase = getSupabaseBrowser();

    // Check if channel method exists (mock client won't have it)
    if (typeof supabase.channel !== 'function') return;

    const channel = supabase
      .channel(`chat-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new;

          // If we're viewing this contact's chat, add the message & mark read
          if (selectedContact && newMsg.sender_id === selectedContact.id) {
            setMessages((prev) => [...prev, newMsg]);
            markMessagesRead(user.id, selectedContact.id).catch(console.error);
          }

          // Update contact list — bump last message and unread count
          setContacts((prev) => {
            const updated = prev.map((c) => {
              if (c.id === newMsg.sender_id) {
                return {
                  ...c,
                  lastMessage: {
                    id: newMsg.id,
                    message: newMsg.message,
                    sender_id: newMsg.sender_id,
                    created_at: newMsg.created_at,
                    read: newMsg.read,
                  },
                  unreadCount:
                    selectedContact?.id === newMsg.sender_id
                      ? 0
                      : c.unreadCount + 1,
                };
              }
              return c;
            });

            // Re-sort by most recent
            updated.sort((a, b) => {
              const aTime = a.lastMessage?.created_at || '1970-01-01';
              const bTime = b.lastMessage?.created_at || '1970-01-01';
              return new Date(bTime) - new Date(aTime);
            });

            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          // Update read receipts for our sent messages
          const updatedMsg = payload.new;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedContact?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Send message ───────────────────────────────────────────
  async function handleSend() {
    const text = messageText.trim();
    if (!text || !selectedContact || sending) return;

    setSending(true);
    try {
      const newMsg = await sendMessage(user.id, selectedContact.id, text);
      setMessages((prev) => [...prev, newMsg]);
      setMessageText('');

      // Update contact list last message
      setContacts((prev) => {
        const updated = prev.map((c) =>
          c.id === selectedContact.id
            ? {
                ...c,
                lastMessage: {
                  id: newMsg.id,
                  message: newMsg.message,
                  sender_id: newMsg.sender_id,
                  created_at: newMsg.created_at,
                  read: newMsg.read,
                },
              }
            : c
        );
        updated.sort((a, b) => {
          const aTime = a.lastMessage?.created_at || '1970-01-01';
          const bTime = b.lastMessage?.created_at || '1970-01-01';
          return new Date(bTime) - new Date(aTime);
        });
        return updated;
      });

      // Focus back on input
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ─── Select contact ────────────────────────────────────────
  function handleSelectContact(contact) {
    setSelectedContact(contact);
    setMobileShowChat(true);
  }

  function handleBack() {
    setMobileShowChat(false);
    setSelectedContact(null);
    setMessages([]);
  }

  // ─── Filter contacts by search ─────────────────────────────
  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.display_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q)
    );
  });

  // ─── Group messages by date ────────────────────────────────
  function groupMessagesByDate(msgs) {
    const groups = [];
    let currentDate = null;

    for (const msg of msgs) {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', label: getDateLabel(msg.created_at, lang) });
      }
      groups.push({ type: 'message', data: msg });
    }

    return groups;
  }

  // ─── Render ─────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>{t('dashboard.loading', lang)}</span>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('dashboard.chat.title', lang)}</h1>
      </div>

      <div className={styles.chatContainer}>
        {/* ─── Left Panel: Contact List ─── */}
        <div
          className={`${styles.contactPanel} ${
            mobileShowChat ? styles.contactPanelHidden : ''
          }`}
        >
          {/* Search bar */}
          <div className={styles.searchBar}>
            <div className={styles.searchInputWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder={t('dashboard.chat.search', lang)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Contact list */}
          <div className={styles.contactList}>
            {loadingContacts ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>💬</div>
                <div className={styles.emptyText}>
                  {t('dashboard.chat.noContacts', lang)}
                </div>
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`${styles.contactItem} ${
                    selectedContact?.id === contact.id
                      ? styles.contactItemActive
                      : ''
                  }`}
                  onClick={() => handleSelectContact(contact)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && handleSelectContact(contact)
                  }
                >
                  <div className={styles.contactAvatar}>
                    {getInitials(contact.display_name)}
                  </div>
                  <div className={styles.contactInfo}>
                    <div className={styles.contactTop}>
                      <span className={styles.contactName}>
                        {contact.display_name || contact.email}
                        <span
                          className={`${styles.roleBadge} ${getRoleBadgeClass(
                            contact.role
                          )}`}
                        >
                          {getRoleName(contact.role, lang)}
                        </span>
                      </span>
                      <span className={styles.contactTime}>
                        {timeAgo(contact.lastMessage?.created_at, lang)}
                      </span>
                    </div>
                    <div className={styles.contactBottom}>
                      <span className={styles.contactPreview}>
                        {contact.lastMessage
                          ? contact.lastMessage.sender_id === user.id
                            ? `${lang === 'en' ? 'You' : 'Tú'}: ${contact.lastMessage.message}`
                            : contact.lastMessage.message
                          : t('dashboard.chat.noMessages', lang)}
                      </span>
                      {contact.unreadCount > 0 && (
                        <span className={styles.unreadBadge}>
                          {contact.unreadCount > 99
                            ? '99+'
                            : contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Right Panel: Conversation ─── */}
        <div
          className={`${styles.conversationPanel} ${
            mobileShowChat ? styles.conversationPanelVisible : ''
          }`}
        >
          {selectedContact ? (
            <>
              {/* Conversation header */}
              <div className={styles.conversationHeader}>
                <button
                  className={styles.backBtn}
                  onClick={handleBack}
                  aria-label={lang === 'en' ? 'Back' : 'Atrás'}
                >
                  ←
                </button>
                <div className={styles.headerAvatar}>
                  {getInitials(selectedContact.display_name)}
                </div>
                <div className={styles.headerInfo}>
                  <div className={styles.headerName}>
                    {selectedContact.display_name || selectedContact.email}
                  </div>
                  <div className={styles.headerRole}>
                    {getRoleName(selectedContact.role, lang)}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className={styles.messageArea} ref={messageAreaRef}>
                {loadingMessages ? (
                  <div className={styles.loading}>
                    <div className={styles.spinner} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className={styles.noMessages}>
                    <div className={styles.noMessagesIcon}>👋</div>
                    <div className={styles.noMessagesText}>
                      {t('dashboard.chat.noMessages', lang)}
                    </div>
                  </div>
                ) : (
                  <>
                    {groupedMessages.map((item, idx) => {
                      if (item.type === 'date') {
                        return (
                          <div key={`date-${idx}`} className={styles.dateSeparator}>
                            <span className={styles.datePill}>{item.label}</span>
                          </div>
                        );
                      }

                      const msg = item.data;
                      const isSent = msg.sender_id === user.id;

                      return (
                        <div
                          key={msg.id}
                          className={`${styles.messageRow} ${
                            isSent
                              ? styles.messageRowSent
                              : styles.messageRowReceived
                          }`}
                        >
                          <div
                            className={`${styles.messageBubble} ${
                              isSent
                                ? styles.messageBubbleSent
                                : styles.messageBubbleReceived
                            }`}
                          >
                            {msg.message}
                            <div className={styles.messageMeta}>
                              <span>{formatMessageTime(msg.created_at)}</span>
                              {isSent && (
                                <span
                                  className={`${styles.readReceipt} ${
                                    msg.read ? styles.readReceiptRead : ''
                                  }`}
                                >
                                  {msg.read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input bar */}
              <div className={styles.inputBar}>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.messageInput}
                  placeholder={t('dashboard.chat.typePlaceholder', lang)}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <button
                  className={styles.sendBtn}
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  aria-label={t('dashboard.chat.send', lang)}
                >
                  ➤
                </button>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>💬</div>
              <div className={styles.emptyTitle}>
                {t('dashboard.chat.selectContact', lang)}
              </div>
              <div className={styles.emptyText}>
                {t('dashboard.chat.noContacts', lang)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
