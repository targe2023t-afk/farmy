// v6.4 — Farmy App — Arabic permissions + dashboard fix
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./config/supabase";
import "./App.css";

const EXP_TYPES    = ["فاتورة","كهرباء","وقود","صيانة","عمالة","سماد","مبيدات","ري","إيجار","أخرى"];
const REV_TYPES    = ["قمح","ذرة","طماطم","بطاطس","بصل","فلفل ألوان","خضروات","فاكهة","أخرى"];
const INV_TYPES    = ["سماد","مبيد","بذور","محروقات","أدوات","أخرى"];
const EXPENSE_ICONS= {"فاتورة":"🧾","كهرباء":"⚡","وقود":"⛽","صيانة":"🔧","عمالة":"👷","سماد":"🌱","مبيدات":"🧴","ري":"💧","إيجار":"🏠","أخرى":"📦"};
const REV_ICONS    = {"قمح":"🌾","ذرة":"🌽","طماطم":"🍅","بطاطس":"🥔","بصل":"🧅","فلفل ألوان":"🌶️","خضروات":"🥦","فاكهة":"🍎","أخرى":"📦"};
const INV_ICONS    = {"سماد":"🌱","مبيد":"🧴","بذور":"🌰","محروقات":"⛽","أدوات":"🔧","أخرى":"📦"};

// مفاتيح الصفحات (داخلية)
const PAGE_KEYS = ["dashboard","expenses","revenue","inventory","workers","reports"];

// أسماء الصفحات بالعربي
const PAGE_LABELS = {
  dashboard : "الرئيسية",
  expenses  : "المصروفات",
  revenue   : "الإيرادات",
  inventory : "المخزن",
  workers   : "العمالة",
  reports   : "التقارير",
};

function genUUID() { return crypto.randomUUID(); }
function ld(k,fb){ try{ const r=localStorage.getItem("fmv6_"+k); return r?JSON.parse(r):fb; }catch{ return fb; } }
function sd(k,v){ try{ localStorage.setItem("fmv6_"+k,JSON.stringify(v)); }catch{} }
function todayStr(){ return new Date().toISOString().split("T")[0]; }
function todayAr(){
  const d=new Date();
  const days=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  const months=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function fmt(n){ return Number(n||0).toLocaleString("ar-EG"); }
function daysBetween(a,b){ if(!a) return 0; return Math.max(0,Math.floor((new Date(b||new Date())-new Date(a))/86400000)+1); }
function defPerms(){ return {pages:[...PAGE_KEYS],canEdit:[...PAGE_KEYS],canDelete:[...PAGE_KEYS]}; }
function emptyPerms(){ return {pages:[],canEdit:[],canDelete:[]}; }

const Nav = {
  home:<svg viewBox="0 0 24 24" fill="currentColor" style={{width:22,height:22}}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  exp:<svg viewBox="0 0 24 24" fill="currentColor" style={{width:22,height:22}}><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.8 14h9.2c.8 0 1.4-.4 1.7-1l4-7.2A1 1 0 0021.8 4H5.2L4 1H1v2h2l3.6 7.6L5 13c-.5 1 .2 2 1.2 2H20v-2H7.8z"/></svg>,
  rev:<svg viewBox="0 0 24 24" fill="currentColor" style={{width:22,height:22}}><path d="M3.5 18.5l6-6 4 4L22 6.92 20.59 5.5l-7.09 8-4-4L2 17z"/></svg>,
  inv:<svg viewBox="0 0 24 24" fill="currentColor" style={{width:22,height:22}}><path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
  wrk:<svg viewBox="0 0 24 24" fill="currentColor" style={{width:22,height:22}}><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  rep:<svg viewBox="0 0 24 24" fill="currentColor" style={{width:22,height:22}}><path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>,
  cal:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  scan:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:18,height:18}}><path d="M3 9V5a2 2 0 012-2h4M15 3h4a2 2 0 012 2v4M21 15v4a2 2 0 01-2 2h-4M9 21H5a2 2 0 01-2-2v-4"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
};

function createAuditEntry(user, action, entity, oldVal, newVal) {
  return {
    id: genUUID(),
    userId: user?.id,
    userName: user?.name || user?.username,
    action, entity,
    oldVal: oldVal ? JSON.stringify(oldVal) : null,
    newVal: newVal ? JSON.stringify(newVal) : null,
    time: new Date().toLocaleString("ar-EG"),
  };
}

export default function App() {
  const [user,setUser]             = useState(()=>ld("user",null));
  const [page,setPage]             = useState("dashboard");
  const [toast,setToast]           = useState(null);
  const [syncStatus,setSyncStatus] = useState("local");
  const [loading,setLoading]       = useState(true);

  const [users,setUsers] = useState(()=>ld("users",[
    {id:"00000000-0000-0000-0000-000000000001",username:"admin",password:"1234",role:"admin",name:"المدير العام",phone:"",status:"active",farmId:"farm-admin"},
  ]));

  const [expenses,setExpenses]   = useState(()=>ld("expenses",[]));
  const [revenues,setRevenues]   = useState(()=>ld("revenues",[]));
  const [inventory,setInventory] = useState(()=>ld("inventory",[]));
  const [workers,setWorkers]     = useState(()=>ld("workers",[]));
  const [usageLog,setUsageLog]   = useState(()=>ld("usageLog",[]));
  const [auditLog,setAuditLog]   = useState(()=>ld("auditLog",[]));
  const [trE,setTrE]             = useState(()=>ld("trE",[]));
  const [trR,setTrR]             = useState(()=>ld("trR",[]));
  const [trI,setTrI]             = useState(()=>ld("trI",[]));
  const [trW,setTrW]             = useState(()=>ld("trW",[]));

  useEffect(()=>sd("user",user),[user]);
  useEffect(()=>sd("users",users),[users]);
  useEffect(()=>sd("expenses",expenses),[expenses]);
  useEffect(()=>sd("revenues",revenues),[revenues]);
  useEffect(()=>sd("inventory",inventory),[inventory]);
  useEffect(()=>sd("workers",workers),[workers]);
  useEffect(()=>sd("usageLog",usageLog),[usageLog]);
  useEffect(()=>sd("auditLog",auditLog),[auditLog]);
  useEffect(()=>sd("trE",trE),[trE]);
  useEffect(()=>sd("trR",trR),[trR]);
  useEffect(()=>sd("trI",trI),[trI]);
  useEffect(()=>sd("trW",trW),[trW]);

  const showToast = useCallback(msg=>{ setToast(msg); setTimeout(()=>setToast(null),2500); },[]);
  const audit = useCallback((action,entity,oldV,newV)=>{
    setAuditLog(l=>[createAuditEntry(user,action,entity,oldV,newV),...l].slice(0,500));
  },[user]);

  const syncTimers     = useRef({});
  const isFirstRender  = useRef(true);

  const farmId = user?.farmId || user?.id || "unknown";

  const autoSync = useCallback(async (table, rows) => {
    if (!rows || rows.length === 0) return;
    setSyncStatus("syncing");
    try {
      const { error } = await supabase.from(table).upsert(rows, { onConflict:"id", ignoreDuplicates:false });
      if (error) throw new Error(error.message);
      setSyncStatus("synced");
      setTimeout(()=>setSyncStatus("local"),2000);
    } catch(e) {
      setSyncStatus("error");
      console.error("autoSync ["+table+"]:", e.message);
      setTimeout(()=>setSyncStatus("local"),3000);
    }
  },[]);

  const debouncedSync = useCallback((table,rows)=>{
    if(syncTimers.current[table]) clearTimeout(syncTimers.current[table]);
    syncTimers.current[table] = setTimeout(()=>autoSync(table,rows),2000);
  },[autoSync]);

  useEffect(()=>{ if(isFirstRender.current) return; debouncedSync("expenses",  expenses);  },[expenses,debouncedSync]);
  useEffect(()=>{ if(isFirstRender.current) return; debouncedSync("revenues",  revenues);  },[revenues,debouncedSync]);
  useEffect(()=>{ if(isFirstRender.current) return; debouncedSync("inventory", inventory); },[inventory,debouncedSync]);
  useEffect(()=>{ if(isFirstRender.current) return; debouncedSync("workers",   workers);   },[workers,debouncedSync]);
  useEffect(()=>{ if(isFirstRender.current) return; debouncedSync("usage_log", usageLog);  },[usageLog,debouncedSync]);

  const syncToServer = useCallback(async()=>{
    setSyncStatus("syncing");
    try {
      const tables = [
        ["expenses",expenses],["revenues",revenues],
        ["inventory",inventory],["workers",workers],["usage_log",usageLog],
      ];
      for(const [table,rows] of tables){
        if(rows?.length){
          const { error } = await supabase.from(table).upsert(rows,{onConflict:"id",ignoreDuplicates:false});
          if(error) throw new Error(`${table}: ${error.message}`);
        }
      }
      setSyncStatus("synced");
      showToast("✅ تم المزامنة مع السيرفر");
    } catch(e){
      setSyncStatus("error");
      showToast("⚠️ فشل: "+e.message);
    }
    setTimeout(()=>setSyncStatus("local"),3000);
  },[expenses,revenues,inventory,workers,usageLog,showToast]);

  useEffect(()=>{
    setSyncStatus("syncing");
    const load = async()=>{
      try {
        const { data: usrData, error: ue } = await supabase.from("users").select("*");
        if(ue) throw new Error("users: "+ue.message);

        if(usrData?.length){
          setUsers(prev=>{
            const merged = [...prev];
            usrData.forEach(su=>{
              const idx = merged.findIndex(lu=>lu.id===su.id);
              if(idx>=0) merged[idx]={...merged[idx],...su};
              else merged.push(su);
            });
            return merged;
          });
        }

        const fetchTable = async(t)=>{
          const { data, error } = await supabase.from(t).select("*");
          if(error) throw new Error(`${t}: ${error.message}`);
          return data || [];
        };
        const [expData,revData,invData,wrkData,useData] = await Promise.all([
          fetchTable("expenses"), fetchTable("revenues"), fetchTable("inventory"),
          fetchTable("workers"),  fetchTable("usage_log"),
        ]);
        const mergeById=(local,server)=>{
          const map=new Map(local.map(r=>[r.id,r]));
          server.forEach(r=>{ if(!map.has(r.id)) map.set(r.id,r); });
          return [...map.values()];
        };
        if(expData.length) setExpenses(prev=>mergeById(prev,expData));
        if(revData.length) setRevenues(prev=>mergeById(prev,revData));
        if(invData.length) setInventory(prev=>mergeById(prev,invData));
        if(wrkData.length) setWorkers(prev=>mergeById(prev,wrkData));
        if(useData.length) setUsageLog(prev=>mergeById(prev,useData));
        setSyncStatus("synced");
        setTimeout(()=>setSyncStatus("local"),2000);
      } catch(e){
        console.error("loadFromServer:", e.message);
        setSyncStatus("error");
        setTimeout(()=>setSyncStatus("local"),4000);
      } finally {
        isFirstRender.current = false;
        setLoading(false);
      }
    };
    load();
  },[]);

  // ✅ Fix: استقبال Google OAuth + Password Recovery
  const handleOAuthUser = useCallback(async (supabaseUser) => {
    if(!supabaseUser) return;
    const u = supabaseUser;
    const { data: existing } = await supabase.from("users").select("*").eq("username", u.email).limit(1);
    if(existing && existing.length){
      setUser(existing[0]);
      setPage("dashboard");
    } else {
      const fid = u.id;
      const newUser = {
        id: fid,
        username: u.email,
        password: "",
        name: u.user_metadata?.full_name || u.email,
        phone: "",
        farmName: "",
        role: "manager",
        status: "active",
        farmId: fid,
        permissions: defPerms(),
      };
      await supabase.from("users").upsert(newUser,{onConflict:"id"});
      setUser(newUser);
      setUsers(prev=>[...prev.filter(p=>p.id!==fid), newUser]);
      setPage("dashboard");
    }
  },[]);

  useEffect(()=>{
    // ✅ Fix: تحقق من session موجودة فور فتح التطبيق (بعد redirect من Google)
    supabase.auth.getSession().then(({ data: { session } })=>{
      if(session?.user && !user){
        handleOAuthUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session)=>{
      if(event==="PASSWORD_RECOVERY"){
        setPage("resetPassword");
        return;
      }
      // ✅ Fix: استقبل SIGNED_IN و INITIAL_SESSION كمان
      if((event==="SIGNED_IN" || event==="INITIAL_SESSION") && session?.user){
        // تأكد إن الدخول ده من Google مش من email/password
        const provider = session.user.app_metadata?.provider;
        if(provider === "google"){
          await handleOAuthUser(session.user);
        }
      }
    });
    return ()=> subscription.unsubscribe();
  },[handleOAuthUser]);

  const myExpenses  = user ? expenses.filter(r=>!r.farmId || r.farmId===farmId)  : [];
  const myRevenues  = user ? revenues.filter(r=>!r.farmId || r.farmId===farmId)  : [];
  const myInventory = user ? inventory.filter(r=>!r.farmId || r.farmId===farmId) : [];
  const myWorkers   = user ? workers.filter(r=>!r.farmId || r.farmId===farmId)   : [];
  const myUsageLog  = user ? usageLog.filter(r=>!r.farmId || r.farmId===farmId)  : [];

  const addWithFarm = (setter) => (updater) => {
    setter(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next.map(r => r.farmId ? r : {...r, farmId});
    });
  };

  const setMyExpenses  = addWithFarm(setExpenses);
  const setMyRevenues  = addWithFarm(setRevenues);
  const setMyInventory = addWithFarm(setInventory);
  const setMyWorkers   = addWithFarm(setWorkers);
  const setMyUsageLog  = addWithFarm(setUsageLog);

  const lowStock = myInventory.filter(i=>Number(i.minStock)>0&&Number(i.quantity)<=Number(i.minStock));
  const isOwner  = user?.role==="admin"||user?.role==="manager";
  const perms    = isOwner?defPerms():(user?.permissions||emptyPerms());
  const canE     = pg=>isOwner||(perms.canEdit||[]).includes(pg);
  const canD     = pg=>isOwner||(perms.canDelete||[]).includes(pg);
  // ✅ إصلاح: لا نضيف dashboard تلقائياً للمشرفين
  const pPages   = isOwner?[...PAGE_KEYS,"users"]:(perms.pages||[]);

  const [sidebarOpen,setSidebarOpen] = useState(false);

  // ── شاشة التحميل ──
  // ✅ Fix: صفحة إعادة تعيين كلمة السر بعد رابط الاسترداد
  if(page==="resetPassword") return <ResetPasswordPage onDone={()=>setPage("login")}/>;

  if(loading && !user) return (
    <div className="login-wrap" dir="rtl" style={{justifyContent:"center",fontFamily:"'Cairo',sans-serif"}}>
      <div className="login-top">
        <div className="login-logo">🌾</div>
        <div className="login-title">farmy</div>
        <div className="login-sub">جاري التحميل...</div>
      </div>
    </div>
  );

  if(!user) return (
    <LoginPage users={users} setUsers={setUsers} onLogin={u=>{
      setUser(u);
      const owner = u.role==="admin"||u.role==="manager";
      // ✅ إصلاح: لا نفرض dashboard لو مش في الصلاحيات
      const allowed = owner?[...PAGE_KEYS,"users"]:(u.permissions?.pages||[]);
      setPage(allowed[0]||"dashboard");
    }}/>
  );

  const NAV = [
    {k:"dashboard",ic:Nav.home,l:"الرئيسية"},
    {k:"expenses", ic:Nav.exp, l:"المصروفات"},
    {k:"revenue",  ic:Nav.rev, l:"الإيرادات"},
    {k:"inventory",ic:Nav.inv, l:"المخزن"},
    {k:"workers",  ic:Nav.wrk, l:"العمالة"},
    {k:"reports",  ic:Nav.rep, l:"التقارير"},
  ].filter(n=>pPages.includes(n.k));
  if(isOwner) NAV.push({k:"users",ic:<svg viewBox="0 0 24 24" fill="currentColor" style={{width:22,height:22}}><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,l:"المستخدمون"});

  const pageTitle = NAV.find(n=>n.k===page)?.l||page;
  const roleLabel = user.role==="admin"?"مدير عام":user.role==="manager"?"مدير مزرعة":user.role==="supervisor"?"مشرف":"مستخدم";

  const BOTTOM_NAV = [
    {k:"dashboard", ic:Nav.home, l:"الرئيسية"},
    {k:"expenses",  ic:Nav.exp,  l:"مصروفات"},
    {k:"revenue",   ic:Nav.rev,  l:"إيرادات"},
    {k:"inventory", ic:Nav.inv,  l:"المخزن"},
    {k:"workers",   ic:Nav.wrk,  l:"عمالة"},
  ].filter(n=>pPages.includes(n.k));

  return (
    <div className="app" dir="rtl">

      {syncStatus==="syncing"&&<div className="sync-bar">🔄 جاري المزامنة...</div>}
      {syncStatus==="synced" &&<div className="sync-bar">✅ تمت المزامنة بنجاح</div>}
      {syncStatus==="error"  &&<div className="sync-bar" style={{background:"var(--red-lt)",color:"var(--red)",cursor:"pointer"}} onClick={syncToServer}>⚠️ تعذر الاتصال — اضغط للمحاولة مجدداً</div>}

      {page==="dashboard" ? (
        <div className="top">
          <div className="top-inner">
            <div className="top-row1">
              <div>
                <div className="top-greeting">مرحباً 👋 {user.name}</div>
                <div className="top-farm">{user.farmName||"farmy"}</div>
              </div>
              <div className="top-actions">
                <button className="top-icon" onClick={()=>setSidebarOpen(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" style={{width:20,height:20}}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div className="top-date-pill">
              {Nav.cal} اليوم: {todayAr()}
            </div>
          </div>
        </div>
      ) : (
        <div className="page-top">
          <button className="back-btn" onClick={()=>setPage(pPages[0]||"dashboard")}>←</button>
          <div className="page-title">{pageTitle}</div>
          <button className="back-btn" onClick={()=>setSidebarOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" style={{width:18,height:18}}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="cnt">
        {page==="dashboard" && pPages.includes("dashboard") && <DashPage expenses={myExpenses} revenues={myRevenues} inventory={myInventory} workers={myWorkers} lowStock={lowStock} setPage={setPage}/>}
        {page==="expenses"  && <ExpPage  data={myExpenses}  setData={setMyExpenses}  trash={trE} setTrash={setTrE} canEdit={canE("expenses")} canDel={canD("expenses")} showToast={showToast} audit={audit}/>}
        {page==="revenue"   && <RevPage  data={myRevenues}  setData={setMyRevenues}  trash={trR} setTrash={setTrR} canEdit={canE("revenue")}  canDel={canD("revenue")}  showToast={showToast} audit={audit}/>}
        {page==="inventory" && <InvPage  data={myInventory} setData={setMyInventory} trash={trI} setTrash={setTrI} usageLog={myUsageLog} setUsageLog={setMyUsageLog} canEdit={canE("inventory")} canDel={canD("inventory")} showToast={showToast} lowStock={lowStock} audit={audit}/>}
        {page==="workers"   && <WrkPage  data={myWorkers}   setData={setMyWorkers}   trash={trW} setTrash={setTrW} canEdit={canE("workers")} canDel={canD("workers")} showToast={showToast} audit={audit}/>}
        {page==="reports"   && <RepPage  expenses={myExpenses} revenues={myRevenues} workers={myWorkers} inventory={myInventory} auditLog={auditLog} users={users}/>}
        {page==="users"     && isOwner && <UsrPage users={users} setUsers={setUsers} currentUser={user} showToast={showToast} audit={audit}/>}
      </div>

      <nav className="bottom-nav">
        {BOTTOM_NAV.slice(0,2).map(n=>(
          <button key={n.k} className={`nav-item ${page===n.k?"active":""}`} onClick={()=>setPage(n.k)}>
            {n.ic}<span className="nav-label">{n.l}</span>
          </button>
        ))}
        <button className="nav-item" style={{flex:"0 0 72px"}} onClick={()=>setSidebarOpen(true)}>
          <div className="nav-fab">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{width:22,height:22}}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </div>
        </button>
        {BOTTOM_NAV.slice(2,4).map(n=>(
          <button key={n.k} className={`nav-item ${page===n.k?"active":""}`} onClick={()=>setPage(n.k)}>
            {n.ic}<span className="nav-label">{n.l}</span>
          </button>
        ))}
      </nav>

      {sidebarOpen&&(
        <>
          <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)} style={{backdropFilter:"blur(4px)"}}/>
          <div className="sidebar">
            {/* Header — Profile */}
            <div className="sb-header">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div className="sb-avatar-new">
                  <span style={{fontSize:28}}>👤</span>
                </div>
                <button
                  onClick={()=>setSidebarOpen(false)}
                  style={{width:36,height:36,borderRadius:"50%",border:"none",background:"rgba(255,255,255,.15)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:18}}
                >✕</button>
              </div>
              <div className="sb-name">{user.name}</div>
              <div className="sb-role" style={{fontSize:13,color:"rgba(255,255,255,.75)",fontWeight:500,marginTop:2}}>
                {roleLabel} — {user.farmName||"farmy"}
              </div>
              <div className="sb-status-pill">
                <div className="sb-status-dot"/>
                نشط الآن
              </div>
            </div>

            {/* Nav Items */}
            <div className="sb-body">
              {NAV.map(n=>(
                <button key={n.k} className={`sb-item ${page===n.k?"on":""}`} onClick={()=>{setPage(n.k);setSidebarOpen(false);}}>
                  <div className="sb-item-ic">{n.ic}</div>
                  {n.l}
                </button>
              ))}
              <div className="sb-divider"/>
            </div>

            {/* Footer */}
            <div className="sb-footer">
              <button className="sb-sync-btn" onClick={()=>{setSidebarOpen(false);syncToServer();}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:18,height:18}}><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                مزامنة البيانات
              </button>
              <button className="sb-logout" onClick={()=>{setUser(null);setSidebarOpen(false);}}>
                <div className="sb-item-ic" style={{background:"var(--danger-bg)",borderRadius:12,width:38,height:38,flexShrink:0}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{width:18,height:18}}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                </div>
                تسجيل الخروج
              </button>
              <div className="sb-version">farmy v6.4 — Agro-Fintech</div>
            </div>
          </div>
        </>
      )}

      {toast&&<div className="toast">{toast}</div>}
    </div>
  );
}

// ─── RESET PASSWORD PAGE ──────────────────────────────────
function ResetPasswordPage({onDone}){
  const [newPass,setNewPass]=useState("");
  const [confirmPass,setConfirmPass]=useState("");
  const [err,setErr]=useState("");
  const [ok,setOk]=useState("");
  const [busy,setBusy]=useState(false);

  const doReset=async()=>{
    setErr("");setOk("");
    if(!newPass||newPass.length<6){setErr("كلمة المرور يجب أن تكون 6 أحرف على الأقل");return;}
    if(newPass!==confirmPass){setErr("كلمتا المرور غير متطابقتين");return;}
    setBusy(true);
    const {error}=await supabase.auth.updateUser({password:newPass});
    if(error){setErr(error.message);}
    else{
      setOk("✅ تم تغيير كلمة المرور بنجاح!");
      setTimeout(()=>{onDone();},2000);
    }
    setBusy(false);
  };

  return(
    <div className="login-wrap" dir="rtl" style={{fontFamily:"'Cairo',sans-serif"}}>
      <div className="login-top">
        <div className="login-logo">🌾</div>
        <div className="login-title">farmy</div>
        <div className="login-sub">إعادة تعيين كلمة المرور</div>
      </div>
      <div className="login-card">
        {err&&<div className="err-msg">{err}</div>}
        {ok&&<div className="ok-msg">{ok}</div>}
        <div className="finp-wrap">
          <span className="finp-icon">lock</span>
          <input className="finp-new" type="password" placeholder="كلمة المرور الجديدة"
            value={newPass} onChange={e=>setNewPass(e.target.value)}/>
        </div>
        <div className="finp-wrap">
          <span className="finp-icon">lock</span>
          <input className="finp-new" type="password" placeholder="تأكيد كلمة المرور"
            value={confirmPass} onChange={e=>setConfirmPass(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!busy&&doReset()}/>
        </div>
        <button className="save-btn" onClick={doReset} disabled={busy}>
          {busy?"جاري الحفظ...":"حفظ كلمة المرور الجديدة ←"}
        </button>
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────
function LoginPage({users,setUsers,onLogin}) {
  const [tab,setTab]=useState("login");
  const [f,setF]=useState({});
  const [err,setErr]=useState("");
  const [ok,setOk]=useState("");
  const [busy,setBusy]=useState(false);
  const [forgotEmail,setForgotEmail]=useState(""); // ✅ Fix: كان ناقص
  const s=(k,v)=>setF(x=>({...x,[k]:v}));

  const doGoogleLogin=async()=>{
    setBusy(true);setErr('');
    // ✅ Fix: Capacitor (Android/iOS) يحتاج deep link، Web يحتاج origin
    const isNative = window.Capacitor?.isNativePlatform?.() || false;
    const redirectTo = isNative
      ? "com.farmy.app://login-callback"   // Deep link للموبايل
      : window.location.origin;            // Web fallback

    const {error}=await supabase.auth.signInWithOAuth({
      provider:'google',
      options:{
        redirectTo,
        skipBrowserRedirect: false,
      }
    });
    if(error)setErr(error.message);
    setBusy(false);
  };

  const doLogin=async()=>{
    setErr("");setBusy(true);
    try{
      let u=users.find(x=>x.username===f.username&&x.password===f.password&&x.status==="active");
      if(!u){
        const { data, error } = await supabase
          .from("users").select("*")
          .eq("username", f.username).eq("password", f.password).limit(1);
        if(error) throw new Error(error.message);
        if(data&&data.length){
          u=data[0];
          setUsers(prev=>{
            const exists=prev.find(p=>p.id===u.id);
            return exists?prev.map(p=>p.id===u.id?u:p):[...prev,u];
          });
        }
      }
      if(u&&u.status==="active"){ onLogin(u); }
      else if(u&&u.status!=="active"){ setErr("هذا الحساب موقوف، تواصل مع المدير"); }
      else { setErr("خطأ في اسم المستخدم أو كلمة المرور"); }
    }catch(e){
      setErr("تعذر الاتصال بالسيرفر: "+e.message);
    }
    setBusy(false);
  };

  const doReg=async()=>{
    setErr("");setOk("");
    if(!f.username||!f.password||!f.fullName){setErr("يرجى ملء الحقول المطلوبة");return;}
    if(f.password!==f.confirmPassword){setErr("كلمة المرور غير متطابقة");return;}
    setBusy(true);
    try{
      const { data: existing, error: ce } = await supabase
        .from("users").select("id").eq("username", f.username).limit(1);
      if(ce) throw new Error(ce.message);
      if((existing&&existing.length) || users.find(u=>u.username===f.username)){
        setErr("اسم المستخدم موجود بالفعل");setBusy(false);return;
      }
      const fid = genUUID();
      const newUser = {
        id: fid,
        username: f.username,
        password: f.password,
        name: f.fullName,
        phone: f.phone||"",
        farmName: f.farmName||"",
        role: "manager",
        status: "active",
        farmId: fid,
        permissions: defPerms(),
      };
      const { error: ue } = await supabase.from("users").upsert(newUser,{onConflict:"id"});
      if(ue) throw new Error(ue.message);
      setUsers(u=>[...u, newUser]);
      setOk("تم إنشاء الحساب بنجاح ✓");
      setTimeout(()=>{setOk("");setTab("login");setF({username:f.username,password:f.password});},1400);
    }catch(e){
      setErr("فشل إنشاء الحساب: "+e.message);
    }
    setBusy(false);
  };

  return (
    <div className="login-wrap" dir="rtl" style={{fontFamily:"'Cairo',sans-serif",position:"relative",overflow:"hidden"}}>
      {/* Atmospheric decorations */}
      <div style={{position:"absolute",top:"-8%",right:"-8%",width:220,height:220,background:"rgba(163,246,156,0.22)",borderRadius:"50%",filter:"blur(48px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-5%",left:"-5%",width:280,height:280,background:"rgba(214,227,255,0.18)",borderRadius:"50%",filter:"blur(48px)",pointerEvents:"none"}}/>

      <div className="login-top" style={{textAlign:"center",paddingBottom:20}}>
        {/* New logo */}
        <img src="/logo.png" className="login-logo-new" style={{width:96,height:96,borderRadius:28,objectFit:"cover",boxShadow:"0 8px 28px rgba(13,99,27,.28)",transform:"rotate(3deg)"}}/>
        <div className="login-title">farmy</div>
        <div className="login-sub">إدارة ذكية لمزرعتك</div>
      </div>

      <div className="login-card">
        <div className="login-tabs">
          <button className={`login-tab ${tab==="login"?"on":""}`} onClick={()=>{setTab("login");setErr("");setOk("");}}>تسجيل دخول</button>
          <button className={`login-tab ${tab==="reg"?"on":""}`} onClick={()=>{setTab("reg");setErr("");setOk("");}}>حساب جديد</button>
        </div>

        {err&&<div className="err-msg">{err}</div>}
        {ok&&<div className="ok-msg">{ok}</div>}

        {tab==="forgot"&&(
          <>
            <div className="finp-wrap">
              <span className="finp-icon">mail</span>
              <input className="finp-new" type="email" placeholder="أدخل بريدك الإلكتروني" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)}/>
            </div>
            <button className="save-btn" onClick={async()=>{
              setBusy(true);setErr('');setOk('');
              const {error}=await supabase.auth.resetPasswordForEmail(forgotEmail);
              if(error)setErr(error.message);
              else setOk('✅ تم إرسال رابط الاستعادة على بريدك');
              setBusy(false);
            }} disabled={busy}>{busy?'جاري الإرسال...':'إرسال رابط الاستعادة'}</button>
            <div style={{textAlign:'center',marginTop:12}}>
              <span onClick={()=>{setTab('login');setErr('');setOk('');}} style={{color:'#0d631b',fontSize:13,fontWeight:700,cursor:'pointer'}}>← رجوع لتسجيل الدخول</span>
            </div>
          </>
        )}

        {tab==="login"&&(
          <>
            <div className="finp-wrap">
              <span className="finp-icon">person</span>
              <input className="finp-new" placeholder="اسم المستخدم" value={f.username||""} onChange={e=>s("username",e.target.value)} onKeyDown={e=>e.key==="Enter"&&!busy&&doLogin()}/>
            </div>
            <div className="finp-wrap">
              <span className="finp-icon">lock</span>
              <input className="finp-new" type="password" placeholder="كلمة المرور" value={f.password||""} onChange={e=>s("password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&!busy&&doLogin()}/>
            </div>
            <button className="save-btn" style={{marginTop:8}} onClick={doLogin} disabled={busy}>
              {busy?"جاري الدخول...":"تسجيل الدخول ←"}
            </button>
            <div style={{textAlign:"center",margin:"10px 0",color:"#707a6c",fontSize:13}}>أو</div>
            <button className="google-btn" onClick={doGoogleLogin} disabled={busy}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.7-6.7C35.8 2.5 30.2 0 24 0 14.6 0 6.6 5.5 2.6 13.6l7.8 6C12.3 13.1 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/><path fill="#FBBC05" d="M10.4 28.4A14.8 14.8 0 0 1 9.5 24c0-1.5.3-3 .9-4.4l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.4z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.3 0-11.6-4.2-13.5-9.9l-7.8 6.4C6.6 42.5 14.6 48 24 48z"/></svg>
              تسجيل الدخول بـ Google
            </button>
            <div style={{textAlign:"center",marginTop:12}}>
              <span onClick={()=>{setTab("forgot");setErr("");setOk("");}} style={{color:"#0d631b",fontSize:13,fontWeight:700,cursor:"pointer"}}>نسيت كلمة المرور؟</span>
            </div>
          </>
        )}
        {tab==="reg"&&(
          <>
            <div className="frow2">
              <div>
                <div className="flbl">الاسم الكامل *</div>
                <input className="finp" value={f.fullName||""} onChange={e=>s("fullName",e.target.value)}/>
              </div>
              <div>
                <div className="flbl">الهاتف</div>
                <input className="finp" value={f.phone||""} onChange={e=>s("phone",e.target.value)}/>
              </div>
            </div>
            <div className="frow">
              <div className="flbl">اسم المزرعة</div>
              <input className="finp" value={f.farmName||""} onChange={e=>s("farmName",e.target.value)}/>
            </div>
            <div className="frow2">
              <div>
                <div className="flbl">اسم المستخدم *</div>
                <input className="finp" value={f.username||""} onChange={e=>s("username",e.target.value)}/>
              </div>
              <div>
                <div className="flbl">كلمة المرور *</div>
                <input className="finp" type="password" value={f.password||""} onChange={e=>s("password",e.target.value)}/>
              </div>
            </div>
            <div className="frow">
              <div className="flbl">تأكيد كلمة المرور *</div>
              <input className="finp" type="password" value={f.confirmPassword||""} onChange={e=>s("confirmPassword",e.target.value)}/>
            </div>
            <button className="save-btn" onClick={doReg} disabled={busy}>
              {busy?"جاري الإنشاء...":"إنشاء الحساب +"}
            </button>
          </>
        )}
      </div>

      {/* Support link */}
      <div style={{textAlign:"center",marginTop:20,fontSize:13,color:"var(--m3-on-surface-variant)",fontWeight:600}}>
        هل تحتاج مساعدة؟ <span style={{color:"var(--m3-primary)",fontWeight:700,cursor:"pointer"}}>تواصل مع الدعم</span>
      </div>
    </div>
  );
}

// ─── BARCODE SCANNER ─────────────────────────────────────
function BarcodeScanner({onScan,onClose}) {
  const videoRef=useRef(null); const streamRef=useRef(null);
  const [error,setError]=useState(""); const [manualCode,setManualCode]=useState("");
  const [permState,setPermState]=useState("idle"); // idle | requesting | granted | denied

  useEffect(()=>{
    let interval;

    async function requestAndStart(){
      setPermState("requesting");

      // ✅ Fix: جرب Capacitor Camera أول (Android/iOS)
      try {
        const { Camera } = await import("@capacitor/camera");
        const perm = await Camera.requestPermissions({permissions:["camera"]});
        if(perm.camera === "denied"){
          setPermState("denied");
          setError("تم رفض إذن الكاميرا. يرجى تفعيله من إعدادات التطبيق.");
          return;
        }
      } catch(_){
        // مش Capacitor — شغّل Web fallback
      }

      // ✅ Web fallback: getUserMedia مع طلب الإذن صراحةً
      if(!navigator.mediaDevices?.getUserMedia){
        setError("الكاميرا غير مدعومة في هذا المتصفح.");
        setPermState("denied");
        return;
      }

      try{
        const stream=await navigator.mediaDevices.getUserMedia({
          video:{facingMode:"environment",width:{ideal:1280},height:{ideal:720}}
        });
        setPermState("granted");
        streamRef.current=stream;
        if(videoRef.current){
          videoRef.current.srcObject=stream;
          await videoRef.current.play();
        }

        if("BarcodeDetector" in window){
          const detector=new window.BarcodeDetector({formats:["ean_13","ean_8","qr_code","code_128","code_39"]});
          interval=setInterval(async()=>{
            if(videoRef.current){
              try{
                const b=await detector.detect(videoRef.current);
                if(b.length>0){onScan(b[0].rawValue);stopCamera();}
              }catch(_){}
            }
          },500);
        } else {
          setError("مسح الباركود غير مدعوم في هذا المتصفح. استخدم الإدخال اليدوي.");
        }
      }catch(e){
        setPermState("denied");
        if(e.name==="NotAllowedError"||e.name==="PermissionDeniedError"){
          setError("تم رفض إذن الكاميرا. يرجى السماح من إعدادات المتصفح ثم إعادة المحاولة.");
        } else if(e.name==="NotFoundError"){
          setError("لم يتم العثور على كاميرا في هذا الجهاز.");
        } else {
          setError("لا يمكن تشغيل الكاميرا: " + e.message);
        }
      }
    }

    const stopCamera=()=>{
      if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());}
      clearInterval(interval);
    };

    requestAndStart();
    return()=>{stopCamera();};
  },[onScan]);

  return(
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-handle"/>
        <div className="modal-title">📷 مسح الباركود</div>

        {permState==="requesting" && !error && (
          <div style={{textAlign:"center",padding:"20px 0",color:"var(--text2)"}}>
            ⏳ جاري طلب إذن الكاميرا...
          </div>
        )}

        {error
          ? <div style={{marginBottom:12}}>
              <div className="err-msg">{error}</div>
              {permState==="denied" && (
                <button className="save-btn" style={{marginTop:8,background:"#1565c0"}}
                  onClick={()=>{setError("");setPermState("idle");}}>
                  🔄 إعادة المحاولة
                </button>
              )}
            </div>
          : permState==="granted" && (
              <div className="scan-wrap" style={{margin:"0 0 14px"}}>
                <div className="scan-overlay">
                  <video ref={videoRef} className="scan-video" muted playsInline autoPlay/>
                  <div className="scan-line"/>
                </div>
              </div>
            )
        }

        <div style={{textAlign:"center",fontSize:12,color:"var(--text3)",marginBottom:12}}>أو أدخل الكود يدوياً</div>
        <div style={{display:"flex",gap:8}}>
          <input className="finp" style={{flex:1}} placeholder="أدخل الباركود..." value={manualCode}
            onChange={e=>setManualCode(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&manualCode&&onScan(manualCode)}/>
          <button className="save-btn" style={{width:"auto",padding:"11px 18px"}}
            onClick={()=>manualCode&&onScan(manualCode)}>تأكيد</button>
        </div>
        <button style={{width:"100%",marginTop:10,padding:11,background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:14,cursor:"pointer",color:"var(--text2)"}} onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────
function DashPage({expenses,revenues,inventory,workers,lowStock,setPage}) {
  const todayS=todayStr();
  const totRev=revenues.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const totExp=expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
  const net=totRev-totExp;
  const todayExp=expenses.filter(e=>e.date===todayS).reduce((s,e)=>s+(Number(e.amount)||0),0);
  const todayRevItems=revenues.filter(r=>r.date===todayS);
  const todayExpItems=expenses.filter(e=>e.date===todayS);
  return(
    <div>
      <div className="stats-grid">
        {[
          {label:"إجمالي الإيرادات",val:totRev,cls:"green",icon:"💰",bg:"si-g"},
          {label:"إجمالي المصروفات",val:totExp,cls:"red",icon:"🛒",bg:"si-r"},
          {label:"صافي الربح",val:Math.abs(net),cls:net>=0?"green":"red",icon:"📈",bg:"si-g"},
          {label:"مشتريات اليوم",val:todayExp,cls:"blue",icon:"🛍️",bg:"si-b"},
        ].map((s,i)=>(
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.bg}`}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{fmt(s.val)}</div>
            <div className="stat-sub">جنيه</div>
          </div>
        ))}
      </div>
      <div className="section">
        <div className="section-title">ملخص اليوم</div>
        <div className="summary-card">
          <div className="sum-row"><span className="sum-label">💰 إجمالي الإيرادات</span><span className="sum-value g">{fmt(totRev)} جنيه</span></div>
          <div className="sum-row"><span className="sum-label">🛒 إجمالي المصروفات</span><span className="sum-value r">{fmt(totExp)} جنيه</span></div>
          <div className="sum-row"><span className="sum-label">📊 صافي الربح</span><span className={`sum-value ${net>=0?"g":"r"}`}>{fmt(net)} جنيه</span></div>
        </div>
      </div>
      {lowStock.length>0&&(
        <div className="section">
          <div className="section-title">تنبيهات المخزن</div>
          <div className="alert-card">{lowStock.map(i=><div key={i.id} className="alert-row"><span className="alert-name">{i.name}</span><span className="alert-badge">⚠️ كمية منخفضة</span></div>)}</div>
        </div>
      )}
      {todayRevItems.length>0&&(
        <div className="section"><div className="section-title">إيرادات اليوم</div>
          {todayRevItems.map(item=>(
            <div key={item.id} className="list-item" style={{margin:"0 0 8px"}}>
              <div className="li-icon" style={{background:"#e8f5ec"}}>{REV_ICONS[item.product]||"📦"}</div>
              <div className="li-body"><div className="li-title">{item.product}</div><div className="li-sub">{item.date}</div></div>
              <div className="li-right"><div className="li-amount" style={{color:"var(--green)"}}>+{fmt(item.amount)}</div><div className="li-date">جنيه</div></div>
            </div>
          ))}
        </div>
      )}
      {todayExpItems.length>0&&(
        <div className="section" style={{paddingBottom:14}}><div className="section-title">مصروفات اليوم</div>
          {todayExpItems.map(item=>(
            <div key={item.id} className="list-item" style={{margin:"0 0 8px"}}>
              <div className="li-icon" style={{background:"#ffebee"}}>{EXPENSE_ICONS[item.category]||"📦"}</div>
              <div className="li-body"><div className="li-title">{item.category}</div><div className="li-sub">{item.notes||""}</div></div>
              <div className="li-right"><div className="li-amount" style={{color:"var(--red)"}}>-{fmt(item.amount)}</div><div className="li-date">جنيه</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── EXPENSES ────────────────────────────────────────────
function ExpPage({data,setData,trash,setTrash,canEdit,canDel,showToast,audit}) {
  const [showForm,setShowForm]=useState(false);
  const [showR,setShowR]=useState(false);
  const [edit,setEdit]=useState(null);
  const [f,setF]=useState({});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const RECEIPT_TYPES=["فاتورة رسمية","إيصال عادي","بدون إيصال"];
  const save=()=>{
    const item={...f,id:edit?edit.id:genUUID()};
    if(edit){audit("edit","مصروف",edit,item);setData(d=>d.map(i=>i.id===edit.id?item:i));}
    else{audit("add","مصروف",null,item);setData(d=>[...d,item]);}
    setShowForm(false);setEdit(null);setF({});showToast("تم الحفظ ✓");
  };
  const del=item=>{audit("delete","مصروف",item,null);setTrash(tr=>[{...item,_d:Date.now()},...tr]);setData(d=>d.filter(i=>i.id!==item.id));showToast("تم الحذف");};
  const restore=item=>{setData(d=>[...d,item]);setTrash(tr=>tr.filter(i=>i.id!==item.id));showToast("تم الاسترجاع ✓");};
  const sorted=[...data].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return(
    <div>
      {canEdit&&<button className="add-btn-full" onClick={()=>{setF({date:todayStr()});setEdit(null);setShowForm(true);}}>+ إضافة مصروف</button>}
      {canEdit&&trash.length>0&&<div style={{padding:"0 14px 10px",textAlign:"center"}}><button style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:20,padding:"6px 16px",fontFamily:"'Cairo',sans-serif",fontSize:12,cursor:"pointer",color:"var(--text2)"}} onClick={()=>setShowR(true)}>🗑 استرجاع ({trash.length})</button></div>}
      <div className="section"><div className="section-title">آخر المصروفات</div></div>
      <div className="list-items">
        {sorted.length===0&&<div className="no-data">لا توجد بيانات</div>}
        {sorted.map(item=>(
          <div key={item.id} className="list-item">
            <div className="li-icon" style={{background:"#ffebee"}}>{EXPENSE_ICONS[item.category]||"📦"}</div>
            <div className="li-body">
              <div className="li-title">{item.category}{item.receiptType?` · ${item.receiptType}`:""}</div>
              <div className="li-sub">{item.notes||""}</div>
            </div>
            <div className="li-right">
              <div className="li-amount" style={{color:"var(--red)"}}>{fmt(item.amount)}</div>
              <div className="li-date">{item.date}</div>
              {(canEdit||canDel)&&<div className="li-actions" style={{marginTop:4}}>
                {canEdit&&<button className="ibt ibt-g" onClick={()=>{setF({...item});setEdit(item);setShowForm(true);}}>✏️</button>}
                {canDel&&<button className="ibt ibt-r" onClick={()=>del(item)}>🗑️</button>}
              </div>}
            </div>
          </div>
        ))}
      </div>
      {showForm&&(
        <div className="modal-ov" onClick={()=>setShowForm(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-title">{edit?"تعديل المصروف":"+ إضافة مصروف"}</div>
            <div className="frow"><div className="flbl">نوع المصروف</div>
              <select className="finp" value={f.category||""} onChange={e=>s("category",e.target.value)}>
                <option value="">اختر نوع المصروف</option>{EXP_TYPES.map(x=><option key={x}>{x}</option>)}
              </select></div>
            <div className="frow"><div className="flbl">نوع الإيصال</div>
              <select className="finp" value={f.receiptType||""} onChange={e=>s("receiptType",e.target.value)}>
                <option value="">اختر نوع الإيصال</option>{RECEIPT_TYPES.map(x=><option key={x}>{x}</option>)}
              </select></div>
            <div className="frow2">
              <div><div className="flbl">المبلغ (جنيه)</div><input className="finp" type="number" value={f.amount||""} onChange={e=>s("amount",e.target.value)}/></div>
              <div><div className="flbl">التاريخ</div><input className="finp" type="date" value={f.date||""} onChange={e=>s("date",e.target.value)}/></div>
            </div>
            <div className="frow"><div className="flbl">ملاحظات</div><input className="finp" value={f.notes||""} onChange={e=>s("notes",e.target.value)}/></div>
            <button className="save-btn" onClick={save}>حفظ</button>
          </div>
        </div>
      )}
      {showR&&<RestoreModal trash={trash} onRestore={restore} onClose={()=>setShowR(false)}/>}
    </div>
  );
}

// ─── REVENUE ─────────────────────────────────────────────
function RevPage({data,setData,trash,setTrash,canEdit,canDel,showToast,audit}) {
  const [showForm,setShowForm]=useState(false);
  const [showR,setShowR]=useState(false);
  const [edit,setEdit]=useState(null);
  const [f,setF]=useState({});
  const s=(k,v)=>setF(x=>{
    const nf={...x,[k]:v};
    if(k==="quantity"||k==="price"){nf.amount=(Number(k==="quantity"?v:nf.quantity)||0)*(Number(k==="price"?v:nf.price)||0);}
    return nf;
  });
  const save=()=>{
    const item={...f,id:edit?edit.id:genUUID()};
    if(edit){audit("edit","إيراد",edit,item);setData(d=>d.map(i=>i.id===edit.id?item:i));}
    else{audit("add","إيراد",null,item);setData(d=>[...d,item]);}
    setShowForm(false);setEdit(null);setF({});showToast("تم الحفظ ✓");
  };
  const del=item=>{audit("delete","إيراد",item,null);setTrash(tr=>[{...item,_d:Date.now()},...tr]);setData(d=>d.filter(i=>i.id!==item.id));showToast("تم الحذف");};
  const restore=item=>{setData(d=>[...d,item]);setTrash(tr=>tr.filter(i=>i.id!==item.id));showToast("تم الاسترجاع ✓");};
  const sorted=[...data].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return(
    <div>
      {canEdit&&<button className="add-btn-full" onClick={()=>{setF({date:todayStr()});setEdit(null);setShowForm(true);}}>+ إضافة إيراد</button>}
      {canEdit&&trash.length>0&&<div style={{padding:"0 14px 10px",textAlign:"center"}}><button style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:20,padding:"6px 16px",fontFamily:"'Cairo',sans-serif",fontSize:12,cursor:"pointer",color:"var(--text2)"}} onClick={()=>setShowR(true)}>🗑 استرجاع ({trash.length})</button></div>}
      <div className="section"><div className="section-title">آخر الإيرادات</div></div>
      <div className="list-items">
        {sorted.length===0&&<div className="no-data">لا توجد بيانات</div>}
        {sorted.map(item=>(
          <div key={item.id} className="list-item">
            <div className="li-icon" style={{background:"#e8f5ec"}}>{REV_ICONS[item.product]||"📦"}</div>
            <div className="li-body">
              <div className="li-title">{item.product}</div>
              <div className="li-sub">{item.traderName?`التاجر: ${item.traderName} · `:""}{item.date}</div>
            </div>
            <div className="li-right">
              <div className="li-amount" style={{color:"var(--green)"}}>{fmt(item.amount)}</div>
              <div className="li-date">جنيه</div>
              {(canEdit||canDel)&&<div className="li-actions" style={{marginTop:4}}>
                {canEdit&&<button className="ibt ibt-g" onClick={()=>{setF({...item});setEdit(item);setShowForm(true);}}>✏️</button>}
                {canDel&&<button className="ibt ibt-r" onClick={()=>del(item)}>🗑️</button>}
              </div>}
            </div>
          </div>
        ))}
      </div>
      {showForm&&(
        <div className="modal-ov" onClick={()=>setShowForm(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-title">{edit?"تعديل الإيراد":"+ إضافة إيراد"}</div>
            <div className="frow"><div className="flbl">نوع الإيراد</div>
              <select className="finp" value={f.product||""} onChange={e=>s("product",e.target.value)}>
                <option value="">اختر نوع الإيراد</option>{REV_TYPES.map(x=><option key={x}>{x}</option>)}
              </select></div>
            <div className="frow2">
              <div><div className="flbl">الكمية</div><input className="finp" type="number" value={f.quantity||""} onChange={e=>s("quantity",e.target.value)}/></div>
              <div><div className="flbl">سعر البيع</div><input className="finp" type="number" value={f.price||""} onChange={e=>s("price",e.target.value)}/></div>
            </div>
            <div className="frow2">
              <div><div className="flbl">المبلغ (تلقائي)</div><input className="finp ro" readOnly value={f.amount||0}/></div>
              <div><div className="flbl">التاريخ</div><input className="finp" type="date" value={f.date||""} onChange={e=>s("date",e.target.value)}/></div>
            </div>
            <div className="frow2">
              <div><div className="flbl">اسم التاجر</div><input className="finp" value={f.traderName||""} onChange={e=>s("traderName",e.target.value)}/></div>
              <div><div className="flbl">هاتف التاجر</div><input className="finp" value={f.traderPhone||""} onChange={e=>s("traderPhone",e.target.value)}/></div>
            </div>
            <div className="frow"><div className="flbl">ملاحظات</div><input className="finp" value={f.notes||""} onChange={e=>s("notes",e.target.value)}/></div>
            <button className="save-btn" onClick={save}>حفظ</button>
          </div>
        </div>
      )}
      {showR&&<RestoreModal trash={trash} onRestore={restore} onClose={()=>setShowR(false)}/>}
    </div>
  );
}

// ─── INVENTORY ───────────────────────────────────────────
function InvPage({data,setData,trash,setTrash,usageLog,setUsageLog,canEdit,canDel,showToast,lowStock,audit}) {
  const [showForm,setShowForm]=useState(false);
  const [showR,setShowR]=useState(false);
  const [showScanner,setShowScanner]=useState(false);
  const [useItem,setUse]=useState(null);
  const [edit,setEdit]=useState(null);
  const [f,setF]=useState({});
  const [useQty,setUQ]=useState("");
  const [q,setQ]=useState("");
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const save=()=>{
    const item={...f,id:edit?edit.id:genUUID()};
    if(edit){audit("edit","مخزون",edit,item);setData(d=>d.map(i=>i.id===edit.id?item:i));}
    else{audit("add","مخزون",null,item);setData(d=>[...d,item]);}
    setShowForm(false);setEdit(null);setF({});showToast("تم الحفظ ✓");
  };
  const del=item=>{audit("delete","مخزون",item,null);setTrash(tr=>[{...item,_d:Date.now()},...tr]);setData(d=>d.filter(i=>i.id!==item.id));showToast("تم الحذف");};
  const restore=item=>{setData(d=>[...d,item]);setTrash(tr=>tr.filter(i=>i.id!==item.id));showToast("تم الاسترجاع ✓");};
  const doUse=()=>{
    const qty=Number(useQty);
    if(!qty||qty<=0){showToast("أدخل كمية صحيحة");return;}
    const updated={...useItem,quantity:Math.max(0,Number(useItem.quantity)-qty)};
    audit("edit","استخدام مخزون",useItem,updated);
    setData(d=>d.map(i=>i.id===useItem.id?updated:i));
    setUsageLog(l=>[...l,{id:genUUID(),itemName:useItem.name,qty,date:todayStr()}]);
    setUse(null);setUQ("");showToast("تم الخصم من المخزن ✓");
  };
  const handleScan=(code)=>{
    setShowScanner(false);
    const found=data.find(i=>i.barcode===code);
    if(found){setUse(found);setUQ("");showToast(`✅ تم العثور على: ${found.name}`);}
    else{setF({barcode:code});setEdit(null);setShowForm(true);showToast("باركود جديد - أكمل البيانات");}
  };
  const filtered=data.filter(i=>(i.name||"").includes(q)||(i.barcode||"").includes(q)||(i.type||"").includes(q));
  return(
    <div>
      <div className="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{width:18,height:18,flexShrink:0}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input placeholder="بحث عن صنف أو باركود..." value={q} onChange={e=>setQ(e.target.value)}/>
      </div>
      {canEdit&&(
        <div style={{display:"flex",gap:8,margin:"10px 14px 0"}}>
          <button className="add-btn-full" style={{margin:0,flex:1}} onClick={()=>{setF({});setEdit(null);setShowForm(true);}}>+ إضافة صنف</button>
          <button className="add-btn-full" style={{margin:0,width:"auto",padding:"14px 16px",background:"#1565c0"}} onClick={()=>setShowScanner(true)}>{Nav.scan}</button>
        </div>
      )}
      {canEdit&&trash.length>0&&<div style={{padding:"8px 14px 4px",textAlign:"center"}}><button style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:20,padding:"6px 16px",fontFamily:"'Cairo',sans-serif",fontSize:12,cursor:"pointer",color:"var(--text2)"}} onClick={()=>setShowR(true)}>🗑 استرجاع ({trash.length})</button></div>}
      <div style={{height:10}}/>
      {filtered.length===0&&<div className="no-data">لا توجد بيانات</div>}
      {filtered.map(item=>{
        const low=Number(item.minStock)>0&&Number(item.quantity)<=Number(item.minStock);
        const out=Number(item.quantity)===0;
        return(
          <div key={item.id} className="inv-item">
            <div className="inv-top">
              <div>
                <div className="inv-name">{INV_ICONS[item.type]||"📦"} {item.name}</div>
                <div className="inv-pkg">{item.type}{item.barcode?` · 🔲 ${item.barcode}`:""}</div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {canEdit&&<button className="use-btn" onClick={()=>{setUse(item);setUQ("");}}>استخدام</button>}
                {canEdit&&<button className="ibt ibt-g" onClick={()=>{setF({...item});setEdit(item);setShowForm(true);}}>✏️</button>}
                {canDel&&<button className="ibt ibt-r" onClick={()=>del(item)}>🗑️</button>}
              </div>
            </div>
            <div className="inv-rows">
              <div className="inv-row"><div className="inv-row-l">الكمية المتاحة</div><div className={`inv-row-v ${out?"warn":low?"warn":"ok"}`}>{fmt(item.quantity)} {item.unit||""}</div></div>
              <div className="inv-row"><div className="inv-row-l">الحد الأدنى</div><div className="inv-row-v">{item.minStock?fmt(item.minStock):"—"} {item.unit||""}</div></div>
            </div>
            {item.price&&<div style={{marginTop:6,fontSize:12,color:"var(--text3)"}}>💰 القيمة: <b style={{color:"var(--green)"}}>{fmt(Number(item.quantity)*Number(item.price))} جنيه</b></div>}
            {(out||low)&&<div style={{marginTop:8,background:"#ffebee",borderRadius:8,padding:"6px 10px",fontSize:12,color:"var(--red)",fontWeight:700}}>⚠️ {out?"نفد المخزن":"كمية منخفضة"}</div>}
          </div>
        );
      })}
      {showScanner&&<BarcodeScanner onScan={handleScan} onClose={()=>setShowScanner(false)}/>}
      {showForm&&(
        <div className="modal-ov" onClick={()=>setShowForm(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-title">{edit?"تعديل الصنف":"+ إضافة صنف"}</div>
            <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"flex-end"}}>
              <div style={{flex:1}}><div className="flbl">الباركود</div><input className="finp" value={f.barcode||""} onChange={e=>s("barcode",e.target.value)} placeholder="أدخل أو امسح..."/></div>
              <button style={{height:42,padding:"0 12px",background:"#1565c0",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:700}} onClick={()=>{setShowForm(false);setShowScanner(true);}}>{Nav.scan} مسح</button>
            </div>
            <div className="frow2">
              <div><div className="flbl">الاسم</div><input className="finp" value={f.name||""} onChange={e=>s("name",e.target.value)}/></div>
              <div><div className="flbl">النوع</div><select className="finp" value={f.type||""} onChange={e=>s("type",e.target.value)}><option value="">اختر النوع</option>{INV_TYPES.map(x=><option key={x}>{x}</option>)}</select></div>
            </div>
            <div className="frow2">
              <div><div className="flbl">الكمية</div><input className="finp" type="number" value={f.quantity||""} onChange={e=>s("quantity",e.target.value)}/></div>
              <div><div className="flbl">الوحدة</div><select className="finp" value={f.unit||""} onChange={e=>s("unit",e.target.value)}><option value="">الوحدة</option>{["كجم","طن","لتر","عبوة","قطعة"].map(x=><option key={x}>{x}</option>)}</select></div>
            </div>
            <div className="frow2">
              <div><div className="flbl">الحد الأدنى</div><input className="finp" type="number" value={f.minStock||""} onChange={e=>s("minStock",e.target.value)}/></div>
              <div><div className="flbl">سعر الوحدة</div><input className="finp" type="number" value={f.price||""} onChange={e=>s("price",e.target.value)}/></div>
            </div>
            <button className="save-btn" onClick={save}>حفظ</button>
          </div>
        </div>
      )}
      {useItem&&(
        <div className="modal-ov" onClick={()=>setUse(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-title">استخدام من المخزن — {useItem.name}</div>
            <div style={{background:"var(--green3)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13}}><span style={{color:"var(--text2)"}}>المتاح: </span><b style={{color:"var(--green)"}}>{fmt(useItem.quantity)} {useItem.unit}</b></div>
            <div className="frow"><div className="flbl">الكمية المستخدمة</div><input className="finp" type="number" value={useQty} onChange={e=>setUQ(e.target.value)} autoFocus/></div>
            <button className="save-btn" onClick={doUse}>تأكيد الاستخدام</button>
          </div>
        </div>
      )}
      {showR&&<RestoreModal trash={trash} onRestore={restore} onClose={()=>setShowR(false)}/>}
    </div>
  );
}

// ─── WORKERS ─────────────────────────────────────────────
function WrkPage({data,setData,trash,setTrash,canEdit,canDel,showToast,audit}) {
  const [showForm,setShowForm]=useState(false);
  const [showR,setShowR]=useState(false);
  const [edit,setEdit]=useState(null);
  const [f,setF]=useState({});
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const days=w=>daysBetween(w.startDate,w.endDate||null);
  const total=w=>days(w)*(Number(w.dailyRate)||0);
  const active=data.filter(w=>!w.endDate).length;
  const todayCost=data.filter(w=>!w.endDate).reduce((s,w)=>s+(Number(w.dailyRate)||0),0);
  const save=()=>{
    const item={...f,id:edit?edit.id:genUUID()};
    if(edit){audit("edit","عامل",edit,item);setData(d=>d.map(i=>i.id===edit.id?item:i));}
    else{audit("add","عامل",null,item);setData(d=>[...d,item]);}
    setShowForm(false);setEdit(null);setF({});showToast("تم الحفظ ✓");
  };
  const del=item=>{audit("delete","عامل",item,null);setTrash(tr=>[{...item,_d:Date.now()},...tr]);setData(d=>d.filter(i=>i.id!==item.id));showToast("تم الحذف");};
  const restore=item=>{setData(d=>[...d,item]);setTrash(tr=>tr.filter(i=>i.id!==item.id));showToast("تم الاسترجاع ✓");};
  const checkout=w=>{audit("edit","خروج عامل",w,{...w,endDate:todayStr()});setData(d=>d.map(i=>i.id===w.id?{...i,endDate:todayStr()}:i));showToast("تم تسجيل الخروج ✓");};
  return(
    <div>
      <div style={{margin:"14px 14px 0",background:"var(--surface)",borderRadius:14,padding:16,boxShadow:"var(--shadow)"}}>
        <div style={{display:"flex",gap:14}}>
          <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:11,color:"var(--text3)",marginBottom:4}}>إجمالي عدد العمال</div><div style={{fontSize:28,fontWeight:900,color:"var(--text)"}}>{active}</div></div>
          <div style={{width:1,background:"var(--border)"}}/>
          <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:11,color:"var(--text3)",marginBottom:4}}>تكلفة العمالة اليوم</div><div style={{fontSize:22,fontWeight:900,color:"var(--green)"}}>{fmt(todayCost)}</div><div style={{fontSize:11,color:"var(--text3)"}}>جنيه</div></div>
        </div>
      </div>
      {canEdit&&<button className="add-btn-full" style={{marginTop:12}} onClick={()=>{setF({startDate:todayStr()});setEdit(null);setShowForm(true);}}>+ إضافة عامل</button>}
      {canEdit&&trash.length>0&&<div style={{padding:"0 14px 4px",textAlign:"center"}}><button style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:20,padding:"6px 16px",fontFamily:"'Cairo',sans-serif",fontSize:12,cursor:"pointer",color:"var(--text2)"}} onClick={()=>setShowR(true)}>🗑 استرجاع ({trash.length})</button></div>}
      {data.length===0&&<div className="no-data">لا توجد بيانات</div>}
      {data.map(item=>{
        const d=days(item),tot=total(item),paid=Number(item.paid)||0,isActive=!item.endDate;
        return(
          <div key={item.id} className="worker-item">
            <div className="w-avatar">👷</div>
            <div style={{flex:1}}>
              <div className="w-name">{item.name}</div>
              <div className="w-daily">الأجر اليومي: {fmt(item.dailyRate)} جنيه</div>
              <div style={{fontSize:12,color:"var(--text2)",marginTop:3}}>أيام: <b>{d}</b> · إجمالي: <b style={{color:"var(--green)"}}>{fmt(tot)}</b> · متبقي: <b style={{color:tot-paid>0?"var(--red)":"var(--green)"}}>{fmt(tot-paid)}</b></div>
            </div>
            <div style={{textAlign:"center"}}>
              <span className={`w-badge ${isActive?"wb-g":"wb-r"}`}>{isActive?"حاضر":"خرج"}</span>
              <div style={{display:"flex",gap:4,marginTop:6,justifyContent:"center"}}>
                {canEdit&&isActive&&<button className="ibt ibt-g" onClick={()=>checkout(item)}>✔️</button>}
                {canEdit&&<button className="ibt ibt-g" onClick={()=>{setF({...item});setEdit(item);setShowForm(true);}}>✏️</button>}
                {canDel&&<button className="ibt ibt-r" onClick={()=>del(item)}>🗑️</button>}
              </div>
            </div>
          </div>
        );
      })}
      {showForm&&(
        <div className="modal-ov" onClick={()=>setShowForm(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-title">{edit?"تعديل بيانات العامل":"+ إضافة عامل"}</div>
            <div className="frow2">
              <div><div className="flbl">الاسم</div><input className="finp" value={f.name||""} onChange={e=>s("name",e.target.value)}/></div>
              <div><div className="flbl">الهاتف</div><input className="finp" value={f.phone||""} onChange={e=>s("phone",e.target.value)}/></div>
            </div>
            <div className="frow2">
              <div><div className="flbl">تاريخ البداية</div><input className="finp" type="date" value={f.startDate||""} onChange={e=>s("startDate",e.target.value)}/></div>
              <div><div className="flbl">تاريخ الانتهاء</div><input className="finp" type="date" value={f.endDate||""} onChange={e=>s("endDate",e.target.value)}/></div>
            </div>
            <div className="frow2">
              <div><div className="flbl">الأجر اليومي</div><input className="finp" type="number" value={f.dailyRate||""} onChange={e=>s("dailyRate",e.target.value)}/></div>
              <div><div className="flbl">المدفوع</div><input className="finp" type="number" value={f.paid||""} onChange={e=>s("paid",e.target.value)}/></div>
            </div>
            {f.startDate&&f.dailyRate&&<div style={{background:"var(--green3)",borderRadius:8,padding:"8px 12px",fontSize:12,marginBottom:10}}>أيام: <b>{daysBetween(f.startDate,f.endDate||null)}</b> · إجمالي: <b style={{color:"var(--green)"}}>{fmt(daysBetween(f.startDate,f.endDate||null)*(Number(f.dailyRate)||0))}</b> جنيه</div>}
            <button className="save-btn" onClick={save}>حفظ</button>
          </div>
        </div>
      )}
      {showR&&<RestoreModal trash={trash} onRestore={restore} onClose={()=>setShowR(false)}/>}
    </div>
  );
}

// ─── REPORTS ─────────────────────────────────────────────
function RepPage({expenses,revenues,workers,inventory,auditLog,users}) {
  const [period,setPeriod]=useState("daily");
  const [selDate,setSelDate]=useState(todayStr());
  const [repTab,setRepTab]=useState("financial");
  const inPeriod=(dateStr)=>{
    if(!dateStr) return false;
    if(period==="daily") return dateStr===selDate;
    if(period==="monthly") return dateStr.startsWith(selDate.slice(0,7));
    if(period==="seasonal"){const m=new Date(selDate).getMonth();const ss=m<3||m===11?[11,0,1,2]:m<6?[3,4,5]:m<9?[6,7,8]:[9,10,11];return ss.includes(new Date(dateStr).getMonth());}
    return dateStr.startsWith(selDate.slice(0,4));
  };
  const filtered=(arr,dk)=>arr.filter(i=>inPeriod(i[dk]));
  const fExp=filtered(expenses,"date"),fRev=filtered(revenues,"date");
  const totRev=fRev.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const totExp=fExp.reduce((s,e)=>s+(Number(e.amount)||0),0);
  const fWorkers=workers.filter(w=>inPeriod(w.startDate));
  const wCost=fWorkers.reduce((s,w)=>s+daysBetween(w.startDate,w.endDate||null)*(Number(w.dailyRate)||0),0);
  const netProfit=totRev-totExp-wCost;
  const invValue=inventory.reduce((s,i)=>s+(Number(i.quantity)||0)*(Number(i.price)||0),0);
  const days5=[...Array(5)].map((_,i)=>{
    const d=new Date();d.setDate(d.getDate()-4+i);
    const ds=d.toISOString().split("T")[0];
    const r=revenues.filter(x=>x.date===ds).reduce((s,x)=>s+(Number(x.amount)||0),0);
    const e=expenses.filter(x=>x.date===ds).reduce((s,x)=>s+(Number(x.amount)||0),0);
    return {label:`${d.getDate()}/${d.getMonth()+1}`,r,e};
  });
  const maxV=Math.max(...days5.map(d=>Math.max(d.r,d.e)),1);
  const TABS=[{k:"daily",l:"يومي"},{k:"monthly",l:"شهري"},{k:"seasonal",l:"موسمي"},{k:"yearly",l:"سنة"}];
  const REP_TABS=[{k:"financial",l:"مالي"},{k:"workers",l:"العمالة"},{k:"inventory",l:"المخزن"},{k:"audit",l:"سجل التغييرات"}];
  const getUserName=id=>{const u=users.find(x=>x.id===id);return u?u.name:"مجهول";};
  return(
    <div>
      <div className="rep-tabs">{TABS.map(tb=><button key={tb.k} className={`rep-tab ${period===tb.k?"on":""}`} onClick={()=>setPeriod(tb.k)}>{tb.l}</button>)}</div>
      <div className="rep-date">{Nav.cal}<input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)}/></div>
      <div className="rep-tabs" style={{paddingTop:8}}>{REP_TABS.map(tb=><button key={tb.k} className={`rep-tab ${repTab===tb.k?"on":""}`} style={{fontSize:12}} onClick={()=>setRepTab(tb.k)}>{tb.l}</button>)}</div>
      {repTab==="financial"&&(
        <>
          <div className="section" style={{marginTop:12}}>
            <div className="section-title">ملخص التقرير المالي</div>
            <div className="summary-card">
              <div className="sum-row"><span className="sum-label">💰 إجمالي الإيرادات</span><span className="sum-value g">{fmt(totRev)} جنيه</span></div>
              <div className="sum-row"><span className="sum-label">🛒 إجمالي المصروفات</span><span className="sum-value r">{fmt(totExp)} جنيه</span></div>
              <div className="sum-row"><span className="sum-label">👷 تكلفة العمالة</span><span className="sum-value r">{fmt(wCost)} جنيه</span></div>
              <div className="sum-row" style={{background:"var(--green3)",borderRadius:8,padding:"8px 10px",margin:"4px 0"}}>
                <span className="sum-label" style={{fontWeight:700}}>📊 صافي الربح الحقيقي</span>
                <span className={`sum-value ${netProfit>=0?"g":"r"}`} style={{fontSize:15}}>{fmt(netProfit)} جنيه</span>
              </div>
            </div>
          </div>
          <div className="section">
            <div className="section-title">مخطط آخر 5 أيام</div>
            <div className="bar-chart"><div className="bar-wrap">
              {days5.map((d,i)=>{
                const rh=Math.max(4,(d.r/maxV)*100),eh=Math.max(4,(d.e/maxV)*100);
                return(<div key={i} className="bar-group"><div className="bar-pair"><div className="bar g" style={{height:rh}}/><div className="bar r" style={{height:eh}}/></div><div className="bar-label">{d.label}</div></div>);
              })}
            </div></div>
          </div>
          <div className="section"><div className="section-title">تفاصيل الإيرادات</div>
            {fRev.length===0&&<div className="no-data">لا توجد بيانات</div>}
            {fRev.map(item=>(<div key={item.id} className="list-item" style={{margin:"0 0 8px"}}><div className="li-icon" style={{background:"#e8f5ec"}}>{REV_ICONS[item.product]||"📦"}</div><div className="li-body"><div className="li-title">{item.product}</div><div className="li-sub">{item.date}</div></div><div className="li-right"><div className="li-amount" style={{color:"var(--green)"}}>+{fmt(item.amount)}</div><div className="li-date">جنيه</div></div></div>))}
          </div>
          <div className="section" style={{paddingBottom:14}}><div className="section-title">تفاصيل المصروفات</div>
            {fExp.length===0&&<div className="no-data">لا توجد بيانات</div>}
            {fExp.map(item=>(<div key={item.id} className="list-item" style={{margin:"0 0 8px"}}><div className="li-icon" style={{background:"#ffebee"}}>{EXPENSE_ICONS[item.category]||"📦"}</div><div className="li-body"><div className="li-title">{item.category}</div><div className="li-sub">{item.date}</div></div><div className="li-right"><div className="li-amount" style={{color:"var(--red)"}}>-{fmt(item.amount)}</div><div className="li-date">جنيه</div></div></div>))}
          </div>
        </>
      )}
      {repTab==="workers"&&(
        <div className="section" style={{marginTop:12}}>
          <div className="section-title">تقرير العمالة</div>
          <div className="summary-card">
            <div className="sum-row"><span className="sum-label">👷 عدد العمال</span><span className="sum-value b">{workers.length}</span></div>
            <div className="sum-row"><span className="sum-label">✅ الحاضرين</span><span className="sum-value g">{workers.filter(w=>!w.endDate).length}</span></div>
            <div className="sum-row"><span className="sum-label">💰 إجمالي تكلفة العمالة</span><span className="sum-value r">{fmt(workers.reduce((s,w)=>s+daysBetween(w.startDate,w.endDate||null)*(Number(w.dailyRate)||0),0))} جنيه</span></div>
            <div className="sum-row"><span className="sum-label">💳 إجمالي المدفوع</span><span className="sum-value g">{fmt(workers.reduce((s,w)=>s+(Number(w.paid)||0),0))} جنيه</span></div>
          </div>
          {workers.map(w=>{const d=daysBetween(w.startDate,w.endDate||null),tot=d*(Number(w.dailyRate)||0),paid=Number(w.paid)||0;return(<div key={w.id} className="list-item" style={{margin:"0 0 8px"}}><div className="li-icon" style={{background:"#e3f2fd"}}>👷</div><div className="li-body"><div className="li-title">{w.name}</div><div className="li-sub">{w.startDate} → {w.endDate||"حاضر"} · أيام: {d}</div></div><div className="li-right"><div className="li-amount">{fmt(tot)}</div><div className="li-date">متبقي: {fmt(tot-paid)}</div></div></div>);})}
        </div>
      )}
      {repTab==="inventory"&&(
        <div className="section" style={{marginTop:12}}>
          <div className="section-title">تقرير المخزن</div>
          <div className="summary-card">
            <div className="sum-row"><span className="sum-label">📦 عدد الأصناف</span><span className="sum-value b">{inventory.length}</span></div>
            <div className="sum-row"><span className="sum-label">💰 القيمة الإجمالية</span><span className="sum-value g">{fmt(invValue)} جنيه</span></div>
            <div className="sum-row"><span className="sum-label">⚠️ الكميات المنخفضة</span><span className="sum-value r">{inventory.filter(i=>Number(i.minStock)>0&&Number(i.quantity)<=Number(i.minStock)).length}</span></div>
          </div>
          {inventory.map(i=>{const low=Number(i.minStock)>0&&Number(i.quantity)<=Number(i.minStock);return(<div key={i.id} className="inv-item"><div className="inv-top"><div><div className="inv-name">{INV_ICONS[i.type]||"📦"} {i.name}</div><div className="inv-pkg">{i.type}</div></div><div className={`inv-row-v ${low?"warn":"ok"}`}>{fmt(i.quantity)} {i.unit}</div></div><div className="inv-rows"><div className="inv-row"><div className="inv-row-l">الحد الأدنى</div><div className="inv-row-v">{i.minStock?fmt(i.minStock):"—"}</div></div><div className="inv-row"><div className="inv-row-l">القيمة</div><div className="inv-row-v">{fmt(Number(i.quantity)*Number(i.price))} جنيه</div></div></div></div>);})}
        </div>
      )}
      {repTab==="audit"&&(
        <div className="section" style={{marginTop:12}}>
          <div className="section-title">سجل التغييرات</div>
          {auditLog.length===0&&<div className="no-data">لا توجد بيانات</div>}
          {auditLog.slice(0,50).map(a=>{
            const actionColor=a.action==="delete"?"var(--red)":a.action==="add"?"var(--green)":"var(--amber)";
            return(<div key={a.id} className="audit-item"><div className="audit-user">👤 {getUserName(a.userId)} · <span style={{color:actionColor}}>{a.action}</span></div><div className="audit-action">{a.entity}</div>{a.oldVal&&<div className="audit-change">قبل: {a.oldVal.slice(0,100)}</div>}{a.newVal&&<div className="audit-change">بعد: {a.newVal.slice(0,100)}</div>}<div className="audit-time">{a.time}</div></div>);
          })}
        </div>
      )}
    </div>
  );
}

// ─── USERS PAGE ──────────────────────────────────────────
function UsrPage({users,setUsers,currentUser,showToast,audit}) {
  const [showForm,setShowForm]=useState(false);
  const [edit,setEdit]=useState(null);
  const [f,setF]=useState({});
  const s=(k,v)=>setF(x=>{const nf={...x,[k]:v};if(k==="role"&&!nf.permissions){nf.permissions=emptyPerms();}return nf;});

  const myFarmId = currentUser.farmId || currentUser.id;

  const myUsers = users.filter(u =>
    u.id === currentUser.id ||
    u.farmId === myFarmId ||
    u.createdBy === currentUser.id
  );

  const togglePerm=(pk,field)=>{
    setF(x=>{
      const p={...(x.permissions||emptyPerms())};
      const arr=[...(p[field]||[])];
      p[field]=arr.includes(pk)?arr.filter(a=>a!==pk):[...arr,pk];
      if((field==="canEdit"||field==="canDelete")&&!arr.includes(pk)&&!(p.pages||[]).includes(pk)){
        p.pages=[...(p.pages||[]),pk];
      }
      return {...x,permissions:p};
    });
  };

  const save=async()=>{
    if(!f.name||!f.username){showToast("أدخل الاسم واسم المستخدم");return;}
    const dupe = myUsers.find(u=>u.username===f.username && u.id!==(edit?.id));
    if(dupe){showToast("اسم المستخدم مستخدم بالفعل");return;}
    const item={
      ...f,
      id:edit?edit.id:genUUID(),
      status:edit?edit.status:"active",
      createdBy:edit?edit.createdBy:currentUser.id,
      farmId: edit?.farmId || myFarmId,
      farmName: edit?.farmName || currentUser.farmName || "",
      role: (edit&&edit.id===currentUser.id) ? currentUser.role : "supervisor",
      permissions: (edit&&edit.id===currentUser.id) ? (edit.permissions||defPerms()) : (f.permissions||emptyPerms()),
    };
    try{
      const { error } = await supabase.from("users").upsert(item,{onConflict:"id"});
      if(error) throw new Error(error.message);
      if(edit){audit("edit","مستخدم",edit,item);setUsers(u=>u.map(x=>x.id===edit.id?item:x));}
      else{audit("add","مستخدم",null,item);setUsers(u=>[...u,item]);}
      setShowForm(false);setEdit(null);setF({});showToast("تم الحفظ ✓");
    }catch(e){
      showToast("فشل الحفظ: "+e.message);
    }
  };

  const del=id=>{const u=users.find(x=>x.id===id);if(u){audit("delete","مستخدم",u,null);setUsers(us=>us.filter(x=>x.id!==id));supabase.from("users").delete().eq("id",id).then(({error})=>{if(error)console.error(error.message);});showToast("تم الحذف");}};
  const toggleStatus=id=>{
    setUsers(u=>u.map(x=>x.id===id?{...x,status:x.status==="active"?"suspended":"active"}:x));
    const target=users.find(x=>x.id===id);
    if(target){const ns=target.status==="active"?"suspended":"active";supabase.from("users").update({status:ns}).eq("id",id).then(({error})=>{if(error)console.error(error.message);});}
    showToast("تم تغيير الحالة");
  };

  // ── جدول الصلاحيات: عناوين الأعمدة بالعربي ──
  const PERM_COL_HEADERS = [
    { field: "pages",     label: "عرض" },
    { field: "canEdit",   label: "تعديل" },
    { field: "canDelete", label: "حذف" },
  ];

  return(
    <div>
      <button className="add-btn-full" onClick={()=>{setF({role:"supervisor",permissions:emptyPerms()});setEdit(null);setShowForm(true);}}>+ إضافة مستخدم</button>
      <div className="section"><div className="section-title">المستخدمون</div></div>
      {myUsers.length===0&&<div className="no-data">لا توجد بيانات</div>}
      {myUsers.map(u=>{
        const isMe = u.id===currentUser.id;
        const isSuspended=u.status==="suspended";
        return(
          <div key={u.id} className="usr-item">
            <div className="w-avatar">👤</div>
            <div style={{flex:1}}>
              <div className="w-name">{u.name} <span style={{fontSize:11,color:"var(--text3)",fontWeight:400}}>({u.username})</span></div>
              <div className="w-daily">{u.role==="admin"?"مدير عام":u.role==="manager"?"مدير المزرعة":"مشرف"} · {u.phone||"—"}</div>
              <div style={{fontSize:11,color:isSuspended?"var(--red)":"var(--green)",marginTop:2}}>{isSuspended?"🚫 موقوف":"✅ نشط"}</div>
            </div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {!isMe&&<button className="ibt" style={{background:isSuspended?"var(--green3)":"#ffebee",color:isSuspended?"var(--green)":"var(--red)"}} onClick={()=>toggleStatus(u.id)}>{isSuspended?"✅":"🚫"}</button>}
              <button className="ibt ibt-g" onClick={()=>{setF({...u,password:""});setEdit(u);setShowForm(true);}}>✏️</button>
              {!isMe&&<button className="ibt ibt-r" onClick={()=>del(u.id)}>🗑️</button>}
            </div>
          </div>
        );
      })}

      {showForm&&(
        <div className="modal-ov" onClick={()=>setShowForm(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"/>
            <div className="modal-title">{edit?"تعديل مستخدم":"+ إضافة مستخدم"}</div>
            <div className="frow2">
              <div><div className="flbl">الاسم</div><input className="finp" value={f.name||""} onChange={e=>s("name",e.target.value)}/></div>
              <div><div className="flbl">الهاتف</div><input className="finp" value={f.phone||""} onChange={e=>s("phone",e.target.value)}/></div>
            </div>
            <div className="frow2">
              <div><div className="flbl">اسم المستخدم</div><input className="finp" value={f.username||""} onChange={e=>s("username",e.target.value)}/></div>
              <div><div className="flbl">كلمة المرور</div><input className="finp" type="password" value={f.password||""} onChange={e=>s("password",e.target.value)}/></div>
            </div>

            {!(edit&&edit.id===currentUser.id)&&(
              <>
                <div className="frow">
                  <div className="flbl">الدور</div>
                  <input className="finp ro" readOnly value="مشرف (تابع للمزرعة)"/>
                </div>

                {/* ── جدول الصلاحيات بالعربي ── */}
                <div style={{marginTop:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--text2)",marginBottom:6}}>الصلاحيات</div>
                  <div className="perm-grid">
                    {/* رأس الجدول */}
                    <div style={{fontSize:11,color:"var(--text3)",fontWeight:700}}>الصفحة</div>
                    {PERM_COL_HEADERS.map(col=>(
                      <div key={col.field} style={{fontSize:11,color:"var(--text3)",textAlign:"center",fontWeight:700}}>{col.label}</div>
                    ))}

                    {/* صفوف الصفحات */}
                    {PAGE_KEYS.map(pk=>{
                      const p = f.permissions || emptyPerms();
                      return(
                        <React.Fragment key={pk}>
                          {/* اسم الصفحة بالعربي */}
                          <div style={{fontSize:12,color:"var(--text)",padding:"2px 0"}}>{PAGE_LABELS[pk]}</div>

                          {PERM_COL_HEADERS.map(col=>{
                            const active = (p[col.field]||[]).includes(pk);
                            return(
                              <button
                                key={col.field}
                                className="ptoggle"
                                style={{
                                  background: active ? "var(--green3)" : "var(--bg)",
                                  color:      active ? "var(--green)"  : "var(--text3)",
                                }}
                                onClick={()=>togglePerm(pk, col.field)}
                              >
                                {active ? "✓" : "✗"}
                              </button>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div style={{height:10}}/>
            <button className="save-btn" onClick={save}>حفظ</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RESTORE MODAL ───────────────────────────────────────
function RestoreModal({trash,onRestore,onClose}) {
  return(
    <div className="modal-ov" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-handle"/>
        <div className="modal-title">🗑 استرجاع المحذوفات</div>
        {trash.length===0&&<div className="no-data">لا يوجد محذوفات</div>}
        {trash.map((item,i)=>{
          const name=item.name||item.category||item.product||"عنصر";
          const delDate=item._d?new Date(item._d).toLocaleString("ar-EG"):"—";
          return(
            <div key={item._d||i} className="restore-row">
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700}}>{name}</div><div style={{fontSize:11,color:"var(--text3)"}}>تاريخ الحذف: {delDate}</div></div>
              <button className="ibt ibt-g" onClick={()=>onRestore(item)}>↩️</button>
            </div>
          );
        })}
        <button style={{width:"100%",marginTop:10,padding:11,background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:14,cursor:"pointer",color:"var(--text2)"}} onClick={onClose}>إغلاق</button>
      </div>
    </div>
  );
}
