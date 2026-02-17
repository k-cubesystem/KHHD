'use client'

import { motion } from 'framer-motion'

export function Hero() {
  return (
    <div className="relative flex flex-col gap-12 items-center text-center px-4 pt-32 pb-20 z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        className="flex flex-col gap-6 items-center"
      >
        <div className="relative">
          <div className="absolute -inset-4 bg-gold-500/20 blur-2xl rounded-full opacity-0 animate-breathe" />
          <span className="relative text-gold-500 font-medium tracking-[0.3em] text-sm uppercase border border-gold-500/30 px-4 py-1.5 rounded-full backdrop-blur-sm">
            Premium Fate Science
          </span>
        </div>

        <h1 className="text-6xl md:text-8xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/60 drop-shadow-2xl">
          海華堂
          <span className="text-2xl md:text-4xl text-gold-500 font-light ml-4 tracking-normal align-middle">
            AI
          </span>
        </h1>

        <p className="text-lg md:text-xl text-stone-300 max-w-2xl mx-auto leading-relaxed font-light font-sans">
          데이터 사이언스의 <span className="text-gold-400 font-medium">논리</span>와 전통 명리학의{' '}
          <span className="text-gold-400 font-medium">통찰</span>.<br />
          당신의 운명을 가장 정교하게 설계하는 프리미엄 컨설팅.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-8"
      >
        {[
          {
            title: '天 (운명)',
            subtitle: 'Hyper-Precision Saju',
            desc: '나노초 단위의 정밀 만세력 엔진',
            icon: '🌌',
          },
          {
            title: '人 (의지)',
            subtitle: 'Multimodal Analysis',
            desc: '관상과 손금을 읽는 비전 AI',
            icon: '👤',
          },
          {
            title: '地 (환경)',
            subtitle: 'Fengshui Solution',
            desc: '공간의 에너지를 최적화하는 풍수',
            icon: '🌏',
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            viewport={{ once: true }}
            className="group relative glass-panel p-8 rounded-2xl flex flex-col gap-3 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-6xl grayscale group-hover:grayscale-0">
              {item.icon}
            </div>

            <h3 className="text-stone-100 font-serif font-bold text-2xl group-hover:text-gold-400 transition-colors">
              {item.title}
            </h3>
            <span className="text-xs font-mono text-gold-500/70 tracking-wider uppercase">
              {item.subtitle}
            </span>
            <div className="w-8 h-[1px] bg-white/10 my-2 group-hover:bg-gold-500/50 transition-colors" />
            <p className="text-sm text-stone-400 leading-relaxed z-10">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
