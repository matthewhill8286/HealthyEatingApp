/**
 * Apollo Client provider for the app.
 *
 * Wraps children with ApolloProvider and clears the Apollo cache
 * when the Supabase auth session changes (login/logout).
 */
import React, { useEffect, useRef } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '@/lib/graphql-client';
import { useAuth } from './AuthProvider';

export function GraphQLProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const prevUserId = useRef<string | undefined>(undefined);

  // Clear the Apollo cache when the auth user actually changes (not on first mount).
  // Uses clearStore() instead of resetStore() to avoid the
  // "Store reset while query was in flight" invariant error — clearStore()
  // just wipes the cache without trying to refetch active queries.
  useEffect(() => {
    const currentUserId = session?.user?.id;

    // Skip the very first render — queries haven't been set up yet
    if (prevUserId.current === undefined) {
      prevUserId.current = currentUserId ?? null as any;
      return;
    }

    // Only clear if the user actually changed (login, logout, or switch)
    if (prevUserId.current !== currentUserId) {
      prevUserId.current = currentUserId;
      apolloClient.clearStore().catch(() => {
        // Safe to ignore — clearStore is best-effort
      });
    }
  }, [session?.user?.id]);

  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
