export type Lang = 'en' | 'ka'

export const translations = {
  // Navigation
  nav: {
    dashboard:    { en: 'Dashboard',    ka: 'მთავარი' },
    missions:     { en: 'Missions',     ka: 'მისიები' },
    leaderboard:  { en: 'Leaderboard',  ka: 'ლიდერბორდი' },
    sky:          { en: 'Sky',          ka: 'ცა' },
    profile:      { en: 'Profile',      ka: 'პროფილი' },
    teams:        { en: 'Teams',        ka: 'გუნდები' },
    signout:      { en: 'Sign out',     ka: 'გასვლა' },
  },
  // Landing page
  landing: {
    tagline:      { en: '✦ SKY ASTROMAN ✦',           ka: '✦ SKY ASTROMAN ✦' },
    hero1:        { en: 'Observe.',                    ka: 'დააკვირდი.' },
    hero2:        { en: 'Verify.',                     ka: 'დაადასტურე.' },
    hero3:        { en: 'Rank.',                       ka: 'მოიპოვე ადგილი.' },
    desc:         { en: 'The free social platform for stargazers. Log your observations, earn points, and compete with astronomers across Georgia.', ka: 'უფასო სოციალური პლატფორმა ვარსკვლავმოყვარეებისთვის. ჩაწერე დაკვირვებები, დააგროვე ქულები და შეეჯიბრე სხვა ასტრონომებს.' },
    startBtn:     { en: 'Start Observing →',           ka: 'დაწყება →' },
    leaderBtn:    { en: 'View Leaderboard',            ka: 'ლიდერბორდი' },
    free:         { en: 'Free forever',                ka: 'სრულიად უფასო' },
    location:     { en: 'Tbilisi, Georgia',            ka: 'თბილისი, საქართველო' },
    noCrypto:     { en: 'No crypto, no payments',      ka: 'კრიპტო არ არის' },
    missionsTitle:{ en: 'Available Missions',          ka: 'ხელმისაწვდომი მისიები' },
    howTitle:     { en: 'How It Works',                ka: 'როგორ მუშაობს' },
    ctaText:      { en: 'Ready to explore the Georgian sky?', ka: 'მზახარ საქართველოს ცის სასწაულებისთვის?' },
    joinBtn:      { en: 'Join Sky Astroman →',         ka: 'შემოუერთდი →' },
    feat1t:       { en: 'Log Observations',            ka: 'ჩაწერე დაკვირვება' },
    feat1d:       { en: 'Photograph celestial objects and submit for verification', ka: 'გადაიღე ციური სხეული და გაგზავნე დასადასტურებლად' },
    feat2t:       { en: 'Admin Verified',              ka: 'ადმინი ამოწმებს' },
    feat2d:       { en: 'Admins confirm your sighting and award points', ka: 'ადმინი ადასტურებს დაკვირვებას და ანიჭებს ქულებს' },
    feat3t:       { en: 'Earn & Rank',                 ka: 'გამარჯვება' },
    feat3d:       { en: 'Climb the leaderboard, complete missions, unlock badges', ka: 'ლიდერბორდზე მოიპოვე ადგილი, შეასრულე მისიები' },
    feat4t:       { en: 'Sky Conditions',              ka: 'ცის პირობები' },
    feat4d:       { en: 'Real-time Tbilisi sky data — cloud cover, moon phase, best viewing window', ka: 'თბილისის ცის მონაცემები — ღრუბლიანობა, მთვარის ფაზა' },
    feat5t:       { en: 'Compete',                     ka: 'შეჯიბრი' },
    feat5d:       { en: 'Weekly and monthly leaderboards for Georgian astronomers', ka: 'კვირეული და თვიური ლიდერბორდი ქართველი ასტრონომებისთვის' },
    feat6t:       { en: 'Gallery',                     ka: 'გალერეა' },
    feat6d:       { en: 'Build your personal observation archive', ka: 'შექმენი პერსონალური დაკვირვებების არქივი' },
  },
  // Login
  login: {
    title:        { en: 'Sign in to Sky Astroman',    ka: 'შესვლა Sky Astroman-ში' },
    subtitle:     { en: 'Log observations, earn points, climb the leaderboard', ka: 'ჩაწერე დაკვირვებები, დააგროვე ქულები' },
    emailBtn:     { en: 'Enter with Email →',          ka: 'შესვლა ელ-ფოსტით →' },
    noCrypto:     { en: 'No password needed. No crypto. No payments.', ka: 'პაროლი არ სჭირდება. კრიპტო არ არის.' },
  },
  // Dashboard
  dashboard: {
    title:        { en: "Tonight's Sky",               ka: 'დღეს ღამე ცაზე' },
    location:     { en: 'Tbilisi, Georgia',            ka: 'თბილისი, საქართველო' },
  },
  // Missions
  missions: {
    title:        { en: 'Missions',                    ka: 'მისიები' },
    completed:    { en: 'Completed',                   ka: 'შესრულებული' },
    pending:      { en: 'Pending',                     ka: 'მოლოდინში' },
    available:    { en: 'Available',                   ka: 'ხელმისაწვდომი' },
    nightOk:      { en: 'Sky conditions: Observable tonight', ka: 'ცა: დღეს ღამე სათვალთვალო' },
    dayTime:      { en: 'Daytime — missions available tonight', ka: 'დღეა — მისიები ღამით' },
    complete:     { en: 'Complete',                    ka: 'შესრულებული' },
    pendingReview:{ en: 'Pending Review',              ka: 'განხილვის მოლოდინში' },
    begin:        { en: 'Begin →',                     ka: 'დაწყება →' },
    howTitle:     { en: 'How Missions Work',           ka: 'როგორ მუშაობს' },
    step1:        { en: 'Go outside and observe the target object', ka: 'გადი გარეთ და დააკვირდი სამიზნე ობიექტს' },
    step2:        { en: 'Photograph it through your telescope or naked eye', ka: 'გადაიღე ტელესკოპით ან შეუიარაღებელი თვალით' },
    step3:        { en: 'Submit your photo via "Begin →"', ka: 'გაგზავნე ფოტო "დაწყება →" ღილაკით' },
    step4:        { en: 'Admin verifies and awards your points', ka: 'ადმინი ადასტურებს და ანიჭებს ქულებს' },
  },
  // Observation modal
  modal: {
    ptsOnApproval:{ en: 'pts on approval',             ka: 'ქულა დადასტურებისას' },
    attach:       { en: 'Tap to attach photo',         ka: 'ფოტოს მიმაგრება' },
    telescope:    { en: 'Telescope used (optional)',   ka: 'გამოყენებული ტელესკოპი (არასავალდებულო)' },
    whatSee:      { en: 'What did you see? (optional)', ka: 'რა დაინახე? (არასავალდებულო)' },
    submit:       { en: 'Submit Observation',          ka: 'დაკვირვების გაგზავნა' },
    submitting:   { en: 'Submitting...',               ka: 'იგზავნება...' },
    successTitle: { en: 'Observation submitted!',      ka: 'დაკვირვება გაგზავნილია!' },
    successDesc:  { en: 'Awaiting admin review. Points added once verified.', ka: 'ადმინის განხილვის მოლოდინში. ქულები დაემატება დადასტურების შემდეგ.' },
  },
  // Leaderboard
  leaderboard: {
    title:        { en: 'Leaderboard',                 ka: 'ლიდერბორდი' },
    subtitle:     { en: 'Top stargazers by observation points', ka: 'საუკეთესო ვარსკვლავმოყვარეები ქულების მიხედვით' },
    allTime:      { en: 'All Time',                    ka: 'ყველა დრო' },
    thisMonth:    { en: 'This Month',                  ka: 'ეს თვე' },
    thisWeek:     { en: 'This Week',                   ka: 'ეს კვირა' },
    you:          { en: 'You',                         ka: 'შენ' },
    pts:          { en: 'pts',                         ka: 'ქულა' },
  },
  // Sky conditions
  sky: {
    title:        { en: "Tonight's Sky",               ka: 'დღეს ღამე ცაზე' },
    updated:      { en: 'Updated',                     ka: 'განახლდა' },
    cloudCover:   { en: 'Cloud Cover',                 ka: 'ღრუბლიანობა' },
    visibility:   { en: 'Visibility',                  ka: 'ხილვადობა' },
    temperature:  { en: 'Temperature',                 ka: 'ტემპერატურა' },
    moonPhase:    { en: 'Moon Phase',                  ka: 'მთვარის ფაზა' },
    bestWindow:   { en: 'Best Window',                 ka: 'საუკეთესო დრო' },
    sunrise:      { en: 'Sunrise',                     ka: 'მზის ამოსვლა' },
    excellent:    { en: 'Excellent Viewing Conditions', ka: 'შესანიშნავი პირობები' },
    good:         { en: 'Good Viewing Conditions',     ka: 'კარგი პირობები' },
    fair:         { en: 'Fair Viewing Conditions',     ka: 'საშუალო პირობები' },
    poor:         { en: 'Poor Viewing Conditions',     ka: 'ცუდი პირობები' },
    loading:      { en: 'Loading sky data...',         ka: 'ცის მონაცემები იტვირთება...' },
    moonProgress: { en: 'Moon Phase Progress',         ka: 'მთვარის ფაზა' },
    brightMoon:   { en: '⚠️ Bright moon tonight — deep sky objects will be washed out.', ka: '⚠️ კაშკაშა მთვარეა — ღრმა ცის ობიექტები ნაკლებად ჩანს.' },
  },
  // Profile
  profile: {
    points:       { en: 'Points',                      ka: 'ქულები' },
    observations: { en: 'Observations',                ka: 'დაკვირვებები' },
    missions:     { en: 'Missions',                    ka: 'მისიები' },
    recentObs:    { en: 'Recent Observations',         ka: 'ბოლო დაკვირვებები' },
    noObs:        { en: 'No observations yet. Go to Missions to start!', ka: 'დაკვირვება ჯერ არ არის. გადადი მისიებში!' },
    approved:     { en: 'approved',                    ka: 'დადასტურებული' },
    pending:      { en: 'pending',                     ka: 'მოლოდინში' },
    rejected:     { en: 'rejected',                    ka: 'უარყოფილი' },
  },
  // Admin
  admin: {
    title:        { en: 'Admin — Pending Observations', ka: 'ადმინი — განსახილველი დაკვირვებები' },
    awaiting:     { en: 'awaiting review',             ka: 'განხილვის მოლოდინში' },
    allDone:      { en: 'All caught up!',              ka: 'ყველა განხილულია!' },
    noPending:    { en: 'No pending observations.',    ka: 'განსახილველი დაკვირვება არ არის.' },
    approve:      { en: 'Approve',                     ka: 'დამტკიცება' },
    reject:       { en: 'Reject',                      ka: 'უარყოფა' },
    points:       { en: 'Points:',                     ka: 'ქულები:' },
    demo:         { en: 'Demo mode — connect Supabase to manage real observations', ka: 'დემო რეჟიმი — Supabase-ს დაკავშირება საჭიროა' },
    pending:      { en: 'Pending',                     ka: 'მოლოდინში' },
  },
  // Teams
  teams: {
    title:        { en: 'Teams',                       ka: 'გუნდები' },
    subtitle:     { en: 'Compete as a group — coming in Phase 2', ka: 'გუნდური შეჯიბრი — მეორე ფაზაში' },
    soon:         { en: 'Teams are coming soon',       ka: 'გუნდები მალე' },
    soonDesc:     { en: 'Build your crew, complete team missions, and dominate the leaderboard together.', ka: 'შექმენი გუნდი, შეასრულე გუნდური მისიები და გაიმარჯვე ლიდერბორდზე.' },
  },
} as const

export function t(key: string, lang: Lang): string {
  const parts = key.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let obj: any = translations
  for (const part of parts) {
    obj = obj?.[part]
    if (!obj) return key
  }
  return obj?.[lang] ?? obj?.en ?? key
}
