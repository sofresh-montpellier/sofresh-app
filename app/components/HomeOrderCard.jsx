import Image from "next/image";
import Link from "next/link";

export default function HomeOrderCard() {
  return (
    <Link
      href="/commander"
      className="home-order-image-card"
    >
      <Image
        src="/commander-sofresh.jpg"
        alt="Commander chez So Fresh Salade"
        fill
        sizes="(max-width: 640px) 100vw, 700px"
        className="home-order-image"
      />

      <div className="home-order-image-overlay" />

      <div className="home-order-image-label">
        <strong>COMMANDER</strong>
        <span>Cliquez ici pour commander</span>
      </div>
    </Link>
  );
}
