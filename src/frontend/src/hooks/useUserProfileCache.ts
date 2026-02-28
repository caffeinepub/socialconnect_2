import type { Principal } from "@icp-sdk/core/principal";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import type { UserProfile } from "../backend";
import { useActor } from "./useActor";

/**
 * Returns a function that fetches and caches user profiles by principal.
 * Uses React Query's cache so the same principal is only fetched once.
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
      const cached = queryClient.getQueryData<UserProfile | null>([
        "userProfile",
        key,
      ]);
      if (cached !== undefined) return cached;

      // Deduplicate in-flight requests
      if (pendingRef.current.has(key)) {
        return pendingRef.current.get(key)!;
      }

      const promise = actor.getUserProfile(principal).then((profile) => {
        queryClient.setQueryData(["userProfile", key], profile);
        pendingRef.current.delete(key);
        return profile;
      });

      pendingRef.current.set(key, promise);
      return promise;
    },
    [actor, queryClient],
  );

  return { getProfile };
}
