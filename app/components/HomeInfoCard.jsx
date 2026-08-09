import Image from "next/image";
import {
  Mail,
  Navigation,
  Phone,
} from "lucide-react";

export default function HomeInfoCard() {
  return (
    <section className="home-info-card home-info-card-with-image">
      <div className="home-info-photo">
        <Image
          src="/facade-sofresh.jpg"
          alt="Façade du restaurant So Fresh Salade"
          fill
          sizes="(max-width: 640px) 42vw, 320px"
          className="home-info-photo-image"
        />
      </div>

      <div className="home-info-details">
        <div className="home-info-title">
          <strong>SO FRESH SALADE</strong>
          <span>Montpellier</span>
        </div>

        <div className="home-info-actions">
          <a
            href="tel:0467859954"
            className="home-info-action"
          >
            <Phone size={23} aria-hidden="true" />
            <span>Appeler</span>
          </a>

          <a
            href="mailto:sofreshsalade@gmail.com"
            className="home-info-action"
          >
            <Mail size={23} aria-hidden="true" />
            <span>E-mail</span>
          </a>

          <a
            href="https://maps.app.goo.gl/k4rE6SrKLRGEtd3C7"
            target="_blank"
            rel="noreferrer"
            className="home-info-action home-info-route"
          >
            <Navigation size={23} aria-hidden="true" />
            <span>J’y vais</span>
          </a>
        </div>
      </div>
    </section>
  );
}