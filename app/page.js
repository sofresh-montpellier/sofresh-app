"use client";
import {useState} from "react";
import Link from "next/link";
import {isSupabaseConfigured,supabase} from "../lib/supabase";
const products=[
{id:1,cat:"Salades",emoji:"🥗",name:"Salade César",desc:"Poulet, parmesan, croûtons et sauce César.",price:11.90},
{id:2,cat:"Burgers",emoji:"🍔",name:"Fresh Burger",desc:"Steak, cheddar, salade, tomate et sauce maison.",price:12.90},
{id:3,cat:"Wraps",emoji:"🌯",name:"Wrap Poulet",desc:"Poulet grillé, crudités et sauce légère.",price:9.90},
{id:4,cat:"Pâtes",emoji:"🍝",name:"Pâtes Carbonara",desc:"Crème, lardons, parmesan et poivre.",price:10.90},
{id:5,cat:"Soupes",emoji:"🍲",name:"Soupe du moment",desc:"Recette maison selon les produits de saison.",price:6.50},
{id:6,cat:"Boissons",emoji:"🥤",name:"Smoothie Fraise",desc:"Fraises, banane et jus de pomme.",price:4.90},
{id:7,cat:"Boissons",emoji:"☕",name:"Café",desc:"Espresso fraîchement préparé.",price:1.80},
{id:8,cat:"Desserts",emoji:"🍰",name:"Dessert du jour",desc:"Une douceur maison pour finir le repas.",price:4.50}
];
const euro=n=>n.toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
export default function Home(){
const[category,setCategory]=useState("Tout"),[cart,setCart]=useState({}),[open,setOpen]=useState(false);
const[name,setName]=useState(""),[phone,setPhone]=useState(""),[pickup,setPickup]=useState("12 h 00"),[message,setMessage]=useState(""),[loading,setLoading]=useState(false);
const categories=["Tout",...new Set(products.map(p=>p.cat))],visible=category==="Tout"?products:products.filter(p=>p.cat===category);
const count=Object.values(cart).reduce((a,b)=>a+b,0);
const total=Object.entries(cart).reduce((s,[id,q])=>s+products.find(p=>p.id===Number(id)).price*q,0);
const add=id=>setCart(c=>({...c,[id]:(c[id]||0)+1}));
const change=(id,d)=>setCart(c=>{const n={...c,[id]:(c[id]||0)+d};if(n[id]<=0)delete n[id];return n});
async function submit(){
setMessage("");if(!count)return setMessage("Ajoutez au moins un produit.");if(!name.trim()||!phone.trim())return setMessage("Indiquez votre nom et votre téléphone.");if(!isSupabaseConfigured)return setMessage("Supabase n'est pas encore configuré dans Vercel.");
const items=Object.entries(cart).map(([id,qty])=>{const p=products.find(x=>x.id===Number(id));return{id:p.id,name:p.name,unit_price:p.price,qty}});
setLoading(true);const{data,error}=await supabase.from("orders").insert({customer_name:name.trim(),customer_phone:phone.trim(),pickup_time:pickup,items,total,status:"Nouvelle"}).select().single();setLoading(false);
if(error){console.error(error);return setMessage("La commande n'a pas pu être transmise.");}
setMessage(`Commande ${String(data.id).slice(0,8).toUpperCase()} transmise au restaurant.`);setCart({});
}
return <><header className="topbar"><div className="brand">SO <span>FRESH</span></div><button className="cart-button" onClick={()=>setOpen(true)}>Panier · {count}</button></header>
<section className="hero"><div className="hero-inner"><div className="eyebrow">CLICK & COLLECT</div><h1>Frais, rapide,<br/>prêt pour midi.</h1><p>Commandez votre repas So Fresh et choisissez votre heure de retrait.</p></div></section>
<main className="container"><div className="categories">{categories.map(c=><button key={c} className={`chip ${c===category?"active":""}`} onClick={()=>setCategory(c)}>{c}</button>)}</div><section className="grid">{visible.map(p=><article className="card" key={p.id}><div className="photo">{p.emoji}</div><div className="card-body"><h3>{p.name}</h3><p className="desc">{p.desc}</p><div className="row"><span className="price">{euro(p.price)}</span><button className="primary" onClick={()=>add(p.id)}>Ajouter</button></div></div></article>)}</section></main>
<div className={`overlay ${open?"open":""}`} onClick={()=>setOpen(false)}/><aside className={`panel ${open?"open":""}`}><div className="panel-head"><h2>Votre commande</h2><button className="close" onClick={()=>setOpen(false)}>×</button></div>
{!count&&<div className="empty">Votre panier est vide.</div>}{Object.entries(cart).map(([id,q])=>{const p=products.find(x=>x.id===Number(id));return <div className="cart-item" key={id}><div><strong>{p.name}</strong><br/>{euro(p.price*q)}</div><div className="qty"><button onClick={()=>change(p.id,-1)}>−</button><span>{q}</span><button onClick={()=>change(p.id,1)}>+</button></div></div>})}
<label>Heure de retrait</label><select value={pickup} onChange={e=>setPickup(e.target.value)}>{["11 h 45","12 h 00","12 h 15","12 h 30","12 h 45","13 h 00","13 h 15","13 h 30"].map(t=><option key={t}>{t}</option>)}</select>
<label>Nom</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Votre nom"/><label>Téléphone</label><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="06 00 00 00 00"/>
<div className="total"><span>Total</span><span>{euro(total)}</span></div><button className="primary" style={{width:"100%"}} disabled={loading} onClick={submit}>{loading?"Envoi en cours…":"Valider la commande"}</button>{message&&<div className="message">{message}</div>}</aside>
<div className="admin-link"><Link href="/admin">Accéder à l'espace administrateur</Link></div></>
}
