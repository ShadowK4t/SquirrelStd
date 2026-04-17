'use client'

import { useEffect } from 'react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconLayoutKanban, IconTimeline, IconList, IconCalendar, IconBooks, IconBell } from '@tabler/icons-react'

export default function Navbar(){
    const pathname = usePathname();

    const navItems = [
    { label: 'Board',    href: '/board',    icon: IconLayoutKanban },
    { label: 'Timeline', href: '/timeline', icon: IconTimeline },
    { label: 'Backlog',  href: '/backlog',  icon: IconList },
    { label: 'Calendar', href: '/calendar', icon: IconCalendar },
    { label: 'Library',  href: '/library',  icon: IconBooks },
    ];

    const [username, setUsername] = useState<string>('');

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
            supabase
                .from('users')
                .select('full_name')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                if (data) setUsername(data.full_name)
                })
            }
        })
    }, [])

    return (
        <header className="w-full bg-sq-bg px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="Squirrel Space" className="w-10 h-10" />
                <span className="font-sans font-black text-white text-2xl">Squirrel Space</span>
            </div>
            <div className="flex items-center gap-3">
                {navItems.map(navItem => {
                    const Icon = navItem.icon
                    const isActive = pathname === navItem.href
                    return (
                        <Link
                        key={navItem.href}
                        href={navItem.href}
                        className={`flex items-center gap-2 px-4 py-1 rounded text-sm font-bold ${
                            isActive
                            ? 'bg-sq-accent text-white'
                            : 'text-sq-nav-inactive'
                        }`}
                        >
                            <Icon size={18} />
                            {navItem.label}
                        </Link>
            )
            })}
            </div>

            <div className='flex items-center gap-4'>
                <button className="text-sq-nav-inactive hover:text-white transition-colors relative">
                    <IconBell size={20} />
                </button>
                <span className='text-white font-sans text-sm font-normal'>
                    {username}
                </span>
                <div className='w-6 h-6 rounded-full bg-sq-nav-inactive'/>
            </div>
        </header>
)



}