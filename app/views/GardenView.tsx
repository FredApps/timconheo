import { BookOpenText, Leaf } from "lucide-react";
import { T } from "../i18n";
import { PigMark } from "../components/ui";
export default function GardenView({ knownCount, completed }: { knownCount: number; completed: number }) {
  return <main className="page garden-page"><section className="feature-heading"><div><p className="eyebrow"><T k="nav.garden" /></p><h1><T k="nav.garden" /></h1><p><T k="about.noPressureBody" /></p></div><div className="garden-total"><strong>{knownCount}</strong><span><T k="home.known" /></span></div></section><section className="garden-scene paper-card" aria-label="Your language garden"><div className="garden-sun" /><div className="garden-hills" /><div className="garden-plants">{Array.from({ length: Math.min(knownCount, 24) }, (_, index) => <span key={index} className={"plant plant-" + (index % 4 + 1)}><i /><b /></span>)}</div><div className="garden-pig"><PigMark /><span className="pig-body" /></div><div className="garden-ground" /></section><div className="garden-notes"><article><Leaf size={20} /><div><strong><T k="home.known" /></strong><p><T k="about.noPressureBody" /></p></div></article><article><BookOpenText size={20} /><div><strong>{completed}</strong><p><T k="home.sessions" /></p></div></article></div></main>;
}

