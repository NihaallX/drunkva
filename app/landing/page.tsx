import StoryScroll from "@/components/landing/StoryScroll";
import SocialProof from "@/components/landing/SocialProof";
import Waitlist from "@/components/landing/Waitlist";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main
      className="w-full"
      style={{ background: "#0a0a0a", color: "#fff" }}
    >
      <StoryScroll />
      <SocialProof />
      <Waitlist />
      <Footer />
    </main>
  );
}
