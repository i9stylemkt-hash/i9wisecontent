'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUser() {
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? '')
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { userId }
}
