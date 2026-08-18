'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';

const BHAKTI_TIMELINE = [
  {
    century: '13th Century',
    saint: 'संत ज्ञानेश्वर',
    saintEn: 'Saint Dnyaneshwar',
    desc: 'Opens sacred knowledge in Marathi through the Dnyaneshwari — a commentary on the Bhagavad Gita that made divine wisdom accessible to all.',
    tag: 'Dnyaneshwari',
    image: '/images/saints/dnyaneshwar.jpg',
  },
  {
    century: '14th Century',
    saint: 'संत नामदेव',
    saintEn: 'Saint Namdev',
    desc: 'Carries kirtan across regions, transforming personal devotion into a collective spiritual movement that crosses caste and class boundaries.',
    tag: 'Abhang & Kirtan',
    image: '/images/registry/s18.jpg',
  },
  {
    century: '16th Century',
    saint: 'संत एकनाथ',
    saintEn: 'Saint Eknath',
    desc: 'Deepens public teaching through verse, bridging the gap between scholarly theology and the everyday language of the people.',
    tag: 'Bhakti Poetry',
    image: '/images/realistic/ancient-manuscript.jpg',
  },
  {
    century: '17th Century',
    saint: 'संत तुकाराम',
    saintEn: 'Saint Tukaram',
    desc: 'Gives the Wari its immortal voice. His abhangs become the living prayers sung by millions on the pilgrimage to Pandharpur.',
    tag: 'Tukaram Gatha',
    image: '/images/saints/tukaram-birthplace.jpg',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6 } }
};

export function ChapterBhakti() {
  return (
    <section
      className="relative min-h-[100svh] py-24 md:py-32 px-6 flex items-center bg-[#050402] overflow-hidden"
      aria-labelledby="bhakti-title"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#ff7a1a]/5 via-[#050402] to-[#050402] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 md:mb-24"
        >
          <div className="inline-flex items-center gap-2 text-[#f6bc55] text-xs font-bold tracking-[0.2em] uppercase mb-4">
            <span className="w-8 h-px bg-[#f6bc55]/50" />
            Chapter 2 — Birth of Bhakti
          </div>
          <h2 id="bhakti-title" className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#fff6df] tracking-tight mb-6">
            Birth of the Bhakti Movement
          </h2>
          <p className="text-lg md:text-xl text-[#fff6df]/60 max-w-2xl leading-relaxed">
            From the 13th to 17th century, Maharashtra's saints transformed devotion from temple ritual
            into a living, breathing movement of the people.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative before:absolute before:inset-0 before:ml-5 md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[#f6bc55]/50 before:via-[#ff7a1a]/20 before:to-transparent"
        >
          {BHAKTI_TIMELINE.map((item, i) => (
            <TimelineItem key={i} {...item} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TimelineItem({
  century,
  saint,
  saintEn,
  desc,
  tag,
  image,
  index: _index,
}: {
  century: string;
  saint: string;
  saintEn: string;
  desc: string;
  tag: string;
  image: string;
  index: number;
}) {

  return (
    <motion.div variants={itemVariants} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-12 last:mb-0">
      
      {/* Icon/Dot */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#050402] bg-[#f6bc55] shadow-[0_0_15px_rgba(246,188,85,0.4)] md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shrink-0" />
      
      {/* Content Card */}
      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl hover:bg-white/10 transition-colors duration-300 relative overflow-hidden group-hover:border-[#f6bc55]/30">
        <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-6xl italic text-[#f6bc55] pointer-events-none">
          {century.split(' ')[0]}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 items-start relative z-10">
          <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
            <Image
              src={image}
              alt={`${saintEn} portrait`}
              width={128}
              height={128}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            />
          </div>
          
          <div className="flex-1">
            <span className="inline-block px-3 py-1 mb-4 rounded-full bg-[#f6bc55]/10 text-[#f6bc55] text-xs font-semibold tracking-wide uppercase border border-[#f6bc55]/20">
              {century}
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-[#fff6df] mb-1">{saint}</h3>
            <p className="text-sm text-[#fff6df]/50 font-medium mb-4">{saintEn}</p>
            <p className="text-[#fff6df]/70 leading-relaxed mb-6">{desc}</p>
            <span className="text-xs font-medium text-[#f6bc55] uppercase tracking-widest flex items-center gap-2">
              <span className="w-4 h-px bg-[#f6bc55]/50" />
              {tag}
            </span>
          </div>
        </div>
      </div>

    </motion.div>
  );
}
