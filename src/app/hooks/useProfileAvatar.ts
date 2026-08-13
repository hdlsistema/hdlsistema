import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export const PROFILE_AVATAR_UPDATED_EVENT = 'hdl:profile-avatar-updated'

export function notifyProfileAvatarUpdated() {
  window.dispatchEvent(new Event(PROFILE_AVATAR_UPDATED_EVENT))
}

export function useProfileAvatar() {
  const { profile } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const refresh = () => setRevision((current) => current + 1)
    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, refresh)
  }, [])

  useEffect(() => {
    let active = true

    async function loadAvatar() {
      if (!profile?.avatar_url) {
        setAvatarUrl('')
        return
      }

      const { data } = await supabase.storage
        .from('avatars')
        .createSignedUrl(profile.avatar_url, 60 * 15)

      if (active) setAvatarUrl(data?.signedUrl ?? '')
    }

    void loadAvatar()
    return () => {
      active = false
    }
  }, [profile?.avatar_url, revision])

  return avatarUrl
}
