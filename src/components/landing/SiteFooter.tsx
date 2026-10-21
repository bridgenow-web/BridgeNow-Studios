import Image from "next/image";
import Link from "next/link";

import { LazyObject3D } from "@/components/three/LazyObject3D";
import { contactConfig } from "@/config/contact";

export function SiteFooter() {
  const { social, whatsapp, email } = contactConfig;
  const waUrl = `https://wa.me/${whatsapp.number.replace(/\D/g, "")}`;

  return (
    <footer className="relative overflow-hidden bg-sky-deep px-6 pb-0 pt-16">
      {/* Objects drifting behind the contact block */}
      <LazyObject3D
        scene="pin"
        spin={0.26}
        className="pointer-events-none absolute -left-16 top-[6%] hidden h-64 w-64 opacity-70 lg:block"
      />
      <LazyObject3D
        scene="heart"
        spin={0.35}
        className="pointer-events-none absolute right-[4%] top-[38%] hidden h-40 w-40 opacity-75 lg:block"
      />
      <LazyObject3D
        scene="orb"
        spin={0.2}
        className="pointer-events-none absolute -right-12 bottom-[22%] hidden h-56 w-56 opacity-55 xl:block"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="block-card reveal relative bg-lime-wash px-8 py-11 text-center sm:px-12">
          <LazyObject3D
            scene="trophy"
            spin={0.3}
            className="pointer-events-none absolute right-6 -top-8 hidden h-32 w-32 lg:block"
          />
          <h2 className="display text-huge text-sky-deep">LET&apos;S BUILD SOMETHING BIGGER TOGETHER</h2>
          <p className="mx-auto mt-5 max-w-prose text-[15px] leading-relaxed text-sky-deep/80">
            Join thousands of creators, brands and organisers already growing with BridgeNow.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link href="/auth?role=creator" className="btn bg-sky-deep text-white hover:-translate-y-0.5">
              Get Started Now
            </Link>
            <a href={waUrl} target="_blank" rel="noreferrer" className="btn bg-white text-sky-deep hover:-translate-y-0.5">
              WhatsApp us
            </a>
          </div>
        </div>

        <div className="mt-12 grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src="/logo.png"
              alt="BridgeNow"
              width={819}
              height={291}
              className="h-7 w-auto"
            />
            <p className="mt-3 text-xs leading-relaxed text-white/60">{contactConfig.tagline}</p>
          </div>

          <Col title="Creators">
            <L href="/auth?role=creator">Join as a creator</L>
            <L href="/#pricing">Creator plans</L>
            <L href={`mailto:${email.creator}`}>{email.creator}</L>
          </Col>

          <Col title="Brands">
            <L href="/auth?role=brand">Join as a brand</L>
            <L href="/#pricing">Brand plans</L>
            <L href={`mailto:${email.general}`}>{email.general}</L>
          </Col>

          <Col title="Connect">
            <L href={social.instagram.url}>Instagram {social.instagram.handle}</L>
            {social.linkedin && <L href={social.linkedin.url}>{social.linkedin.label}</L>}
            <L href={waUrl}>{whatsapp.display}</L>
          </Col>
        </div>

        <p className="mt-14 border-t border-white/15 pb-10 pt-6 text-center text-[11px] text-white/50">
          © {new Date().getFullYear()} BridgeNow. All rights reserved.
        </p>
      </div>

    </footer>
  );
}

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="display text-[12px] tracking-[0.22em] text-lime">{title}</p>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function L({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="break-words text-sm text-white/75 transition-colors hover:text-lime"
      >
        {children}
      </a>
    </li>
  );
}
