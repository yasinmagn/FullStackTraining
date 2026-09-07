import type { ApiError } from '../api/client.ts';

/**
 * Tell TanStack Query what our errors are.
 *
 * By default `query.error` is typed `unknown`, which is technically honest -
 * anything can be thrown - but means every component needs an `instanceof`
 * check before it can read `.message`.
 *
 * Because our API client throws ONLY `ApiError` (network failures, HTTP errors
 * and response-shape failures are all wrapped), we can register that fact once
 * and every `useQuery`/`useMutation` in the app gets a typed error.
 *
 * Declaration merging again - and the honesty rule from Stage 6 applies: only
 * make this claim if your client really does normalise every failure. Ours
 * does; see the try/catch around `fetch` in api/client.ts.
 */
/*
 * `Register` is declared in `@tanstack/query-core` and re-exported by
 * `@tanstack/react-query`; augmenting either module name works. This uses the
 * name the docs use.
 */
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
  }
}

export {};
