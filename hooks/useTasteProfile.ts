import { useQuery } from '@apollo/client/react';
import { extractFirstNode } from '@/lib/graphql-client';
import { GET_TASTE_PROFILE } from '@/graphql/queries';
import { useAuth } from '@/providers/AuthProvider';

export type TasteProfile = {
  preferred_cuisines: string[];
  avoided_ingredients: string[];
  spice_tolerance: string | null;
  cooking_skill: string | null;
  max_prep_time_min: number | null;
};

type TasteProfileResponse = {
  user_taste_profileCollection: {
    edges: { node: TasteProfile }[];
  };
};

export function useTasteProfile() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery<TasteProfileResponse>(
    GET_TASTE_PROFILE,
    {
      variables: { userId: user?.id },
      skip: !user,
      fetchPolicy: 'cache-and-network',
    },
  );

  const raw = data ? extractFirstNode(data.user_taste_profileCollection) : null;

  const tasteProfile: TasteProfile | null = raw
    ? {
        preferred_cuisines: raw.preferred_cuisines || [],
        avoided_ingredients: raw.avoided_ingredients || [],
        spice_tolerance: raw.spice_tolerance,
        cooking_skill: raw.cooking_skill,
        max_prep_time_min: raw.max_prep_time_min,
      }
    : null;

  return { tasteProfile, isLoading: loading, error, refetch };
}
