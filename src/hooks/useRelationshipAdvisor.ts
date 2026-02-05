import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';

interface RelationshipData {
  companyName: string;
  marketSector: string;
  stage: string;
  strength: string;
  lastInteractionDate: string | null;
  daysSinceContact: number;
  estimatedValue: number;
  recentInteractions: Array<{
    type: string;
    notes: string | null;
    date: string;
  }>;
}

export interface AISuggestion {
  companyName: string;
  action: string;
  urgency: 'high' | 'medium' | 'low';
  rationale: string;
}

export function useRelationshipAdvisor() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async (
    atRiskRelationships: Array<{
      relationship: {
        id: string;
        client_company_id: string;
        stage: string;
        strength: string;
        last_interaction_date: string | null;
        estimated_pursuit_value: number | null;
      };
      company: {
        id: string;
        name: string;
        market_sector: string;
      };
    }>
  ) => {
    if (atRiskRelationships.length === 0) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch recent interactions for each company
      const companyIds = atRiskRelationships.map(r => r.company.id);
      const { data: interactions } = await supabase
        .from('interactions')
        .select('*')
        .in('client_company_id', companyIds)
        .order('interaction_date', { ascending: false })
        .limit(20);

      // Build relationship data for AI analysis
      const relationshipData: RelationshipData[] = atRiskRelationships.map(({ relationship, company }) => {
        const companyInteractions = interactions?.filter(i => i.client_company_id === company.id) || [];
        const lastDate = relationship.last_interaction_date 
          ? new Date(relationship.last_interaction_date) 
          : null;
        
        return {
          companyName: company.name,
          marketSector: company.market_sector,
          stage: relationship.stage,
          strength: relationship.strength,
          lastInteractionDate: relationship.last_interaction_date,
          daysSinceContact: lastDate ? differenceInDays(new Date(), lastDate) : 999,
          estimatedValue: relationship.estimated_pursuit_value || 0,
          recentInteractions: companyInteractions.slice(0, 3).map(i => ({
            type: i.interaction_type,
            notes: i.notes,
            date: i.interaction_date,
          })),
        };
      });

      const { data, error: fnError } = await supabase.functions.invoke('relationship-advisor', {
        body: { relationships: relationshipData },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuggestions(data?.suggestions || []);
    } catch (err) {
      console.error('AI advisor error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
  };
}
