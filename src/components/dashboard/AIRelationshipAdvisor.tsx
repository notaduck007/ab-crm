import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { useRelationshipAdvisor, AISuggestion } from '@/hooks/useRelationshipAdvisor';
import type { ClientCompany, Relationship } from '@/types/database';

interface AIRelationshipAdvisorProps {
  atRiskRelationships: Array<{
    relationship: Relationship;
    company: ClientCompany;
  }>;
}

const urgencyColors = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
} as const;

export function AIRelationshipAdvisor({ atRiskRelationships }: AIRelationshipAdvisorProps) {
  const { suggestions, isLoading, error, fetchSuggestions } = useRelationshipAdvisor();

  useEffect(() => {
    if (atRiskRelationships.length > 0) {
      fetchSuggestions(atRiskRelationships);
    }
  }, [atRiskRelationships.length]);

  const handleRefresh = () => {
    fetchSuggestions(atRiskRelationships);
  };

  if (atRiskRelationships.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Relationship Advisor</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          AI-powered recommendations for re-engaging cold relationships
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && suggestions.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Analyzing relationships...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Click refresh to get AI-powered suggestions for your at-risk relationships.
          </p>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <SuggestionCard key={index} suggestion={suggestion} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionCard({ suggestion }: { suggestion: AISuggestion }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">{suggestion.companyName}</h4>
        <Badge variant={urgencyColors[suggestion.urgency] || 'secondary'}>
          {suggestion.urgency}
        </Badge>
      </div>
      <p className="mt-2 text-sm">{suggestion.action}</p>
      <p className="mt-1 text-xs text-muted-foreground italic">
        {suggestion.rationale}
      </p>
    </div>
  );
}
