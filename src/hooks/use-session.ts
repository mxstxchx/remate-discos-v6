import { useStore } from '@/store'
import type { Session } from '@/store/types'

export const useSession = () => {
  const session = useStore((state) => state.session)
  const setSession = useStore((state) => state.setSession)

  return { session, setSession } as const
}