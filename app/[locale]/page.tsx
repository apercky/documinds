"use client";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";

import { Hero } from "@/components/layout/hero";

export default function Home() {
  return (
    <>
      <Header />
      <HeroGeometric>
        <Hero />
      </HeroGeometric>
      <Footer />
    </>
  );
}
