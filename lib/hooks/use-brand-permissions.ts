"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { UserPermissions } from '@/lib/auth/permissions'

interface BrandPermissionHook {
  permissions: UserPermissions | null
  loading: boolean
  error: string | null
  refreshPermissions: () => Promise<void>
  canCreateIpKits: boolean
  canCreateCampaigns: boolean
  canReviewSubmissions: boolean
  isPlatformAdmin: boolean
  userBrands: Array<{ id: string; name: string; role: string }>
}

export function useBrandPermissions(): BrandPermissionHook {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [userBrands, setUserBrands] = useState<Array<{ id: string; name: string; role: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setPermissions(null)
        setUserBrands([])
        return
      }

      // Fetch permissions from API
      const [permissionsResponse, brandsResponse] = await Promise.all([
        fetch('/api/auth/permissions'),
        fetch('/api/auth/brands')
      ])

      if (!permissionsResponse.ok || !brandsResponse.ok) {
        throw new Error('Failed to fetch permissions')
      }

      const [permissionsData, brandsData] = await Promise.all([
        permissionsResponse.json(),
        brandsResponse.json()
      ])

      setPermissions(permissionsData)
      setUserBrands(brandsData.brands || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions')
      setPermissions(null)
      setUserBrands([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        fetchPermissions()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    permissions,
    loading,
    error,
    refreshPermissions: fetchPermissions,
    canCreateIpKits: permissions?.canCreateIpKits || false,
    canCreateCampaigns: permissions?.canCreateCampaigns || false,
    canReviewSubmissions: permissions?.canReviewSubmissions || false,
    isPlatformAdmin: permissions?.isPlatformAdmin || false,
    userBrands
  }
}

// Hook for checking specific IP Kit permissions
export function useIpKitPermissions(ipKitId?: string) {
  const [canEdit, setCanEdit] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [canManageAssets, setCanManageAssets] = useState(false)
  const [loading, setLoading] = useState(true)

  const { permissions } = useBrandPermissions()

  useEffect(() => {
    const checkPermissions = async () => {
      if (!permissions || !ipKitId) {
        setCanEdit(false)
        setCanDelete(false)
        setCanManageAssets(false)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [editResult, deleteResult, manageResult] = await Promise.all([
          permissions.canEditIpKit(ipKitId),
          permissions.canDeleteIpKit(ipKitId),
          permissions.canManageAssets(ipKitId)
        ])

        setCanEdit(editResult)
        setCanDelete(deleteResult)
        setCanManageAssets(manageResult)
      } catch (error) {
        console.error('Error checking IP Kit permissions:', error)
        setCanEdit(false)
        setCanDelete(false)
        setCanManageAssets(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermissions()
  }, [permissions, ipKitId])

  return {
    canEdit,
    canDelete,
    canManageAssets,
    loading
  }
}

// Hook for checking specific campaign permissions
export function useCampaignPermissions(campaignId?: string) {
  const [canEdit, setCanEdit] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [loading, setLoading] = useState(true)

  const { permissions } = useBrandPermissions()

  useEffect(() => {
    const checkPermissions = async () => {
      if (!permissions || !campaignId) {
        setCanEdit(false)
        setCanDelete(false)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [editResult, deleteResult] = await Promise.all([
          permissions.canEditCampaign(campaignId),
          permissions.canDeleteCampaign(campaignId)
        ])

        setCanEdit(editResult)
        setCanDelete(deleteResult)
      } catch (error) {
        console.error('Error checking campaign permissions:', error)
        setCanEdit(false)
        setCanDelete(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermissions()
  }, [permissions, campaignId])

  return {
    canEdit,
    canDelete,
    loading
  }
}