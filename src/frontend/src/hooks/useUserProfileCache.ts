import type { Principal } from "@icp-sdk/core/principal";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import type { UserProfile } from "../backend";
import { useActor } from "./useActor";

/**
 * Returns a function that fetches and caches user profiles by principal.
 * Uses React Query's cache so the same principal is only fetched once.
 * NOTE: null profiles are NOT cached -- this ensures we retry on next call
 * (avoids permanently caching "no profile" for users who haven't set one yet).
 */
export function useUserProfileCache() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const pendingRef = useRef<Map<string, Promise<UserProfile | null>>>(
    new Map(),
  );

  const getProfile = useCallback(
    async (principal: Principal): Promise<UserProfile | null> => {
      if (!actor) return null;
      const key = principal.toString();
      // Only use cache if there is an actual profile stored (not null/undefined)
      const cached = queryClient.getQueryData<UserProfile | null>([
        "userProfile",
        key,
      ]);
      if (cached !== undefined && cached !== null) return cached;

      // Deduplicate in-flight requests
      if (pendingRef.current.has(key)) {
        return pendingRef.current.get(key)!;
      }

      const promise = actor.getUserProfile(principal).then((profile) => {
        // Only cache actual profiles -- never cache null so we always retry
        if (profile !== null && profile !== undefined) {
          queryClient.setQueryData(["userProfile", key], profile);
        }
        pendingRef.current.delete(key);
        return profile ?? null;
      });

      pendingRef.current.set(key, promise);
      return promise;
    },
    [actor, queryClient],
  );

  const refreshProfile = useCallback(
    async (principal: Principal): Promise<UserProfile | null> => {
      if (!actor) return null;
      const key = principal.toString();
      queryClient.removeQueries({ queryKey: ["userProfile", key] });
      return getProfile(principal);
    },
    [actor, queryClient, getProfile],
  );

  return { getProfile, refreshProfile };
}
