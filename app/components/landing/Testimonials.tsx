"use client";

type Testimonial = {
  name: string;
  title: string;
  rating: 4 | 4.5 | 5;
  quote: string;
};

type TestimonialRow = {
  items: Testimonial[];
  direction: "normal" | "reverse";
  duration: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "臧心昊",
    title: "运动博主",
    rating: 4.5,
    quote:
      "书跃不仅可以快速概括书籍内容，还会给出阅读指南，让你带着问题去阅读，根据书籍的观点给出可执行的行动，打通知识到行动的壁垒。",
  },
  {
    name: "华华",
    title: "投资专家",
    rating: 5,
    quote:
      "我想知道这本书讲什么，但我不想看书；我想把书的内容放到实际场景，但我不想被评判对错；书跃让读书不止是读书。",
  },
  {
    name: "科学怪熊",
    title: "全科老师，素质教育工作者",
    rating: 5,
    quote:
      "书跃展示了一种思维方式，为阅读者提供了地图而非答案。对“AI时代如何读书”这个问题，它给出了具有启发性的回答。",
  },
  {
    name: "宇宇",
    title: "社群运营",
    rating: 4.5,
    quote:
      "智能拆解全书内容，凝练成 6 张精华知识卡片，脉络清晰、重点突出，让每一次阅读都有迹可循。",
  },
  {
    name: "老K",
    title: "产品经理 · 5 年经验",
    rating: 4,
    quote:
      "以前一本书要读两周，现在 30 秒就能抓到核心。不是替代阅读，而是让我知道该重点读哪里。",
  },
  {
    name: "薇薇安",
    title: "创业者 · 教育行业",
    rating: 5,
    quote:
      "决策训练功能太惊艳了，不只是告诉你书里说了什么，还让你在真实场景里用起来。",
  },
  {
    name: "浩子",
    title: "咨询顾问 · 战略方向",
    rating: 4.5,
    quote:
      "我把团队必读的书都传了上去，导出的知识卡片直接变成了内部培训材料。行动提炼特别实用。",
  },
  {
    name: "小鱼",
    title: "自由职业者 · 写作",
    rating: 4,
    quote:
      "观点地图帮我快速理清一本书的逻辑脉络，写书评的效率提升了不止一倍。",
  },
  {
    name: "磊哥",
    title: "技术总监 · 互联网",
    rating: 4.5,
    quote:
      "终于不用再为读不完书焦虑了。6 张卡片就是一本书的精华，随时可以回顾。",
  },
  {
    name: "文博",
    title: "互联网产品增长专家",
    rating: 5,
    quote:
      "书跃把书里的核心结构、重点观点和后续可执行的方向梳理出来，引导我把阅读变成行动。",
  },
  {
    name: "祥仔",
    title: "Builder",
    rating: 4,
    quote:
      "书跃从多个维度拆解一本书，既可以作为阅读后的补充和回顾，也可以作为一本新书阅读前的引导。",
  },
];

const TESTIMONIAL_ROWS: TestimonialRow[] = [
  {
    items: [
      TESTIMONIALS[0],
      TESTIMONIALS[1],
      TESTIMONIALS[2],
      TESTIMONIALS[3],
      TESTIMONIALS[4],
      TESTIMONIALS[5],
    ],
    direction: "normal",
    duration: "62s",
  },
  {
    items: [
      TESTIMONIALS[6],
      TESTIMONIALS[7],
      TESTIMONIALS[8],
      TESTIMONIALS[9],
      TESTIMONIALS[10],
      TESTIMONIALS[2],
    ],
    direction: "reverse",
    duration: "58s",
  },
];

const STAR_FILLS = [1, 1, 1, 1, 1] as const;

function StarRating({ rating }: { rating: Testimonial["rating"] }) {
  return (
    <div aria-label={`${rating} 星好评`} className="flex items-center gap-0.5" title={`${rating} 星好评`}>
      {STAR_FILLS.map((_, index) => {
        const fill = Math.max(0, Math.min(1, rating - index));

        return (
          <span
            key={index}
            aria-hidden="true"
            className="grid h-[14px] w-[14px] shrink-0 place-items-center overflow-hidden rounded-[2px]"
            style={{
              background: `linear-gradient(90deg, #3a8f68 0%, #3a8f68 ${
                fill * 100
              }%, rgba(47,51,51,0.12) ${fill * 100}%, rgba(47,51,51,0.12) 100%)`,
            }}
          >
            <span className="text-[10px] leading-none text-[#fbfcfd]">★</span>
          </span>
        );
      })}
    </div>
  );
}

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <article className="testimonial-marquee-card shrink-0">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgba(211,231,219,0.42)] text-sm font-semibold text-[var(--accent)] shadow-[inset_0_0_0_1px_rgba(58,111,82,0.08)]">
          {item.name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold leading-5 text-[var(--ink)]">{item.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--ink-faint)]">{item.title}</p>
        </div>
        <span className="ml-auto mt-1 h-2 w-2 shrink-0 rounded-full bg-[rgba(58,111,82,0.2)]" />
      </div>

      <p className="mt-3.5 line-clamp-3 font-editorial text-[0.98rem] font-semibold leading-[1.58] tracking-[-0.01em] text-[var(--ink)]">
        {item.quote}
      </p>

      <div className="mt-3.5 flex items-center justify-between border-t border-[var(--ghost-border)] pt-3">
        <StarRating rating={item.rating} />
        <span className="text-[10px] font-semibold tracking-[0.14em] text-[var(--ink-faint)]">
          {item.rating.toFixed(1)}
        </span>
      </div>
    </article>
  );
}

function TestimonialMarqueeRow({ row }: { row: TestimonialRow }) {
  const repeatedItems = [...row.items, ...row.items];

  return (
    <div className="testimonial-marquee-row group/row">
      <div
        className={`flex w-max gap-4 md:gap-5 ${
          row.direction === "reverse" ? "testimonial-marquee-track-reverse" : "testimonial-marquee-track"
        }`}
        style={{ animationDuration: row.duration }}
      >
        {repeatedItems.map((item, index) => (
          <TestimonialCard key={`${row.direction}-${item.name}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="px-6 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-[1540px] overflow-hidden rounded-[32px] border border-[var(--ghost-border)] bg-[var(--paper)] py-8 shadow-[var(--shadow-paper)] md:py-10">
        <div className="mx-auto max-w-[960px] px-5 text-center md:px-8">
          <h2 className="font-editorial text-[2.15rem] font-semibold leading-[1.06] tracking-[-0.04em] text-[var(--ink)] md:text-[3.15rem]">
            他们已经在用<span className="text-[var(--accent)]">书跃</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[var(--ink-soft)] md:text-base">
            来自真实读者的反馈，会慢慢从这张安静的书桌上经过。
          </p>
        </div>

        <div className="testimonial-marquee-stage relative mt-8 space-y-4 overflow-hidden py-3 md:mt-9 md:space-y-5 md:py-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[72px] bg-[linear-gradient(90deg,var(--paper)_0%,rgba(251,252,253,0.86)_38%,rgba(251,252,253,0)_100%)] md:w-[180px]" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[72px] bg-[linear-gradient(270deg,var(--paper)_0%,rgba(251,252,253,0.86)_38%,rgba(251,252,253,0)_100%)] md:w-[180px]" />

          {TESTIMONIAL_ROWS.map((row) => (
            <TestimonialMarqueeRow key={`${row.direction}-${row.duration}`} row={row} />
          ))}
        </div>
      </div>
    </section>
  );
}
