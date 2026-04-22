'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IconX } from '@tabler/icons-react'

type Profile  = { full_name: string; email: string; description: string | null; role: string }
type Team     = { name: string; color: string }
type JobTitle = { name: string }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  lead: 'Lead',
  normal: 'Member',
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

type Props = { onClose: () => void }

export default function ProfileModal({ onClose }: Props) {
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [teams, setTeams]         = useState<Team[]>([])
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const [profileRes, teamsRes, jobsRes] = await Promise.all([
        supabase.from('users').select('full_name, email, description, role').eq('id', user.id).single(),
        supabase.from('user_teams').select('team:teams(name, color)').eq('user_id', user.id),
        supabase.from('user_job_titles').select('job_title:job_titles(name)').eq('user_id', user.id),
      ])
      if (profileRes.data) setProfile(profileRes.data)
      if (teamsRes.data)   setTeams(teamsRes.data.map((r: any) => r.team))
      if (jobsRes.data)    setJobTitles(jobsRes.data.map((r: any) => r.job_title))
      setLoading(false)
    })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm bg-black/20" onClick={onClose} />

      <div className="relative bg-sq-col rounded-xl w-175 max-h-[90vh] overflow-y-auto">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-sq-muted hover:text-white transition-colors z-10"
        >
          <IconX size={20} />
        </button>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span className="text-white/55 text-sm">Loading...</span>
          </div>
        ) : profile && (
          <div className="flex flex-col gap-6 p-6">

            {/* Profile card */}
            <div className="bg-sq-card rounded-xl p-6 flex items-start gap-6">
              <div className="w-28 h-28 rounded-full bg-sq-col flex items-center justify-center shrink-0">
                <span className="text-white text-3xl font-bold">{initials(profile.full_name)}</span>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <h2 className="text-white font-bold text-2xl">{profile.full_name}</h2>
                <span className="text-white/55 text-sm">{ROLE_LABELS[profile.role] ?? profile.role}</span>

                {teams.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1">
                    <span className="text-white font-bold text-base">Team</span>
                    <div className="flex flex-wrap gap-x-3">
                      {teams.map((t, i) => (
                        <span key={i} className="text-white/55 text-sm">{t.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div className="flex flex-col gap-4">
              <h3 className="text-white font-bold text-xl">Personal Information</h3>

              <div className="bg-sq-card rounded-xl p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-white/55 text-xs font-medium uppercase tracking-wide">Email</span>
                  <span className="text-white text-sm">{profile.email}</span>
                </div>

                <div className="w-full h-px bg-white/5" />

                <div className="flex flex-col gap-1">
                  <span className="text-white/55 text-xs font-medium uppercase tracking-wide">Description</span>
                  <span className="text-white text-sm">
                    {profile.description || <span className="text-white/40 italic">No description yet</span>}
                  </span>
                </div>

                {jobTitles.length > 0 && (
                  <>
                    <div className="w-full h-px bg-white/5" />
                    <div className="flex flex-col gap-2">
                      <span className="text-white/55 text-xs font-medium uppercase tracking-wide">Job Titles</span>
                      <div className="flex flex-wrap gap-2">
                        {jobTitles.map((j, i) => (
                          <span key={i} className="bg-sq-col text-white text-xs px-3 py-1 rounded-full">{j.name}</span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}