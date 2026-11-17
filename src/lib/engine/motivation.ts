/**
 * Daily motivation engine. Content is assembled from the user's real context (streaks,
 * last workout, sleep, goals, today's program day) plus rotating pools, so the message
 * changes meaningfully day to day. Pools rotate without repeats until exhausted, with a
 * per-user offset so two users don't see the same sequence.
 *
 * Quotes are restricted to ones with well-established sources; scripture is KJV (public domain).
 */

export type Theme = "discipline" | "consistency" | "faith" | "fitness" | "growth" | "resilience" | "habits" | "long-term";

export type Quote = { text: string; author: string; source?: string; faith?: boolean; theme: Theme };

export const QUOTES: Quote[] = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant", source: "The Story of Philosophy (summarising Aristotle)", theme: "habits" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius", source: "Meditations, 10.16", theme: "discipline" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", source: "Meditations, 5.20", theme: "resilience" },
  { text: "While we are postponing, life speeds by.", author: "Seneca", source: "Letters to Lucilius, 1", theme: "long-term" },
  { text: "No man is free who is not master of himself.", author: "Epictetus", source: "Fragments", theme: "discipline" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus", source: "Discourses, 3.23", theme: "growth" },
  { text: "If there is no struggle, there is no progress.", author: "Frederick Douglass", source: "West India Emancipation speech, 1857", theme: "resilience" },
  { text: "It is not the critic who counts… The credit belongs to the man who is actually in the arena.", author: "Theodore Roosevelt", source: "Citizenship in a Republic, 1910", theme: "resilience" },
  { text: "A journey of a thousand li starts beneath one's feet.", author: "Laozi", source: "Tao Te Ching, ch. 64", theme: "long-term" },
  { text: "Everything can be taken from a man but one thing: the last of the human freedoms — to choose one's attitude in any given set of circumstances.", author: "Viktor Frankl", source: "Man's Search for Meaning", theme: "resilience" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin", source: "Poor Richard's Almanack", theme: "discipline" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche", source: "Twilight of the Idols (as quoted by Frankl)", theme: "long-term" },
  { text: "Difficulties strengthen the mind, as labour does the body.", author: "Seneca", source: "Letters to Lucilius", theme: "fitness" },
  { text: "It never ceases to amaze me: we all love ourselves more than other people, but care more about their opinion than our own.", author: "Marcus Aurelius", source: "Meditations, 12.4", theme: "growth" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn", theme: "discipline" },
  { text: "I can do all things through Christ which strengtheneth me.", author: "Philippians 4:13", source: "KJV", faith: true, theme: "faith" },
  { text: "They that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", author: "Isaiah 40:31", source: "KJV", faith: true, theme: "faith" },
  { text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not.", author: "Galatians 6:9", source: "KJV", faith: true, theme: "consistency" },
  { text: "Commit thy works unto the LORD, and thy thoughts shall be established.", author: "Proverbs 16:3", source: "KJV", faith: true, theme: "faith" },
  { text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.", author: "2 Timothy 1:7", source: "KJV", faith: true, theme: "resilience" },
  { text: "Now no chastening for the present seemeth to be joyous, but grievous: nevertheless afterward it yieldeth the peaceable fruit of righteousness unto them which are exercised thereby.", author: "Hebrews 12:11", source: "KJV", faith: true, theme: "discipline" },
  { text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.", author: "Joshua 1:9", source: "KJV", faith: true, theme: "resilience" },
  { text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.", author: "Colossians 3:23", source: "KJV", faith: true, theme: "faith" },
  { text: "Tribulation worketh patience; and patience, experience; and experience, hope.", author: "Romans 5:3–4", source: "KJV", faith: true, theme: "resilience" },
  { text: "Every man that striveth for the mastery is temperate in all things.", author: "1 Corinthians 9:25", source: "KJV", faith: true, theme: "discipline" },
];

const MESSAGES: Record<Theme, string[]> = {
  discipline: [
    "Motivation is a visitor. Discipline lives here. Do the next right thing whether you feel like it or not — that's the whole game.",
    "You don't rise to the level of your goals. You fall to the level of your standards. Raise one standard today and hold it.",
    "Today is not about intensity. It's about keeping the promises you made to yourself. Small promises, kept, build an unbreakable identity.",
    "Comfort is the enemy of progress. Pick one hard thing today and do it first, before the day gets a vote.",
  ],
  consistency: [
    "The person you're becoming is built in unremarkable days. Show up again. Average effort repeated beats perfect effort abandoned.",
    "Don't break the chain. Even a minimum version of your habits today keeps the identity alive.",
    "Results lag behind effort. Trust the reps you can't see paying off yet.",
  ],
  faith: [
    "Your body is a gift to steward, not an idol to serve. Train with gratitude, rest without guilt, and work as if it matters — because it does.",
    "Purpose outlasts motivation. Remember who you're doing this for and let that carry you through the parts that are hard.",
    "Strength isn't only physical. Patience, humility and service are disciplines too. Practice one of them on purpose today.",
  ],
  fitness: [
    "Every rep is a vote for the person you're becoming. Make today's votes count with clean, honest effort.",
    "Strength is earned in the boring middle: warm-up sets, controlled reps, full range. Do the basics better than anyone.",
    "Your workout is not punishment. It's preparation — for carrying your kids, climbing the stairs at 70, and handling whatever life throws.",
  ],
  growth: [
    "Compare yourself to who you were yesterday, not to who someone else is today. One percent better is still better.",
    "Read a page. Learn a skill. Ask a better question. Growth is a daily practice, not an event.",
    "The version of you that you want to be is already making different choices. Make one of those choices this morning.",
  ],
  resilience: [
    "Setbacks are data, not verdicts. Missed days don't erase progress — quitting does. Get back on track today.",
    "Pressure reveals what you've practiced. Practice calm, practice effort, practice getting back up.",
    "Hard days are where character is forged. You don't have to be perfect. You have to keep going.",
  ],
  habits: [
    "Make it obvious, make it easy, make it satisfying. Engineer today so the right choice is the default choice.",
    "Habits compound like interest. The tiny thing you do today is worth far more than it looks.",
    "Stack your habits: after coffee, skincare. After skincare, ten minutes of reading. Tie the new to the automatic.",
  ],
  "long-term": [
    "Think in years, act in days. The decade you want is built from today's ordinary decisions.",
    "Most people overestimate what they can do in a month and underestimate what they can do in a year. Play the long game.",
    "Patience is a competitive advantage. Keep stacking quiet wins while others chase shortcuts.",
  ],
};

const CHALLENGES: { text: string; theme: Theme; faith?: boolean }[] = [
  { text: "Do your hardest task of the day before checking social media.", theme: "discipline" },
  { text: "Take a 20-minute walk outside without your phone.", theme: "fitness" },
  { text: "Drink a full glass of water before your first coffee.", theme: "habits" },
  { text: "Phone out of the bedroom tonight — read instead.", theme: "habits" },
  { text: "Do 50 push-ups spread across the day (any variation).", theme: "fitness" },
  { text: "Write down three things you're grateful for and one person you'll thank.", theme: "growth" },
  { text: "Cold finish: end your shower with 30 seconds of cold water.", theme: "resilience" },
  { text: "Spend 10 minutes on mobility: hips, thoracic spine, ankles.", theme: "fitness" },
  { text: "Say no to one thing that doesn't serve your goals.", theme: "discipline" },
  { text: "Plan tomorrow tonight: top 3 priorities on paper.", theme: "long-term" },
  { text: "Do one act of service for someone without telling anyone.", theme: "faith", faith: true },
  { text: "Spend 10 minutes in prayer or quiet reflection before the day starts.", theme: "faith", faith: true },
  { text: "Complete both your AM and PM skincare routine — no skips.", theme: "consistency" },
  { text: "Get to bed 30 minutes earlier than usual.", theme: "habits" },
  { text: "Read 20 pages of a book that makes you better.", theme: "growth" },
  { text: "Eat a protein-rich, minimally processed meal at every meal today.", theme: "fitness" },
  { text: "Reach out to someone you've lost touch with.", theme: "growth" },
  { text: "Hold a plank for your best time with perfect form.", theme: "fitness" },
  { text: "No complaining for the entire day. Catch it, reframe it.", theme: "resilience" },
  { text: "Review your long-term goals and do one thing that moves the biggest one forward.", theme: "long-term" },
];

const REFLECTIONS: { text: string; faith?: boolean }[] = [
  { text: "What's one promise to yourself you kept yesterday, and one you didn't? What made the difference?" },
  { text: "Where did you take the easy option recently when the right option was available?" },
  { text: "What would the strongest version of you do with today?" },
  { text: "What are you tolerating that you need to change?" },
  { text: "Which habit, if done every day for a year, would change your life the most?" },
  { text: "Who do you want to be for the people who depend on you?" },
  { text: "What fear is holding you back, and what's the smallest step toward it?" },
  { text: "What drained your energy this week, and what restored it?" },
  { text: "Where are you being called to serve, and are you answering?", faith: true },
  { text: "What are you grateful for that you've been taking for granted?" },
  { text: "Are your daily actions aligned with what you say matters most?" },
  { text: "What would you attempt if you knew you couldn't fail?" },
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const dayNumber = (date: string) => Math.floor(new Date(date + "T12:00:00Z").getTime() / 864e5);
/** Deterministic rotation: every item appears once before any repeats. */
const rotate = <T,>(pool: T[], date: string, seed: string) => pool[(dayNumber(date) + (hash(seed) % pool.length)) % pool.length];

export type DailyContext = {
  name: string;
  date: string;
  userId: string;
  faith: boolean;
  streakWeeks: number;
  daysSinceWorkout: number | null;
  todayPlan: string | null;
  sleepLastNight: number | null;
  habitRateWeek: number | null; // 0–1
  activeGoals: string[];
  hour: number;
};

export function dailyContent(ctx: DailyContext) {
  const themes: Theme[] = ["discipline", "consistency", "fitness", "growth", "resilience", "habits", "long-term", ...(ctx.faith ? (["faith"] as Theme[]) : [])];
  // Context picks the theme when it's informative; otherwise rotate.
  let theme: Theme = rotate(themes, ctx.date, ctx.userId + "theme");
  if (ctx.daysSinceWorkout != null && ctx.daysSinceWorkout >= 4) theme = "resilience";
  else if (ctx.habitRateWeek != null && ctx.habitRateWeek < 0.4) theme = "habits";
  else if (ctx.streakWeeks >= 4 && dayNumber(ctx.date) % 3 === 0) theme = "long-term";

  const greeting = ctx.hour < 12 ? "Good morning" : ctx.hour < 18 ? "Good afternoon" : "Good evening";
  const lines: string[] = [];
  if (ctx.streakWeeks >= 2) lines.push(`${ctx.streakWeeks} straight weeks of training. That's who you are now.`);
  else if (ctx.daysSinceWorkout != null && ctx.daysSinceWorkout >= 4) lines.push(`It's been ${ctx.daysSinceWorkout} days since your last session. No guilt — just get back under the bar today.`);
  if (ctx.todayPlan) lines.push(`On deck: ${ctx.todayPlan}.`);
  if (ctx.sleepLastNight != null && ctx.sleepLastNight < 6) lines.push("Short sleep last night — keep intensity honest and prioritise an early night.");
  if (ctx.activeGoals.length) lines.push(`Keep "${rotate(ctx.activeGoals, ctx.date, ctx.userId + "goal")}" in front of you.`);

  const quotes = QUOTES.filter((q) => ctx.faith || !q.faith);
  const challenges = CHALLENGES.filter((c) => ctx.faith || !c.faith);
  const reflections = REFLECTIONS.filter((r) => ctx.faith || !r.faith);

  return {
    theme,
    greeting: `${greeting}, ${ctx.name.split(" ")[0]}.`,
    message: rotate(MESSAGES[theme], ctx.date, ctx.userId + theme),
    context: lines,
    quote: rotate(quotes, ctx.date, ctx.userId + "q"),
    challenge: rotate(challenges, ctx.date, ctx.userId + "c"),
    reflection: rotate(reflections, ctx.date, ctx.userId + "r").text,
  };
}

export const DEFAULT_HABITS = [
  { name: "Train or move 30+ minutes", category: "fitness" },
  { name: "AM skincare + sunscreen", category: "skin" },
  { name: "PM skincare", category: "skin" },
  { name: "Drink 2+ litres of water", category: "health" },
  { name: "Read 10 pages", category: "growth" },
  { name: "No phone first 30 minutes", category: "discipline" },
  { name: "Prayer or quiet reflection", category: "faith" },
  { name: "In bed by target time", category: "recovery" },
];
