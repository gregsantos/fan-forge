"use client"

import { useState } from "react"
import { SubmissionQueueClient } from "./submission-queue-client"
import { SubmissionQueueActions } from "./submission-queue-actions"

interface SubmissionQueueContainerProps {
  submissions: any[]
}

export function SubmissionQueueContainer({ submissions }: SubmissionQueueContainerProps) {
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([])

  return (
    <div className="space-y-6">
      {/* Actions Header */}
      <div className="flex justify-end">
        <SubmissionQueueActions 
          submissions={submissions}
          selectedSubmissions={selectedSubmissions}
          onSelectionChange={setSelectedSubmissions}
        />
      </div>
      
      {/* Submission Queue */}
      <SubmissionQueueClient
        submissions={submissions}
        selectedSubmissions={selectedSubmissions}
        onSelectionChange={setSelectedSubmissions}
      />
    </div>
  )
}