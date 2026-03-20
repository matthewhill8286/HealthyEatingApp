import { useQuery } from '@apollo/client/react';
import { extractFirstNode } from '@/lib/graphql-client';
import { GET_PROFILE } from '@/graphql/queries';
import { useAuth } from '@/providers/AuthProvider';

export type Profile = {
  id: string;
  display_name: string | null;
  sex: string | null;
  date_of_birth: string | null;
  dietary_preference: string | null;
  goal: string | null;
  daily_calorie_target: number | null;
  daily_protein_g: number | null;
  daily_carbs_g: number | null;
  daily_fat_g: number | null;
  daily_fibre_g: number | null;
  allergies: string[];
  disliked_ingredients: string[];
  weight_kg: number | null;
  height_cm: number | null;
  activity_level: string | null;
};

type ProfileResponse = {
  profilesCollection: {
    edges: { node: Profile }[];
  };
};

export function useProfile() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery<ProfileResponse>(GET_PROFILE, {
    variables: { userId: user?.id },
    skip: !user,
    fetchPolicy: 'cache-and-network',
  });

  const raw = data ? extractFirstNode(data.profilesCollection) : null;

  // pg_graphql may return Postgres ARRAY columns as JSON strings — defensively parse
  const profile = raw
    ? {
        ...raw,
        allergies: Array.isArray(raw.allergies)
          ? raw.allergies
          : typeof raw.allergies === 'string'
            ? (() => { try { return JSON.parse(raw.allergies as unknown as string); } catch { return []; } })()
            : [],
        disliked_ingredients: Array.isArray(raw.disliked_ingredients)
          ? raw.disliked_ingredients
          : typeof raw.disliked_ingredients === 'string'
            ? (() => { try { return JSON.parse(raw.disliked_ingredients as unknown as string); } catch { return []; } })()
            : [],
      }
    : null;

  return { profile, isLoading: loading, error, refetch };
}
