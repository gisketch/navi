import { useState, useEffect, useCallback } from 'react';
import { pb } from '../utils/pocketbase';
import {
  POCKETBASE_COLLECTIONS,
  MOCK_OVERNIGHT_CARDS,
  MOCK_DAILY_SUMMARY,
  type OvernightCard,
  type DailySummary,
  type UrgencyLevel,
} from '../utils/constants';

interface UseOvernightSummariesReturn {
  cards: OvernightCard[];
  dailySummary: DailySummary | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  isMock: boolean;
  refetch: () => Promise<void>;
}

// Urgency sort order
const urgencyOrder: Record<UrgencyLevel, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Hook for fetching and subscribing to overnight summary cards from PocketBase.
 *
 * ## PocketBase Setup Guide
 *
 * ### Collection: overnight_cards
 * Create a collection with these fields:
 * - title (text, required)
 * - description (text, required)
 * - content (text, required) - Markdown content for modal
 * - urgency (select: urgent, high, medium, low)
 * - icon (text) - Lucide icon name (e.g., 'Mail', 'DollarSign')
 * - category (text) - e.g., 'email', 'finance', 'work'
 *
 * ### Collection: daily_summaries
 * - summary (text, required) - AI-generated summary text
 *
 * ### n8n Integration
 * Your n8n workflow should POST to PocketBase when new summaries are generated.
 *
 * ### To switch from mock data to real data:
 * 1. Create the PocketBase collections above
 * 2. Set USE_MOCK_DATA to false below
 * 3. Ensure your n8n workflow populates the collections
 */

// ⚠️ SET TO FALSE WHEN POCKETBASE IS CONFIGURED
const USE_MOCK_DATA = false;

export function useOvernightSummaries(): UseOvernightSummariesReturn {
  const [cards, setCards] = useState<OvernightCard[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(USE_MOCK_DATA);

  // Sort cards by urgency
  const sortByUrgency = useCallback((cardsToSort: OvernightCard[]) => {
    return [...cardsToSort].sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }, []);

  // Fetch cards from PocketBase
  const fetchCards = useCallback(async () => {
    if (USE_MOCK_DATA) {
      // Use mock data
      setCards(sortByUrgency(MOCK_OVERNIGHT_CARDS));
      setDailySummary(MOCK_DAILY_SUMMARY);
      setLastUpdated(new Date().toISOString());
      setIsMock(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch overnight cards (all recent cards)
      // Using requestKey: null to completely disable auto-cancellation
      const cardsResult = await pb.collection(POCKETBASE_COLLECTIONS.OVERNIGHT_CARDS).getList<OvernightCard>(1, 50, {
        sort: '-created',
        requestKey: null,
      });

      // Fetch latest daily summary
      const summaryResult = await pb.collection(POCKETBASE_COLLECTIONS.DAILY_SUMMARIES).getList<DailySummary>(1, 1, {
        sort: '-created',
        requestKey: null,
      });

      setCards(sortByUrgency(cardsResult.items));
      setDailySummary(summaryResult.items[0] || null);
      setLastUpdated(new Date().toISOString());
      setIsMock(false);
    } catch (err) {
      console.error('[useOvernightSummaries] Fetch error:', err);
      setError('Failed to fetch summaries. Using mock data.');
      // Fallback to mock data on error
      setCards(sortByUrgency(MOCK_OVERNIGHT_CARDS));
      setDailySummary(MOCK_DAILY_SUMMARY);
      setIsMock(true);
    } finally {
      setIsLoading(false);
    }
  }, [sortByUrgency]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (USE_MOCK_DATA) {
      fetchCards();
      return;
    }

    fetchCards();

    // Subscribe to overnight_cards changes
    const unsubscribeCards = pb.collection(POCKETBASE_COLLECTIONS.OVERNIGHT_CARDS).subscribe('*', (e) => {
      console.log('[PocketBase] Card event:', e.action);

      if (e.action === 'create') {
        setCards(prev => sortByUrgency([...prev, e.record as unknown as OvernightCard]));
      } else if (e.action === 'update') {
        setCards(prev => sortByUrgency(
          prev.map(card => card.id === e.record.id ? e.record as unknown as OvernightCard : card)
        ));
      } else if (e.action === 'delete') {
        setCards(prev => prev.filter(card => card.id !== e.record.id));
      }

      setLastUpdated(new Date().toISOString());
    });

    // Subscribe to daily_summaries changes
    const unsubscribeSummaries = pb.collection(POCKETBASE_COLLECTIONS.DAILY_SUMMARIES).subscribe('*', (e) => {
      console.log('[PocketBase] Summary event:', e.action);

      if (e.action === 'create' || e.action === 'update') {
        setDailySummary(e.record as unknown as DailySummary);
      }

      setLastUpdated(new Date().toISOString());
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeCards.then(unsub => unsub());
      unsubscribeSummaries.then(unsub => unsub());
    };
  }, [fetchCards, sortByUrgency]);

  return {
    cards,
    dailySummary,
    isLoading,
    error,
    lastUpdated,
    isMock,
    refetch: fetchCards,
  };
}
