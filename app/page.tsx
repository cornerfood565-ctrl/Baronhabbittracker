"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  Activity, Award, BarChart3, CalendarDays, Check, CheckCheck, ChevronLeft,
  ChevronRight, CircleHelp, Flame, LayoutDashboard, Menu, MoreHorizontal,
  Plus, Search, Settings2, Sparkles, Target, Trophy, Users, X, Zap
} from "lucide-react";

type Habit = { id: string; name: string; category: string; icon: string; color: string; completed: string[]; target: number };
type View = "Overview" | "My habits" | "Calendar" | "Analytics" | "Challenges" | "Achievements";
const localDateKey = (date: Date) => { const y = date.getFullYear(); const m = String(date.getMonth()+1).padStart(2,"0"); const d = String(date.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; };
const todayKey = () => localDateKey(new Date());
const initialHabits: Habit[] = [
  { id: "1", name: "Read 20 pages", category: "Learning", icon: "📚", color: "#9aa9bb", completed: [], target: 1 },
  { id: "2", name: "Morning workout", category: "Health", icon: "🏃", color: "#91a99d", completed: [], target: 1 },
  { id: "3", name: "Drink 8 glasses of water", category: "Health", icon: "💧", color: "#91aabd", completed: [], target: 1 },
  { id: "4", name: "Study for 2 hours", category: "Study", icon: "✍️", color: "#b4a2c4", completed: [], target: 1 },
  { id: "5", name: "Plan tomorrow", category: "Personal", icon: "🗓️", color: "#c0ad8e", completed: [], target: 1 }
];
const nav = [
  { name: "Overview" as View, icon: LayoutDashboard },
  { name: "My habits" as View, icon: Target },
  { name: "Calendar" as View, icon: CalendarDays },
  { name: "Analytics" as View, icon: BarChart3 },
  { name: "Challenges" as View, icon: Users },
  { name: "Achievements" as View, icon: Award }
];
const dateLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

export default function Home() {
  const [view, setView] = useState<View>("Overview");
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [modal, setModal] = useState(false);
  const [habitName, setHabitName] = useState("");
  const [category, setCategory] = useState("Personal");
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState(new Date());
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("baron-habits-v1");
      if (saved) setHabits(JSON.parse(saved));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();

    const loadCloudHabits = async (id: string) => {
      setCloudReady(false);
      const { data: rows, error } = await supabase
        .from("habits")
        .select("id, name, category, icon, color, target")
        .eq("user_id", id)
        .order("created_at", { ascending: true });
      if (error) {
        setToast("Cloud sync error: " + error.message);
        setCloudReady(true);
        return;
      }
      const { data: logs, error: logsError } = await supabase
        .from("habit_logs")
        .select("habit_id, completed_on")
        .eq("user_id", id);
      if (logsError) {
        setToast("Could not load habit history: " + logsError.message);
        setCloudReady(true);
        return;
      }
      const completedByHabit = new Map<string, string[]>();
      for (const log of logs ?? []) {
        const list = completedByHabit.get(log.habit_id) ?? [];
        list.push(log.completed_on);
        completedByHabit.set(log.habit_id, list);
      }
      setHabits((rows ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        icon: row.icon,
        color: row.color,
        target: row.target,
        completed: completedByHabit.get(row.id) ?? []
      })));
      setCloudReady(true);
    };

    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setUserId(session?.user.id ?? null);
      setUserEmail(session?.user.email ?? null);
      if (session?.user.id) loadCloudHabits(session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setUserEmail(session?.user.email ?? null);
      if (session?.user.id) {
        window.setTimeout(() => loadCloudHabits(session.user.id), 0);
      } else {
        setCloudReady(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (ready && !userId) localStorage.setItem("baron-habits-v1", JSON.stringify(habits));
  }, [habits, ready, userId]);

  const today = todayKey();
  const done = habits.filter(h => h.completed.includes(today)).length;
  const percent = habits.length ? Math.round(done / habits.length * 100) : 0;
  const filtered = habits.filter(h => h.name.toLowerCase().includes(query.toLowerCase()));
  const streak = (h: Habit) => {
    let count = 0; const d = new Date();
    if (!h.completed.includes(today)) d.setDate(d.getDate() - 1);
    while (h.completed.includes(localDateKey(d))) { count++; d.setDate(d.getDate()-1); }
    return count;
  };
  const toggle = async (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    const wasCompleted = habit.completed.includes(today);
    setHabits(old => old.map(h => h.id === id ? { ...h, completed: wasCompleted ? h.completed.filter(x => x !== today) : [...h.completed, today] } : h));
    if (userId && cloudReady) {
      const supabase = getSupabase();
      const result = wasCompleted
        ? await supabase.from("habit_logs").delete().eq("habit_id", id).eq("user_id", userId).eq("completed_on", today)
        : await supabase.from("habit_logs").insert({ habit_id: id, user_id: userId, completed_on: today });
      if (result.error) setToast("Cloud save failed: " + result.error.message);
    }
  };

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;
    const newHabit = { id: crypto.randomUUID(), name: habitName.trim(), category, icon: category === "Health" ? "🌿" : category === "Study" ? "📖" : category === "Learning" ? "💡" : "✦", color: "#aab4bf", completed: [] as string[], target: 1 };
    if (userId && cloudReady) {
      const { data, error } = await getSupabase().from("habits").insert({
        user_id: userId, name: newHabit.name, category: newHabit.category,
        icon: newHabit.icon, color: newHabit.color, target: newHabit.target
      }).select("id").single();
      if (error) {
        setToast("Could not save habit: " + error.message);
        return;
      }
      newHabit.id = data.id;
    }
    setHabits(old => [...old, newHabit]);
    setHabitName("");
    setModal(false);
    setToast(userId ? "Habit saved to your cloud account" : "Habit created on this device");
    setTimeout(() => setToast(""), 2600);
  };
  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const count = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
    return { offset: (first.getDay()+6)%7, count };
  }, [month]);
  const monthName = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month);
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const week = Array.from({length:7}, (_,i) => { const d = new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)+i); return d; });
  const weeklyValues = week.map(d => {
    const key = localDateKey(d);
    return { label: new Intl.DateTimeFormat("en",{weekday:"short"}).format(d), value: habits.length ? Math.round(habits.filter(h=>h.completed.includes(key)).length/habits.length*100) : 0 };
  });
  const totalCompletions = habits.reduce((n,h)=>n+h.completed.length,0);

  return (
    <div className="min-h-screen">
      <aside className="sidebar fixed inset-y-0 left-0 z-20 flex w-[248px] flex-col border-r border-[#252b32] bg-[#0d1014] px-5 py-6">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#525d69] bg-gradient-to-br from-[#454e59] to-[#1b2026] text-lg font-black text-white">B</div>
          <div><div className="text-[15px] font-bold tracking-[.16em]">BARON</div><div className="text-[10px] tracking-[.28em] text-[#8e99a5]">HABITS</div></div>
        </div>
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#68727e]">Workspace</div>
        <nav className="space-y-1">{nav.map(item => { const Icon = item.icon; return <button key={item.name} onClick={() => setView(item.name)} className={`nav-item ${view===item.name?"active":""}`}><Icon size={17}/>{item.name}</button>; })}</nav>
        <div className="mt-auto panel p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-[#c3ccd5]"/> Stay consistent</div>
          <p className="text-xs leading-5 text-[#929ba6]">Small actions, repeated daily, create remarkable change.</p>
          <div className="mt-3 h-1 rounded-full bg-[#343b44]"><div className="h-1 rounded-full bg-[#c6cdd5]" style={{width:percent+"%"}}/></div>
          <div className="mt-2 text-[10px] text-[#929ba6]">{percent}% of today's habits</div>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-[#252b32] pt-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#333b45] text-xs font-bold">BH</div>
          <div className="min-w-0 flex-1"><div className="text-xs font-semibold">My workspace</div><div className="text-[10px] text-[#818b96]">Personal account</div></div>
          <Settings2 size={16} className="text-[#7f8994]"/>
        </div>
      </aside>

      <main className="main-content ml-[248px] min-h-screen px-10 py-8">
        <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
          <div><div className="mb-2 text-xs font-medium text-[#8c96a1]">{dateLabel}</div><h1 className="text-2xl font-semibold tracking-tight">{view === "Overview" ? "Your daily overview" : view}</h1><p className="mt-1 text-sm text-[#8c96a1]">{view === "Overview" ? "A little progress each day adds up." : "Your habits, your pace, your progress."}</p></div>
          <div className="flex items-center gap-2">
            {userId ? <button className="ghost-btn" onClick={async()=>{await getSupabase().auth.signOut();setUserId(null);setUserEmail(null);setToast("Signed out");}} title={userEmail ?? "Account"}>{userEmail ? userEmail.split("@")[0] : "Account"} · Sign out</button> : <Link className="ghost-btn" href="/auth">{isSupabaseConfigured ? "Sign in" : "Connect account"}</Link>}
            <button className="ghost-btn" onClick={()=>setToast(userId ? (cloudReady ? "Cloud sync is active" : "Syncing your habits...") : "Your habits are saved on this device")}><CircleHelp size={15}/> Help</button>
            <button className="primary-btn" onClick={()=>setModal(true)}><Plus size={16}/> New habit</button>
          </div>
        </header>

        {view === "Overview" && <>
          <section className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="panel flex items-center justify-between p-5"><div><div className="text-xs text-[#929ba6]">Today's progress</div><div className="mt-2 text-3xl font-semibold">{percent}<span className="text-lg text-[#929ba6]">%</span></div><div className="mt-1 text-xs text-[#929ba6]">{done} of {habits.length} habits completed</div></div><div className="relative h-[76px] w-[76px]"><svg viewBox="0 0 80 80" className="-rotate-90"><circle cx="40" cy="40" r="32" stroke="#343b44" strokeWidth="7" fill="none"/><circle cx="40" cy="40" r="32" stroke="#cbd2da" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={201} strokeDashoffset={201-(201*percent/100)}/></svg><CheckCheck className="absolute left-[29px] top-[29px] text-[#d5dbe1]" size={22}/></div></div>
            <div className="panel p-5"><div className="flex items-center gap-2 text-xs text-[#929ba6]"><Flame size={15}/> Active streaks</div><div className="mt-2 text-3xl font-semibold">{Math.max(0,...habits.map(streak))}<span className="ml-2 text-base font-normal text-[#929ba6]">days</span></div><div className="mt-1 text-xs text-[#929ba6]">Your best current habit streak</div><div className="mt-4 flex gap-1">{Array.from({length:7},(_,i)=><span key={i} className={`h-1.5 flex-1 rounded-full ${i<Math.min(7,Math.max(0,...habits.map(streak)))?"bg-[#cbd2da]":"bg-[#343b44]"}`}/>)}</div></div>
            <div className="panel p-5"><div className="flex items-center gap-2 text-xs text-[#929ba6]"><Activity size={15}/> Total completions</div><div className="mt-2 text-3xl font-semibold">{totalCompletions}</div><div className="mt-1 text-xs text-[#929ba6]">Check-ins recorded all time</div><div className="mt-4 text-xs text-[#b8c1ca]">Keep showing up. It matters.</div></div>
          </section>
          <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="panel p-5">
              <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Today's habits</h2><p className="mt-1 text-xs text-[#929ba6]">Make today count</p></div><button className="text-xs text-[#c5cdd5] hover:text-white" onClick={()=>setView("My habits")}>View all <ChevronRight className="inline" size={14}/></button></div>
              <div className="space-y-2">{habits.slice(0,6).map(h=><HabitRow key={h.id} habit={h} checked={h.completed.includes(today)} streak={streak(h)} onToggle={()=>toggle(h.id)}/>)}
                {habits.length===0 && <Empty text="No habits yet. Create your first one."/>}
              </div>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#414a55] py-3 text-xs text-[#aeb7c1] hover:bg-[#20262d]" onClick={()=>setModal(true)}><Plus size={15}/> Add another habit</button>
            </div>
            <div className="space-y-5">
              <div className="panel p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">This week</h2><p className="mt-1 text-xs text-[#929ba6]">Daily completion rate</p></div><BarChart3 size={17} className="text-[#929ba6]"/></div><div className="flex h-36 items-end gap-2">{weeklyValues.map((v,i)=><div key={v.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex w-full flex-1 items-end rounded-md bg-[#252c34]"><div className="w-full rounded-md bg-gradient-to-t from-[#788491] to-[#d1d7de]" style={{height:`${Math.max(v.value,4)}%`}}/></div><span className="text-[10px] text-[#87919c]">{v.label}</span></div>)}</div></div>
              <div className="panel p-5"><div className="mb-3 flex items-center gap-2"><Trophy size={16} className="text-[#c5cdd5]"/><h2 className="font-semibold">Next milestone</h2></div><div className="text-sm font-medium">Build your first 7-day streak</div><p className="mt-1 text-xs leading-5 text-[#929ba6]">Complete a habit every day this week to unlock your consistency badge.</p><div className="mt-4 progress-track"><div className="progress-fill" style={{width:`${Math.min(100,Math.max(0,...habits.map(streak))/7*100)}%`}}/></div></div>
            </div>
          </section>
        </>}

        {view === "My habits" && <section className="panel p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">All habits</h2><p className="mt-1 text-xs text-[#929ba6]">{habits.length} habits in your workspace</p></div><div className="relative"><Search size={15} className="absolute left-3 top-3 text-[#78838f]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search habits..." className="w-56 rounded-xl border border-[#343b44] bg-[#11151a] py-2.5 pl-9 pr-3 text-xs"/></div></div><div className="space-y-2">{filtered.map(h=><HabitRow key={h.id} habit={h} checked={h.completed.includes(today)} streak={streak(h)} onToggle={()=>toggle(h.id)}/>)}{filtered.length===0&&<Empty text="No matching habits found."/>}</div></section>}

        {view === "Calendar" && <section className="panel p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Habit calendar</h2><p className="mt-1 text-xs text-[#929ba6]">Your daily consistency at a glance</p></div><div className="flex items-center gap-2"><button className="ghost-btn !p-2" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={15}/></button><span className="min-w-32 text-center text-sm">{monthName}</span><button className="ghost-btn !p-2" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={15}/></button></div></div><div className="grid grid-cols-7 gap-2">{days.map(d=><div key={d} className="py-2 text-center text-[11px] text-[#78838f]">{d}</div>)}{Array.from({length:monthDays.offset},(_,i)=><div key={"blank"+i}/>)}{Array.from({length:monthDays.count},(_,i)=>{const date=new Date(month.getFullYear(),month.getMonth(),i+1);const key=localDateKey(date);const count=habits.filter(h=>h.completed.includes(key)).length;return <div key={key} className={`flex min-h-16 flex-col items-center justify-center rounded-xl border ${key===today?"border-[#aeb8c3] bg-[#303943]":"border-[#2b3139] bg-[#14191f]"}`}><span className="text-xs">{i+1}</span><span className="mt-1 text-[10px] text-[#9da8b3]">{count?count+"/"+habits.length:"—"}</span></div>})}</div><p className="mt-4 text-xs text-[#818c98]">Numbers show completed habits for each date. Your data is stored on this device.</p></section>}

        {view === "Analytics" && <section className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><Metric label="Total check-ins" value={String(totalCompletions)} icon={<CheckCheck size={16}/>} /><Metric label="Active habits" value={String(habits.length)} icon={<Target size={16}/>} /><Metric label="Today's rate" value={percent+"%"} icon={<Activity size={16}/>} /></div><div className="panel p-5"><h2 className="font-semibold">Weekly consistency</h2><p className="mt-1 text-xs text-[#929ba6]">Percentage of habits completed each day</p><div className="mt-7 flex h-52 items-end gap-3">{weeklyValues.map(v=><div key={v.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-[#9ca6b1]">{v.value}%</span><div className="flex w-full flex-1 items-end rounded-lg bg-[#252c34]"><div className="w-full rounded-lg bg-gradient-to-t from-[#7e8a97] to-[#d8dde3]" style={{height:`${Math.max(v.value,2)}%`}}/></div><span className="text-xs text-[#929ba6]">{v.label}</span></div>)}</div></div><div className="panel p-5"><h2 className="mb-4 font-semibold">Habit breakdown</h2>{habits.map(h=><div key={h.id} className="mb-4"><div className="mb-2 flex justify-between text-xs"><span>{h.icon} {h.name}</span><span className="text-[#929ba6]">{h.completed.length} check-ins</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${Math.min(100,h.completed.length/Math.max(1,totalCompletions)*100)}%`}}/></div></div>)}</div></section>}

        {view === "Challenges" && <section className="grid gap-4 md:grid-cols-2"><div className="panel p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#303943]"><Users size={20}/></div><h2 className="text-lg font-semibold">7-day consistency challenge</h2><p className="mt-2 text-sm leading-6 text-[#929ba6]">Choose one habit and show up for seven days. Build momentum one day at a time.</p><div className="mt-5 flex items-center justify-between text-xs text-[#aeb7c1]"><span>Personal challenge</span><span>0 / 7 days</span></div><div className="mt-2 progress-track"><div className="progress-fill" style={{width:"0%"}}/></div><button className="primary-btn mt-5" onClick={()=>setToast("Challenge feature is ready for account setup")}>Start challenge <ChevronRight size={15}/></button></div><div className="panel p-6"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#303943]"><Zap size={20}/></div><h2 className="text-lg font-semibold">Community challenges</h2><p className="mt-2 text-sm leading-6 text-[#929ba6]">Invite friends, join shared goals and celebrate progress together.</p><div className="mt-5 rounded-xl border border-dashed border-[#414a55] p-4 text-center text-xs text-[#929ba6]">Connect an account to enable invitations and shared leaderboards.</div></div></section>}

        {view === "Achievements" && <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[{name:"First step",desc:"Complete your first habit",icon:"🌱",unlocked:totalCompletions>=1},{name:"Finding rhythm",desc:"Reach a 3-day streak",icon:"🔥",unlocked:Math.max(0,...habits.map(streak))>=3},{name:"One full week",desc:"Reach a 7-day streak",icon:"🏅",unlocked:Math.max(0,...habits.map(streak))>=7},{name:"Showing up",desc:"Record 25 check-ins",icon:"⚡",unlocked:totalCompletions>=25},{name:"Habit builder",desc:"Create 5 habits",icon:"🎯",unlocked:habits.length>=5},{name:"Consistency pro",desc:"Record 100 check-ins",icon:"💎",unlocked:totalCompletions>=100}].map(a=><div key={a.name} className={`panel p-5 ${a.unlocked?"":"opacity-55"}`}><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#303943] text-2xl">{a.icon}</div><div className="flex items-center gap-2 font-semibold">{a.name}{a.unlocked&&<Check size={14} className="text-[#d5dce3]"/>}</div><p className="mt-1 text-xs text-[#929ba6]">{a.desc}</p><div className="mt-4 text-[10px] uppercase tracking-wider text-[#8c96a1]">{a.unlocked?"Unlocked":"Locked"}</div></div>)}</section>}
        <footer className="mt-10 border-t border-[#252b32] pt-5 text-center text-[11px] text-[#69737e]">BARON HABITS <span className="mx-2">·</span> Build consistency, one day at a time.</footer>
      </main>

      <nav className="mobile-nav fixed inset-x-0 bottom-0 z-30 hidden justify-around border-t border-[#303740] bg-[#0d1014]/95 px-2 py-3 backdrop-blur">{nav.slice(0,5).map(item=>{const Icon=item.icon;return <button key={item.name} onClick={()=>setView(item.name)} className={`flex flex-col items-center gap-1 text-[9px] ${view===item.name?"text-white":"text-[#7f8994]"}`}><Icon size={18}/>{item.name}</button>})}</nav>

      {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={addHabit} className="panel w-full max-w-md p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Create a habit</h2><p className="mt-1 text-xs text-[#929ba6]">Make a small promise to yourself.</p></div><button type="button" onClick={()=>setModal(false)} className="ghost-btn !p-2"><X size={16}/></button></div><label className="mb-2 block text-xs text-[#aeb7c1]">Habit name</label><input autoFocus value={habitName} onChange={e=>setHabitName(e.target.value)} placeholder="e.g. Read for 20 minutes" className="mb-4 w-full rounded-xl border border-[#343b44] bg-[#11151a] px-3 py-3 text-sm"/><label className="mb-2 block text-xs text-[#aeb7c1]">Category</label><select value={category} onChange={e=>setCategory(e.target.value)} className="mb-6 w-full rounded-xl border border-[#343b44] bg-[#11151a] px-3 py-3 text-sm"><option>Personal</option><option>Health</option><option>Study</option><option>Learning</option></select><div className="flex justify-end gap-2"><button type="button" className="ghost-btn" onClick={()=>setModal(false)}>Cancel</button><button className="primary-btn" type="submit"><Plus size={15}/> Create habit</button></div></form></div>}
      {toast && <div className="fixed bottom-6 right-6 z-[60] rounded-xl border border-[#49535e] bg-[#242b33] px-4 py-3 text-sm shadow-xl">{toast}</div>}
    </div>
  );
}

function HabitRow({habit,checked,streak,onToggle}:{habit:Habit;checked:boolean;streak:number;onToggle:()=>void}) {
  return <div className="flex items-center gap-3 rounded-xl border border-[#2b3139] bg-[#14191f] px-3 py-3 transition hover:border-[#46515d]"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#29313a] text-lg">{habit.icon}</div><div className="min-w-0 flex-1"><div className={`truncate text-sm font-medium ${checked?"text-[#89939e] line-through":""}`}>{habit.name}</div><div className="mt-1 text-[10px] text-[#818c98]">{habit.category} <span className="mx-1">·</span> {streak} day streak</div></div><button onClick={onToggle} aria-label={checked?"Mark incomplete":"Mark complete"} className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${checked?"border-[#d0d7df] bg-[#d0d7df] text-[#11151a]":"border-[#4a5561] text-transparent hover:border-[#d0d7df]"}`}><Check size={16}/></button></div>;
}
function Metric({label,value,icon}:{label:string;value:string;icon:React.ReactNode}) { return <div className="panel p-5"><div className="flex items-center gap-2 text-xs text-[#929ba6]">{icon}{label}</div><div className="mt-3 text-3xl font-semibold">{value}</div></div>; }
function Empty({text}:{text:string}) { return <div className="rounded-xl border border-dashed border-[#414a55] py-10 text-center text-sm text-[#929ba6]">{text}</div>; }
