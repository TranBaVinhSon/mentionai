interface ConversationData {
  total: number;
  limit: number;
  offset: number;
  conversations: Array<{
    id: number;
    userId: number;
    title?: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    messages: Array<{
      id: number;
      content: string;
      role: string;
      createdAt: string;
    }>;
  }>;
}

interface DailyMetric {
  date: string;
  conversationCount: number;
  messageCount: number;
}

/**
 * Aggregates conversation data into daily metrics for visualization
 */
export function aggregateDailyConversationMetrics(
  conversationData: ConversationData,
  startDate: Date,
  endDate: Date
): DailyMetric[] {
  // Initialize daily metrics map
  const dailyMetrics = new Map<string, { conversationCount: number; messageCount: number }>();
  
  // Initialize all dates in range with zero counts
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyMetrics.set(dateKey, { conversationCount: 0, messageCount: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Aggregate conversations by creation date
  conversationData.conversations.forEach(conversation => {
    const conversationDate = new Date(conversation.createdAt).toISOString().split('T')[0];
    
    if (dailyMetrics.has(conversationDate)) {
      const existing = dailyMetrics.get(conversationDate)!;
      existing.conversationCount += 1;
      
      // Count messages created on the same day as the conversation
      conversation.messages.forEach(message => {
        const messageDate = new Date(message.createdAt).toISOString().split('T')[0];
        if (messageDate === conversationDate && dailyMetrics.has(messageDate)) {
          dailyMetrics.get(messageDate)!.messageCount += 1;
        }
      });
    }
  });

  // Also count messages that were created on different days (ongoing conversations)
  conversationData.conversations.forEach(conversation => {
    conversation.messages.forEach(message => {
      const messageDate = new Date(message.createdAt).toISOString().split('T')[0];
      const conversationDate = new Date(conversation.createdAt).toISOString().split('T')[0];
      
      // Only count messages that are not already counted above
      if (messageDate !== conversationDate && dailyMetrics.has(messageDate)) {
        dailyMetrics.get(messageDate)!.messageCount += 1;
      }
    });
  });

  // Convert to array and sort by date
  return Array.from(dailyMetrics.entries())
    .map(([date, metrics]) => ({
      date,
      conversationCount: metrics.conversationCount,
      messageCount: metrics.messageCount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculates total conversation and message counts from conversation data
 */
export function calculateTotals(conversationData: ConversationData) {
  const totalConversations = conversationData.conversations.length;
  const totalMessages = conversationData.conversations.reduce(
    (total, conversation) => total + conversation.messageCount,
    0
  );

  return {
    totalConversations,
    totalMessages,
  };
}

/**
 * Tracks app page view analytics
 * @deprecated Use gengarApi.trackPageView() instead
 */
export async function trackAppPageView(
  appId: string, 
  backendUrl: string,
  location?: {
    latitude: number;
    longitude: number;
    country?: string;
    city?: string;
    region?: string;
  }
) {
  // This function is deprecated - use gengarApi.trackPageView() instead
  console.warn('trackAppPageView is deprecated. Use gengarApi.trackPageView() instead');
}