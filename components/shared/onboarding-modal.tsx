"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Building, Plus } from "lucide-react"
import BrandCreationForm from "@/components/forms/brand-creation-form"

interface OnboardingModalProps {
  trigger?: React.ReactNode
  autoOpen?: boolean
}

export default function OnboardingModal({ trigger, autoOpen = false }: OnboardingModalProps) {
  const [open, setOpen] = useState(autoOpen)

  const handleSuccess = () => {
    setOpen(false)
    // Refresh the page to show updated content with brand access
    window.location.reload()
  }

  const handleCancel = () => {
    setOpen(false)
  }

  const defaultTrigger = (
    <Button variant="gradient" size="lg" className="shadow-lg">
      <Building className="mr-2 h-5 w-5" />
      Create Your Brand
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <BrandCreationForm 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}