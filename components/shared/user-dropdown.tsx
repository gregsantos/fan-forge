"use client"

import { LogOut, Settings, User, Crown, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/contexts/auth"
import Link from "next/link"
import Image from "next/image"

export function UserDropdown() {
  const { user, signOut, loading } = useAuth()

  if (!user) return null

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getInitials = (name: string | undefined, email: string) => {
    if (name) {
      const parts = name.trim().split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return name[0].toUpperCase()
    }
    return email[0].toUpperCase()
  }

  const getRoleInfo = (role: string | undefined) => {
    switch (role) {
      case 'creator':
        return { label: 'Creator', icon: Palette, color: 'bg-blue-500' }
      case 'brand_admin':
        return { label: 'Brand Admin', icon: Crown, color: 'bg-purple-500' }
      default:
        return { label: 'User', icon: User, color: 'bg-gray-500' }
    }
  }

  const roleInfo = getRoleInfo(user.role)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent p-0 border-0 overflow-hidden">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.displayName || 'User avatar'}
              width={40}
              height={40}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center rounded-full text-white font-semibold text-sm ${roleInfo.color}`}>
              {getInitials(user.displayName, user.email)}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-semibold ${roleInfo.color}`}>
                {getInitials(user.displayName, user.email)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-none">
                  {user.displayName || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground mt-1">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <roleInfo.icon className="h-3 w-3 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">
                {roleInfo.label}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={loading} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}