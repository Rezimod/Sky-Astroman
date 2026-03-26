'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

type Period = 'all' | 'month' | 'week'

const mockUsers = [
  { id: '1', username: 'tbilisi_observer', display_name: 'გიორგი მაისურაძე', title: 'ვარსკვლავთმრიცხველი', level: 8, points: 8450, observations_count: 34 },
  { id: '2', username: 'night_sky_ge',     display_name: 'ნინო დოლიძე',       title: 'ასტროფოტოგრაფი',    level: 7, points: 7200, observations_count: 28 },
  { id: '3', username: 'stellar_giorgi',   display_name: 'ლევან ჭანტურია',    title: 'დამწყები',           level: 5, points: 6800, observations_count: 19 },
  { id: '4', username: 'cosmos_nika',      display_name: 'ანა გიორგაძე',      title: 'დამწყები',           level: 5, points: 5100, observations_count: 19 },
  { id: '5', username: 'moon_watcher',     display_name: 'თორნიკე კაპანაძე',  title: 'დამწყები',           level: 4, points: 4950, observations_count: 15 },
  { id: '6', username: 'deep_sky_tbilisi', display_name: 'მარიამ ბერიძე',     title: 'მთვარის მაძიებელი', level: 6, points: 4820, observations_count: 24 },
  { id: '7', username: 'orion_hunter',     display_name: 'სანდრო ხუციშვილი',  title: 'დამწყები',           level: 3, points: 4600, observations_count: 10 },
  { id: '8', username: 'stargazer_tbilisi',display_name: 'Stargazer',          title: 'დამწყები',           level: 3, points: 720,  observations_count: 12 },
].sort((a, b) => b.points - a.points)

const CURRENT_USER_ID = '8'

function initials(name: string) {
  const parts = name.split(' ')
  if (parts.length >= 2) return `${parts[0][0]}.${parts[1][0]}`
  return name.slice(0, 2).toUpperCase()
}

export default function LeaderboardPage() {
  const { t, lang } = useLanguage()
  const [period, setPeriod] = useState<Period>('week')

  const periodTabs: { key: Period; label: { en: string; ka: string } }[] = [
    { key: 'week',  label: { en: 'Week',    ka: 'კვირა'  } },
    { key: 'month', label: { en: 'Month',   ka: 'თვე'    } },
    { key: 'all',   label: { en: 'All time', ka: 'საერთო' } },
  ]

  const top3 = mockUsers.slice(0, 3)
  const rest = mockUsers.slice(3)
  const currentUser = mockUsers.find(u => u.id === CURRENT_USER_ID)
  const currentRank = mockUsers.findIndex(u => u.id === CURRENT_USER_ID) + 1

  return (
    <div className="max-w-5xl mx-auto px-6 pt-12 pb-32 animate-page-enter">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('leaderboard.title')}</h1>
          <p className="text-slate-400">{t('leaderboard.subtitle')}</p>
        </div>
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
          {periodTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                period === tab.key
                  ? 'text-white bg-space-accent shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ka' ? tab.label.ka : tab.label.en}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-4 mb-12 items-end">
        {/* 2nd place */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-slate-400/30 p-1">
              <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-white">
                {initials(top3[1].display_name)}
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-400 text-space-900 text-xs font-black px-3 py-0.5 rounded-full">2</div>
          </div>
          <div className="text-center bg-white/5 border border-white/10 rounded-2xl p-4 w-full h-32 flex flex-col justify-center">
            <span className="text-white font-bold block truncate text-sm">{top3[1].display_name}</span>
            <span className="text-xs text-slate-400 block mb-2">{top3[1].title}</span>
            <span className="text-lg font-black text-white">{top3[1].points.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">XP</span></span>
          </div>
        </div>

        {/* 1st place */}
        <div className="flex flex-col items-center">
          <div className="text-3xl text-yellow-400 mb-2 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">👑</div>
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full border-4 border-yellow-400 p-1 shadow-[0_0_30px_rgba(250,204,21,0.2)]">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-space-accent to-space-glow flex items-center justify-center text-2xl font-bold text-white">
                {initials(top3[0].display_name)}
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-space-900 text-sm font-black px-4 py-1 rounded-full shadow-lg">1</div>
          </div>
          <div className="text-center bg-space-accent/10 border border-space-accent/30 rounded-2xl p-6 w-full h-40 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl">✨</div>
            <span className="text-lg text-white font-bold block truncate">{top3[0].display_name}</span>
            <span className="text-xs text-space-accent font-bold block mb-2">{top3[0].title}</span>
            <span className="text-2xl font-black text-white">{top3[0].points.toLocaleString()} <span className="text-[10px] text-space-accent uppercase">XP</span></span>
          </div>
        </div>

        {/* 3rd place */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full border-4 border-orange-700/30 p-1">
              <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-white">
                {initials(top3[2].display_name)}
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-700/60 text-white text-xs font-black px-3 py-0.5 rounded-full">3</div>
          </div>
          <div className="text-center bg-white/5 border border-white/10 rounded-2xl p-4 w-full h-32 flex flex-col justify-center">
            <span className="text-white font-bold block truncate text-sm">{top3[2].display_name}</span>
            <span className="text-xs text-slate-400 block mb-2">{top3[2].title}</span>
            <span className="text-lg font-black text-white">{top3[2].points.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">XP</span></span>
          </div>
        </div>
      </div>

      {/* Table for #4+ */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-500 w-20">{lang === 'ka' ? 'ადგილი' : 'Rank'}</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-slate-500">{lang === 'ka' ? 'მომხმარებელი' : 'User'}</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">{lang === 'ka' ? 'წოდება' : 'Title'}</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">{lang === 'ka' ? 'ქულები (XP)' : 'Points (XP)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rest.map((user, idx) => {
                const rank = idx + 4
                const isMe = user.id === CURRENT_USER_ID
                return (
                  <tr
                    key={user.id}
                    className={`group transition-colors ${isMe ? 'bg-space-accent/5' : 'hover:bg-white/5'}`}
                  >
                    <td className={`px-8 py-4 text-sm font-bold ${isMe ? 'text-space-accent' : 'text-slate-400 group-hover:text-white'}`}>
                      #{rank}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white border ${isMe ? 'bg-space-accent border-space-accent/50' : 'bg-slate-800 border-white/10'}`}>
                          {initials(user.display_name)}
                        </div>
                        <div>
                          <span className={`text-sm font-bold ${isMe ? 'text-space-accent' : 'text-white'}`}>{user.display_name}</span>
                          {isMe && <span className="ml-2 text-[10px] bg-space-accent/20 text-space-accent px-2 py-0.5 rounded-full font-bold">{lang === 'ka' ? 'შენ' : 'You'}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-xs font-medium text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">{user.title}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-white">{user.points.toLocaleString()}</td>
                  </tr>
                )
              })}
              <tr className="bg-white/[0.02]">
                <td colSpan={4} className="px-8 py-8 text-center text-slate-500 italic text-sm">
                  {lang === 'ka' ? 'დამატებით 93 დამკვირვებელი...' : '93 more observers...'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky user bar */}
      {currentUser && (
        <div className="fixed bottom-0 sm:bottom-0 left-0 right-0 z-[100] bg-space-800/80 backdrop-blur-2xl border-t border-space-accent/30 py-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-[10px] font-bold text-space-accent uppercase block tracking-widest">{lang === 'ka' ? 'შენი ადგილი' : 'Your rank'}</span>
                <span className="text-2xl font-black text-white">#{currentRank}</span>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-space-accent flex items-center justify-center text-white font-bold ring-4 ring-space-accent/20">
                  {initials(currentUser.display_name)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-none mb-1">{currentUser.display_name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{lang === 'ka' ? 'პროგრესი ტოპ 100-მდე:' : 'Progress to top 100:'}</span>
                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="bg-space-accent h-full w-[15%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-widest">{lang === 'ka' ? 'ჯამური ქულა' : 'Total XP'}</span>
                <span className="text-2xl font-black text-white">{currentUser.points} <span className="text-xs text-space-accent">XP</span></span>
              </div>
              <Link
                href="/missions"
                className="bg-white text-space-900 font-bold px-6 py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors"
              >
                {lang === 'ka' ? 'ქულების დაგროვება' : 'Earn points'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
