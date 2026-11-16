'use client';

import { useQuery } from '@tanstack/react-query';

import { chamar } from '@/api/cliente';

export function useStatusApi() {
  return useQuery<'online' | 'offline'>({
    queryKey: ['status-api'],
    queryFn: async () => {
      try {
        await chamar<unknown>('/openapi.json');
        return 'online';
      } catch {
        return 'offline';
      }
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: false,
  });
}
