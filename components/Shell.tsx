import Link from "next/link";
import { BookOpen, Shield, Gavel, GraduationCap, History, Home, AlertTriangle, Settings } from "lucide-react";

export default function Shell({children, active="home"}:{children:React.ReactNode;active?:string}) {
  const links = [
    {href:"/",label:"Главная",id:"home",Icon:Home},
    {href:"/rules",label:"Правила сервера",id:"rules",Icon:BookOpen},
    {href:"/cases",label:"База нарушений",id:"cases",Icon:AlertTriangle},
    {href:"/punishments",label:"Наказания",id:"punishments",Icon:Gavel},
    {href:"/training",label:"Обучение",id:"training",Icon:GraduationCap},
    {href:"/history",label:"История изменений",id:"history",Icon:History},
  ];
  return <div className="shell"><aside className="sidebar">
    <Link href="/" className="brand"><span className="brandmark">IH</span><span>ILLEGAL<span style={{color:"#9b91ff"}}>HUB</span></span></Link>
    <div><p className="navlabel">База знаний</p><nav className="nav">{links.map(({href,label,id,Icon})=><Link className={active===id?"active":""} href={href} key={id}><Icon size={16} style={{verticalAlign:"-3px",marginRight:10}}/>{label}</Link>)}</nav></div>
    <div className="sidefoot">IllegalHub · Moderation Wiki<br/>Единый стандарт модерации</div>
  </aside><main className="main"><header className="topbar"><span className="crumb">IllegalHub / {links.find(x=>x.id===active)?.label || "Администрирование"}</span><Link href="/login" className="crumb">Вход для команды →</Link></header>{children}</main></div>;
}