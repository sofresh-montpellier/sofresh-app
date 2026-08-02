"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const euro = (n) => Number(n).toLocaleString("fr-FR",{style:"currency",currency:"EUR"});

function parisNow(){
  const parts=new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hour12:false}).formatToParts(new Date());
  const get=t=>Number(parts.find(p=>p.type===t)?.value||0);
  return {year:get("year"),month:get("month"),day:get("day"),hour:get("hour")};
}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function weekday(d){return d.getDay()>=1&&d.getDay()<=5}
function pickupDates(){
  const n=parisNow(),today=new Date(n.year,n.month-1,n.day,12),dates=[];
  let cursor=new Date(today);
  while(dates.length<4){
    const same=iso(cursor)===iso(today);
    if(weekday(cursor)&&(!same||n.hour<11)) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate()+1);
  }
  return dates;
}
function label(date,index){
  const full=new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long"}).format(date);
  const n=parisNow(),today=new Date(n.year,n.month-1,n.day,12),tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
  if(iso(date)===iso(today)) return `Aujourd'hui • ${full}`;
  if(iso(date)===iso(tomorrow)) return `Demain • ${full}`;
  return full;
}

export default function Home(){
  const [products,setProducts]=useState([]),[category,setCategory]=useState("Tout"),[cart,setCart]=useState({});
  const [open,setOpen]=useState(false),[name,setName]=useState(""),[phone,setPhone]=useState("");
  const [pickupDate,setPickupDate]=useState(""),[pickupTime,setPickupTime]=useState("11 h 30");
  const [message,setMessage]=useState(""),[loading,setLoading]=useState(false);
  const dates=useMemo(()=>pickupDates(),[]);

  useEffect(()=>{
    if(dates.length&&!pickupDate) setPickupDate(iso(dates[0]));
    setName(localStorage.getItem("sofresh_customer_name")||"");
    setPhone(localStorage.getItem("sofresh_customer_phone")||"");
  },[dates,pickupDate]);

  useEffect(()=>{(async()=>{
    if(!isSupabaseConfigured) return setMessage("Supabase n'est pas configuré.");
    const {data,error}=await supabase.from("products").select("*").eq("available",true).order("display_order");
    if(error) setMessage("Le menu n'a pas pu être chargé."); else setProducts(data||[]);
  })()},[]);

  const categories=["Tout",...new Set(products.map(p=>p.category))];
  const visible=category==="Tout"?products:products.filter(p=>p.category===category);
  const count=Object.values(cart).reduce((a,b)=>a+b,0);
  const total=Object.entries(cart).reduce((s,[id,q])=>{const p=products.find(x=>x.id===Number(id));return p?s+Number(p.price)*q:s},0);

  const add=id=>setCart(c=>({...c,[id]:(c[id]||0)+1}));
  const change=(id,d)=>setCart(c=>{const n={...c,[id]:(c[id]||0)+d};if(n[id]<=0)delete n[id];return n});

  async function submit(){
    setMessage("");
    if(!count) return setMessage("Ajoutez au moins un produit.");
    if(!pickupDate) return setMessage("Choisissez une date de retrait.");
    if(!name.trim()||!phone.trim()) return setMessage("Indiquez votre nom et votre téléphone.");
    localStorage.setItem("sofresh_customer_name",name.trim());
    localStorage.setItem("sofresh_customer_phone",phone.trim());
    const items=Object.entries(cart).map(([id,qty])=>{const p=products.find(x=>x.id===Number(id));return{id:p.id,name:p.name,unit_price:Number(p.price),qty}});
    setLoading(true);
    const {data,error}=await supabase.from("orders").insert({
      customer_name:name.trim(),customer_phone:phone.trim(),pickup_date:pickupDate,pickup_time:pickupTime,items,total,status:"Nouvelle"
    }).select().single();
    setLoading(false);
    if(error) return setMessage("La commande n'a pas pu être transmise.");
    setMessage(`Commande ${String(data.id).slice(0,8).toUpperCase()} enregistrée.`);
    setCart({});
  }

  return <>
    <header className="topbar"><div className="brand">SO <span>FRESH</span></div><button className="cart-button" onClick={()=>setOpen(true)}>Panier · {count}</button></header>
    <section className="hero"><div className="hero-inner"><div className="eyebrow">CLICK & COLLECT</div><h1>Frais, rapide,<br/>prêt pour midi.</h1><p>Commande du jour jusqu'à 11 h • Du lundi au vendredi</p></div></section>
    <main className="container">
      <div className="categories">{categories.map(c=><button key={c} className={`chip ${c===category?"active":""}`} onClick={()=>setCategory(c)}>{c}</button>)}</div>
      <section className="grid">{visible.map(p=><article className="card" key={p.id}>
        {p.image_url?<img className="photo" src={p.image_url} alt={p.name} style={{width:"100%",objectFit:"cover"}}/>:<div className="photo">{p.emoji||"🥗"}</div>}
        <div className="card-body"><h3>{p.name}</h3><p className="desc">{p.description}</p><div className="row"><span className="price">{euro(p.price)}</span><button className="primary" onClick={()=>add(p.id)}>Ajouter</button></div></div>
      </article>)}</section>
    </main>
    <div className={`overlay ${open?"open":""}`} onClick={()=>setOpen(false)}/>
    <aside className={`panel ${open?"open":""}`}>
      <div className="panel-head"><h2>Votre commande</h2><button className="close" onClick={()=>setOpen(false)}>×</button></div>
      {!count&&<div className="empty">Votre panier est vide.</div>}
      {Object.entries(cart).map(([id,q])=>{const p=products.find(x=>x.id===Number(id));if(!p)return null;return <div className="cart-item" key={id}><div><strong>{p.name}</strong><br/>{euro(Number(p.price)*q)}</div><div className="qty"><button onClick={()=>change(p.id,-1)}>−</button><span>{q}</span><button onClick={()=>change(p.id,1)}>+</button></div></div>})}
      <label>Quand souhaitez-vous récupérer votre commande ?</label>
      <div className="pickup-date-list">{dates.map((d,i)=>{const v=iso(d);return <button type="button" key={v} className={`pickup-date-button ${pickupDate===v?"selected":""}`} onClick={()=>setPickupDate(v)}>{label(d,i)}</button>})}</div>
      <label>Heure de retrait</label>
      <div className="pickup-time-grid">{["11 h 30","11 h 45","12 h 00","12 h 15","12 h 30","12 h 45","13 h 00","13 h 15","13 h 30"].map(t=><button type="button" key={t} className={`pickup-time-button ${pickupTime===t?"selected":""}`} onClick={()=>setPickupTime(t)}>{t}</button>)}</div>
      <label>Nom</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Votre nom"/>
      <label>Téléphone</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="06 00 00 00 00"/>
      <div className="total"><span>Total</span><span>{euro(total)}</span></div>
      <button className="primary" style={{width:"100%"}} disabled={loading} onClick={submit}>{loading?"Envoi en cours…":"Valider la commande"}</button>
      {message&&<div className="message">{message}</div>}
    </aside>
    <div className="admin-link"><Link href="/login">Administration</Link></div>
  </>;
}
