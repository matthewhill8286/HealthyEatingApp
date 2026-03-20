/**
 * Apollo Client for Supabase pg_graphql.
 *
 * - InMemoryCache with type policies for normalised caching
 * - Auth link injects Supabase JWT on every request
 * - BigFloat afterware coerces pg_graphql numeric strings → numbers
 * - RxJS Observable integration for cross-component reactivity
 */
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
  Observable,
  from,
} from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GRAPHQL_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/graphql/v1`;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/** Injects Supabase anon key + user JWT on every request */
const authLink = new SetContextLink(async (_, prevContext: Record<string, any>) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    headers: {
      ...(prevContext.headers || {}),
      apikey: ANON_KEY,
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
    },
  };
});

const httpLink = new HttpLink({ uri: GRAPHQL_URL });

// ---------------------------------------------------------------------------
// BigFloat coercion
// ---------------------------------------------------------------------------

/**
 * pg_graphql returns Postgres `numeric` columns as BigFloat strings.
 * This afterware link walks the response JSON and coerces any string
 * that looks like a number into an actual number, so the UI doesn't break.
 */
function coerceNumericStrings(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (/^-?\d+(\.\d+)?$/.test(obj)) {
      return parseFloat(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(coerceNumericStrings);
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (key === '__typename') {
        result[key] = obj[key];
      } else {
        result[key] = coerceNumericStrings(obj[key]);
      }
    }
    return result;
  }
  return obj;
}

/**
 * Afterware link that coerces BigFloat strings in responses.
 * Uses Observable.from + pipe since Apollo Observable doesn't have .map()
 */
const bigFloatLink = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    const sub = forward(operation).subscribe({
      next: (response) => {
        if (response.data) {
          response.data = coerceNumericStrings(response.data);
        }
        observer.next(response);
      },
      error: (err) => observer.error(err),
      complete: () => observer.complete(),
    });
    return () => sub.unsubscribe();
  });
});

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new InMemoryCache({
  typePolicies: {
    // Tell Apollo how to normalise each pg_graphql type by its `id` field
    recipes: { keyFields: ['id'] },
    profiles: { keyFields: ['id'] },
    ingredients: { keyFields: ['id'] },
    meal_plans: { keyFields: ['id'] },
    meal_plan_entries: { keyFields: ['id'] },
    shopping_lists: { keyFields: ['id'] },
    shopping_list_items: { keyFields: ['id'] },
    recipe_ingredients: { keyFields: ['id'] },
    tags: { keyFields: ['id'] },
    user_taste_profile: { keyFields: ['id'] },
  },
});

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([authLink, bigFloatLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
    },
    mutate: {
      fetchPolicy: 'no-cache',
    },
  },
});

// ---------------------------------------------------------------------------
// Helpers for Supabase pg_graphql Relay-style responses
// ---------------------------------------------------------------------------

/** Extract nodes from a pg_graphql edges response */
export function extractNodes<T>(collection: { edges: { node: T }[] } | null | undefined): T[] {
  if (!collection?.edges) return [];
  return collection.edges.map((e: { node: T }) => e.node);
}

/** Extract a single node from a pg_graphql edges response */
export function extractFirstNode<T>(
  collection: { edges: { node: T }[] } | null | undefined,
): T | null {
  if (!collection?.edges?.length) return null;
  return collection.edges[0].node;
}

// Re-export for convenience
export { gql } from '@apollo/client';
