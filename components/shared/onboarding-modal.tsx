"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import BrandCreationForm from "@/components/forms/brand-creation-form"

export default function OnboardingModal() {
  const [open, setOpen] = useState(true)

  const handleSuccess = () => {
    setOpen(false)
    // Refresh the page to show updated content with brand access
    window.location.reload()
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <BrandCreationForm 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}