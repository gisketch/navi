import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinanceData } from '../hooks/useFinanceData';
import { GlassContainer } from './Dashboard';
import { DynamicIcon } from './DynamicIcon';
import { cn, rounded, glass } from '../utils/glass';
import type { Allocation, DailySpendData, WalletStats } from '../utils/financeTypes';
import { allocationColorClasses } from '../utils/financeTypes';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface FinanceProps {
  naviPosition?: { x: number; y: number };
}

// ============================================
// Primary Wallet Card (Living/Play - Hero Cards)
// ============================================
function WalletCard({
  allocation,
  stats,
  naviPosition,
  entranceDelay,
  isPrimary = false,
}: {
  allocation: Allocation;
  stats: WalletStats;
  naviPosition?: { x: number; y: number };
  entranceDelay: number;
  isPrimary?: boolean;
}) {
  const colorClasses = allocationColorClasses[allocation.color] || allocationColorClasses.emerald;
  const progressPercent = (stats.currentBalance / stats.totalBudget) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: entranceDelay,
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      <GlassContainer
        naviPosition={naviPosition}
        glowColor={colorClasses.glow}
        className="relative overflow-hidden"
      >
        {/* Top accent line */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-1',
            colorClasses.bg
          )}
          style={{
            background: `linear-gradient(90deg, transparent, ${colorClasses.glow}, transparent)`,
          }}
        />

        <div className={cn('p-5', isPrimary && 'pb-6')}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2.5',
                  rounded.lg,
                  'backdrop-blur-sm bg-white/[0.04]',
                  'border border-white/[0.08]'
                )}
              >
                <DynamicIcon
                  name={allocation.icon}
                  className={cn('w-5 h-5', colorClasses.text)}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/70">{allocation.name}</h3>
                {allocation.is_strict && (
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">
                    Strict Budget
                  </span>
                )}
              </div>
            </div>

            {/* Status badge */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                stats.isOnTrack
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              )}
            >
              {stats.isOnTrack ? (
                <>
                  <TrendingUp size={12} />
                  On Track
                </>
              ) : (
                <>
                  <TrendingDown size={12} />
                  Over
                </>
              )}
            </div>
          </div>

          {/* Balance Display */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-white/40">₱</span>
              <motion.span
                key={stats.currentBalance}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('text-4xl font-bold tracking-tight', colorClasses.text)}
              >
                {stats.currentBalance.toLocaleString()}
              </motion.span>
              <span className="text-sm text-white/30">
                / ₱{stats.totalBudget.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ delay: entranceDelay + 0.3, duration: 0.8, ease: 'easeOut' }}
                className={cn('h-full rounded-full', colorClasses.bg)}
                style={{
                  background: `linear-gradient(90deg, ${colorClasses.glow}, ${colorClasses.glow.replace('0.5', '0.8')})`,
                }}
              />
            </div>
          </div>

          {/* Daily Safe Spend (Primary wallets only) */}
          {isPrimary && allocation.daily_limit && (
            <div className={cn(
              'flex items-center justify-between p-3 rounded-xl',
              'bg-white/[0.03] border border-white/[0.06]'
            )}>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className={colorClasses.text} />
                <span className="text-sm text-white/50">Safe to spend today</span>
              </div>
              <span className={cn('text-lg font-semibold', colorClasses.text)}>
                ₱{stats.dailySafeSpend.toLocaleString()}
              </span>
            </div>
          )}

          {/* Days remaining */}
          {!isPrimary && (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Calendar size={14} />
              <span>{stats.daysRemaining} days left in cycle</span>
            </div>
          )}
        </div>
      </GlassContainer>
    </motion.div>
  );
}

// ============================================
// Stashed Wallet (Collapsed by default)
// ============================================
function StashedWalletItem({
  allocation,
  index,
  entranceDelay,
}: {
  allocation: Allocation;
  index: number;
  entranceDelay: number;
}) {
  const colorClasses = allocationColorClasses[allocation.color] || allocationColorClasses.cyan;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: entranceDelay + index * 0.08,
        duration: 0.4,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className={cn(
        'flex items-center justify-between p-3 rounded-xl',
        'bg-white/[0.02] border border-white/[0.05]'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', colorClasses.bg, colorClasses.border, 'border')}>
          <DynamicIcon name={allocation.icon} className={cn('w-4 h-4', colorClasses.text)} />
        </div>
        <span className="text-sm text-white/60">{allocation.name}</span>
      </div>
      <span className={cn('text-sm font-medium', colorClasses.text)}>
        ₱{allocation.current_balance.toLocaleString()}
      </span>
    </motion.div>
  );
}

// ============================================
// Completed Payment Item
// ============================================
function CompletedPaymentItem({
  allocation,
  index,
  entranceDelay,
}: {
  allocation: Allocation;
  index: number;
  entranceDelay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: entranceDelay + index * 0.08,
        duration: 0.4,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      className={cn(
        'flex items-center justify-between p-3 rounded-xl',
        'bg-white/[0.02] border border-white/[0.05]',
        'opacity-60'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <span className="text-sm text-white/60 line-through">{allocation.name}</span>
          <span className="text-xs text-emerald-400/70 ml-2">Paid</span>
        </div>
      </div>
      <span className="text-sm font-medium text-white/40 line-through">
        ₱{allocation.total_budget.toLocaleString()}
      </span>
    </motion.div>
  );
}

// ============================================
// Pace Graph Component (for Living Wallet)
// ============================================
function PaceGraph({
  data,
  naviPosition,
  entranceDelay,
}: {
  data: DailySpendData[];
  naviPosition?: { x: number; y: number };
  entranceDelay: number;
}) {
  const today = new Date().toISOString().split('T')[0];
  
  // Find the max value for scaling
  const maxValue = Math.max(...data.map(d => Math.max(d.ideal, d.actual)));
  
  // Only show data up to today
  const visibleData = data.filter(d => d.date <= today);
  const todayIndex = visibleData.length - 1;
  
  // Calculate positions for the lines
  const getY = (value: number) => 100 - (value / maxValue) * 100;
  
  // Generate SVG path for smooth lines
  const generatePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };
  
  const idealPoints = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: getY(d.ideal),
  }));
  
  const actualPoints = visibleData.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: getY(d.actual),
  }));
  
  const idealPath = generatePath(idealPoints);
  const actualPath = generatePath(actualPoints);
  
  // Current status
  const currentData = visibleData[todayIndex];
  const isAboveIdeal = currentData ? currentData.actual >= currentData.ideal : true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: entranceDelay,
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      <GlassContainer naviPosition={naviPosition} glowColor="rgba(52, 211, 153, 0.3)">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Living Wallet Pace
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-white/30 rounded-full" />
                <span className="text-white/40">Ideal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  'w-3 h-0.5 rounded-full',
                  isAboveIdeal ? 'bg-emerald-400' : 'bg-red-400'
                )} />
                <span className="text-white/40">Actual</span>
              </div>
            </div>
          </div>

          {/* Graph Container */}
          <div className="relative h-32 w-full">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
            >
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="10" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />

              {/* Ideal path (dotted) */}
              <motion.path
                d={idealPath}
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
                strokeDasharray="2 2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: entranceDelay + 0.3, duration: 1 }}
              />

              {/* Actual path */}
              <motion.path
                d={actualPath}
                fill="none"
                stroke={isAboveIdeal ? 'rgb(52, 211, 153)' : 'rgb(248, 113, 113)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: entranceDelay + 0.5, duration: 1 }}
              />

              {/* Current point indicator */}
              {currentData && actualPoints[todayIndex] && (
                <motion.circle
                  cx={actualPoints[todayIndex].x}
                  cy={actualPoints[todayIndex].y}
                  r="2"
                  fill={isAboveIdeal ? 'rgb(52, 211, 153)' : 'rgb(248, 113, 113)'}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: entranceDelay + 1.5 }}
                />
              )}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between mt-2 text-[10px] text-white/30 px-1">
            <span>{data[0]?.date?.slice(5) || ''}</span>
            <span>Today</span>
            <span>{data[data.length - 1]?.date?.slice(5) || ''}</span>
          </div>
        </div>
      </GlassContainer>
    </motion.div>
  );
}

// ============================================
// Cycle Overview Card
// ============================================
function CycleOverviewCard({
  cycleName,
  startDate,
  endDate,
  totalIncome,
  totalSpent,
  daysRemaining,
  naviPosition,
  entranceDelay,
}: {
  cycleName: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalSpent: number;
  daysRemaining: number;
  naviPosition?: { x: number; y: number };
  entranceDelay: number;
}) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: entranceDelay,
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      <GlassContainer naviPosition={naviPosition} glowColor="rgba(34, 211, 238, 0.3)">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-cyan-400" />
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              {cycleName}
            </h3>
          </div>

          <div className="flex items-center justify-between text-xs text-white/40 mb-3">
            <span>{start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <div className="flex-1 mx-3 h-px bg-gradient-to-r from-white/10 via-white/20 to-white/10" />
            <span>{end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-white">₱{(totalIncome / 1000).toFixed(1)}k</p>
              <p className="text-[10px] text-white/40">Income</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">₱{(totalSpent / 1000).toFixed(1)}k</p>
              <p className="text-[10px] text-white/40">Spent</p>
            </div>
            <div>
              <p className="text-lg font-bold text-cyan-400">{daysRemaining}</p>
              <p className="text-[10px] text-white/40">Days Left</p>
            </div>
          </div>
        </div>
      </GlassContainer>
    </motion.div>
  );
}

// ============================================
// Collapsible Section
// ============================================
function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  entranceDelay,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  entranceDelay: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: entranceDelay }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 px-1 text-xs font-semibold text-white/30 uppercase tracking-wider hover:text-white/50 transition-colors"
      >
        <span>{title}</span>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// Main Finance Component
// ============================================
export function Finance({ naviPosition }: FinanceProps) {
  const {
    activeCycle,
    activeWallets,
    stashedWallets,
    completedPayments,
    walletStats,
    cycleOverview,
    livingWalletPaceData,
    isLoading,
    error,
    isMock,
  } = useFinanceData();

  const [animationKey, setAnimationKey] = useState(0);

  // Reset animations when component mounts
  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
  }, []);

  // Animation delays
  const headerDelay = 0.1;
  const livingWalletDelay = headerDelay + 0.2;
  const playWalletDelay = livingWalletDelay + 0.15;
  const paceDelay = playWalletDelay + 0.15;
  const overviewDelay = paceDelay + 0.2;
  const stashedDelay = overviewDelay + 0.2;
  const completedDelay = stashedDelay + 0.3;

  // Get living and play wallets
  const livingWallet = activeWallets.find(w => w.category === 'living');
  const playWallet = activeWallets.find(w => w.category === 'play');
  const livingStats = livingWallet ? walletStats.get(livingWallet.id) : null;
  const playStats = playWallet ? walletStats.get(playWallet.id) : null;

  // Calculate days remaining
  const daysRemaining = activeCycle 
    ? Math.max(0, Math.ceil((new Date(activeCycle.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col px-5 lg:px-8 py-8">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn('h-24', rounded.lg, glass.card, 'animate-pulse')}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !activeCycle) {
    return (
      <div className="flex-1 flex items-center justify-center px-5">
        <GlassContainer className="p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">No Active Cycle</h3>
          <p className="text-sm text-white/50">
            {error || 'Set up a financial cycle to start tracking'}
          </p>
        </GlassContainer>
      </div>
    );
  }

  return (
    <div
      key={animationKey}
      className="flex-1 flex flex-col overflow-hidden px-5 lg:px-8"
    >
      {/* Desktop: Bento Grid / Mobile: Stack */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 lg:py-8 overflow-hidden">

        {/* Header */}
        <header
          className="pb-4 shrink-0 lg:col-span-12 lg:pt-0 touch-none"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 20px) + 36px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Finance
              </h1>
              <p className="text-sm text-white/40 mt-1">Your money, organized</p>
            </div>
            {isMock && (
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 text-[10px] font-medium',
                  'text-amber-300/80 bg-amber-500/10 border border-amber-500/20',
                  rounded.full
                )}
              >
                Demo Mode
              </span>
            )}
          </motion.div>
        </header>

        {/* Main Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-32 lg:pb-8 hide-scrollbar overscroll-contain lg:col-span-12 lg:grid lg:grid-cols-12 lg:gap-6 lg:overflow-visible">

          {/* Left Column: Wallets */}
          <div className="space-y-4 lg:col-span-7 lg:space-y-5">
            
            {/* Living Wallet (Primary) */}
            {livingWallet && livingStats && (
              <WalletCard
                allocation={livingWallet}
                stats={livingStats}
                naviPosition={naviPosition}
                entranceDelay={livingWalletDelay}
                isPrimary={true}
              />
            )}

            {/* Play Wallet */}
            {playWallet && playStats && (
              <WalletCard
                allocation={playWallet}
                stats={playStats}
                naviPosition={naviPosition}
                entranceDelay={playWalletDelay}
                isPrimary={false}
              />
            )}

            {/* Pace Graph */}
            {livingWalletPaceData.length > 0 && (
              <PaceGraph
                data={livingWalletPaceData}
                naviPosition={naviPosition}
                entranceDelay={paceDelay}
              />
            )}
          </div>

          {/* Right Column: Overview & Stashed */}
          <div className="mt-4 lg:mt-0 lg:col-span-5 space-y-4">
            
            {/* Cycle Overview */}
            {cycleOverview && (
              <CycleOverviewCard
                cycleName={activeCycle.name}
                startDate={activeCycle.start_date}
                endDate={activeCycle.end_date}
                totalIncome={cycleOverview.totalIncome}
                totalSpent={cycleOverview.totalSpent}
                daysRemaining={daysRemaining}
                naviPosition={naviPosition}
                entranceDelay={overviewDelay}
              />
            )}

            {/* Stashed Wallets */}
            {stashedWallets.length > 0 && (
              <CollapsibleSection
                title="Stashed Away"
                defaultOpen={false}
                entranceDelay={stashedDelay}
              >
                {stashedWallets.map((wallet, index) => (
                  <StashedWalletItem
                    key={wallet.id}
                    allocation={wallet}
                    index={index}
                    entranceDelay={stashedDelay}
                  />
                ))}
              </CollapsibleSection>
            )}

            {/* Completed Payments */}
            {completedPayments.length > 0 && (
              <CollapsibleSection
                title="Payments Made"
                defaultOpen={false}
                entranceDelay={completedDelay}
              >
                {completedPayments.map((payment, index) => (
                  <CompletedPaymentItem
                    key={payment.id}
                    allocation={payment}
                    index={index}
                    entranceDelay={completedDelay}
                  />
                ))}
              </CollapsibleSection>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
