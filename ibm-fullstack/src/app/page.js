"use client";

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion";
import { useRef, memo } from "react";
import {
  Mic,
  FileText,
  ClipboardCheck,
  CalendarCheck,
  BarChart,
  Bell,
  MessageSquare,
  Users,
  Bot,
} from "lucide-react";

/* ----------------------------- Variants ---------------------------------- */
const sectionVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, delay: i * 0.15, ease: "easeOut" },
  }),
};

/* --------------------------- Feature Card ----------------------------- */
function FeatureCard({ icon: Icon, title, desc, img, idx }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      custom={idx}
      whileHover={
        prefersReducedMotion
          ? {}
          : { scale: 1.04, y: -4, boxShadow: "0 15px 40px rgba(236,72,153,0.25)" }
      }
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#1a1622] p-6 shadow-lg transition-all"
      aria-label={title}
    >
      {/* Pulsing gradient edge on hover */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={prefersReducedMotion ? {} : { opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, rgba(236,72,153,0.35), rgba(168,85,247,0.35), rgba(59,130,246,0.35), rgba(236,72,153,0.35))",
          mask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          padding: 2,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Bigger small image above main icon */}
        {img && (
          <div className="mb-4 h-20 w-20 relative">
            <Image
              src={img}
              alt={`${title} icon`}
              fill
              className="object-contain"
            />
          </div>
        )}

        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-orange-400 to-pink-500 shadow-md">
          <Icon className="h-7 w-7 text-white" aria-hidden />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-gray-400">{desc}</p>
      </div>

      {/* Soft glow behind content */}
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 0.35, scale: 1.1 }}
          transition={{ duration: 0.35 }}
          className="pointer-events-none absolute -inset-10 blur-2xl"
          style={{
            background:
              "radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(236,72,153,0.12), transparent 40%)",
          }}
        />
      )}
    </motion.div>
  );
}

/* --------------------------- Story Section ----------------------------- */
const StorySection = memo(function StorySection({ story, idx, scrollYProgress }) {
  const y = useTransform(scrollYProgress, [0, 1], [`${idx * 5}%`, `${idx * 5 + 5}%`]);

  return (
    <section
      className="relative flex h-screen items-center justify-center overflow-hidden"
      aria-labelledby={`story-${idx}`}
    >
      <motion.div
        className="absolute inset-0"
        style={{ y, opacity: 0.12, background: "#0f0d14" }}
      />

      <motion.div
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        className="z-10 mx-auto max-w-5xl px-6"
      >
        <h2
          id={`story-${idx}`}
          className={`mb-6 text-center text-5xl font-bold ${story.color}`}
        >
          {story.title}
        </h2>
        <p className="mx-auto mb-10 max-w-3xl text-center text-lg text-gray-300">
          {story.text}
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {story.cards.map((c, i) => (
            <FeatureCard
              key={`${c.title}-${i}`}
              icon={c.icon}
              title={c.title}
              desc={c.desc}
              img={c.img}
              idx={i}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
});

/* ----------------------------- Home Page ------------------------------ */
export default function Home() {
  const heroRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Hero effects
  const logoScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.6]);
  const titleScale = useTransform(scrollYProgress, [0, 0.7], [1, 2.5]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 1]);
  const logoY = useTransform(scrollYProgress, [0, 0.5], ["0%", "-10%"]);
  const titleY = useTransform(scrollYProgress, [0, 0.5], ["0%", "-15%"]);

  // Background gradient
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.7, 0]);
  const bgBlur = useTransform(scrollYProgress, [0, 1], [0, 12]);
  const blurStyle = useMotionTemplate`blur(${bgBlur}px)`;
  const gradientStyle = useMotionTemplate`linear-gradient(to right, #0a0a0f, #1b0b2c, #3a0c50)`;

  // Stories content
  const stories = [
    {
      title: "AI Meeting Genius",
      text: "Transcribes meetings in real time, summarizes discussions, and assigns tasks automatically — powered by IBM Watsonx.",
      color: "text-orange-400",
      cards: [
        { title: "Live Transcription", desc: "Accurate real-time speech-to-text with multi-language support. Never miss a word during meetings. Includes visual cues for speakers and highlights key points.", icon: Mic   },
        { title: "Smart Summaries", desc: "Generate concise summaries instantly. Share with your team to save hours of reading. Summaries include action points and important decisions.", icon: FileText   },
        { title: "Auto Task Assign", desc: "Automatically detects action items and assigns them to the right team members, improving productivity. Notifications keep tasks on track.", icon: ClipboardCheck  },
      ],
    },
    {
      title: "Smart Goal Tracker",
      text: "Tracks progress, sends daily check-ins, and ensures nothing slips through the cracks.",
      color: "text-pink-400",
      cards: [
        { title: "Daily Check-ins", desc: "Quickly log updates and keep your team aligned with daily progress tracking. Provides visual streaks and reminders for consistency.", icon: CalendarCheck },
        { title: "Progress Dashboard", desc: "Visualize milestones, deadlines, and achievements with interactive dashboards. Graphs and charts make insights easy to grasp.", icon: BarChart },
        { title: "Smart Reminders", desc: "Receive AI-driven nudges so important goals never get forgotten. Customizable alerts ensure you stay on track without overload.", icon: Bell },
      ],
    },
    {
      title: "Unified Team Hub",
      text: "Secure chat, team creation, and personality-aware AI assistant — all in one platform.",
      color: "text-purple-400",
      cards: [
        { title: "Secure Chat", desc: "End-to-end encrypted messaging ensures your team conversations are private. Share files securely with ease.", icon: MessageSquare },
        { title: "Team Creation", desc: "Easily organize members, roles, and projects in one unified workspace. Assign tasks, track progress, and manage teams effortlessly.", icon: Users },
        { title: "AI Assistant", desc: "Adapts to team personalities, provides suggestions, and improves collaboration. Learns from interactions to optimize workflow.", icon: Bot },
      ],
    },
  ];

  return (
    <main className="overflow-x-hidden bg-[#0f0d14] text-white">
      {/* HERO */}
      <section ref={heroRef} className="relative flex h-screen items-center justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ y: bgY, opacity: bgOpacity, filter: blurStyle, background: gradientStyle }}
        />

        <div className="z-10 flex flex-col items-center">
          <motion.div style={{ scale: logoScale, y: logoY }}>
            <Image 
              src="/novexa2.png" 
              alt="Novexa Logo" 
              width={120} 
              height={120} 
              priority 
              style={{ width: 'auto', height: 'auto' }}
            />
          </motion.div>

          <motion.h1
            style={{ scale: titleScale, y: titleY, opacity: titleOpacity }}
            className="mt-4 bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-center text-6xl sm:text-7xl md:text-8xl font-extrabold text-transparent"
          >
            Novexa
          </motion.h1>
        </div>
      </section>

      {/* STORIES */}
      {stories.map((story, idx) => (
        <StorySection key={story.title} story={story} idx={idx} scrollYProgress={scrollYProgress} />
      ))}

      {/* CTA */}
      <section className="relative py-24 overflow-hidden" aria-label="Call to action">
        {/* Merge transition layer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, #0f0d14 0%, #3a0c50 60%, #0b1220 100%)" }}
        />
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-70"
          style={{ background: "linear-gradient(135deg, #3a0c50 0%, #0b1220 50%, #1f0a2f 100%)", backgroundSize: "200% 200%" }}
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-400 to-indigo-500 bg-clip-text text-transparent"
          >
            Ready to Transform Your Ideas?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mt-6 text-lg text-gray-300"
          >
            Join us today and bring your vision to life with powerful tools and seamless experiences.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-8 text-xl font-medium text-white"
          >
            Get Started
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.a
              href="/signup"
              whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(168,85,247,0.6)" }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-full text-lg font-semibold
                        bg-gradient-to-r from-purple-500 to-indigo-500
                        text-white shadow-lg transition-all duration-300
                        hover:from-purple-600 hover:to-indigo-600"
            >
              Sign Up
            </motion.a>

            <motion.a
              href="/login"
              whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(236,72,153,0.6)" }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-full text-lg font-semibold
                        bg-gradient-to-r from-pink-500 to-purple-500
                        text-white shadow-lg transition-all duration-300
                        hover:from-pink-600 hover:to-purple-600"
            >
              Login
            </motion.a>
          </motion.div>
        </div>
      </section>
    </main>
  );
}