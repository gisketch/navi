import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinanceData } from '../contexts/FinanceContext';
import { GlassContainer } from './Dashboard';
import { DynamicIcon } from './DynamicIcon';
import { cn, rounded, glass } from '../utils/glass';
import type { Allocation, DailySpendData, MissionItem } from '../utils/financeTypes';
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
  AlertCircle,
  CreditCard,
  Receipt,
  Banknote,
} from 'lucide-react';

interface FinanceProps {
  naviPosition?: { x: number; y: number };
  onPayBill?: (allocation: Allocation) => void;
  onPayDebt?: (allocation: Allocation) => void;
}

// ============================================
// Daily Budget Card (Safe to Spend - Hero)
// ============================================
function DailyBudgetCard({
  livingWallet,
  daysRemaining,
  naviPosition,
  entranceDelay,
}: {
  livingWallet: Allocation;
  daysRemaining: number;
  naviPosition?: { x: number; y: number };
  entranceDelay: number;
}) {
  const safeToSpend = daysRemaining > 0
    ? Math.floor(livingWallet.current_balance / daysRemaining)
    : livingWallet.current_balance;

  const colorClasses = allocationColorClasses[livingWallet.color] || allocationColorClasses.emerald;

  return (
    <motion.div
      layoutId={`daily-budget-card`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: entranceDelay,
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
        layout: { duration: 0.3 },
      }}
      className="flex-1"
    >
      <GlassContainer
        naviPosition={naviPosition}
        glowColor={colorClasses.glow}
        className="relative overflow-hidden h-full"
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorClasses.glow}, transparent)`,
          }}
        />

        <div className="p-4 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className={colorClasses.text} />
            <span className="text-xs text-white/50 uppercase tracking-wider">Safe to Spend</span>
          </div>

          {/* Big Safe to Spend Amount */}
          <div className="flex-1 flex items-center">
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-white/40">₱</span>
              <motion.span
                key={safeToSpend}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('text-4xl font-bold tracking-tight', colorClasses.text)}
              >
                {safeToSpend.toLocaleString()}
              </motion.span>
            </div>
          </div>

          {/* Remaining Balance (small) */}
          <div className="mt-auto pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Remaining Balance</span>
              <span className="text-sm text-white/60">
                ₱{livingWallet.current_balance.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-white/40">Days Left</span>
              <span className="text-sm text-white/60">{daysRemaining}</span>
            </div>
          </div>
        </div>
      </GlassContainer>
    </motion.div>
  );
}

// ============================================
// Drop Summary Card (Square)
// ============================================
function DropSummaryCard({
  cycleName,
  startDate,
  endDate,
  totalIncome,
  totalAllocated,
  unassigned,
  naviPosition,
  entranceDelay,
}: {
  cycleName: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalAllocated: number;
  unassigned: number;
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
      className="flex-1"
    >
      <GlassContainer naviPosition={naviPosition} glowColor="rgba(34, 211, 238, 0.3)" className="h-full">
        <div className="p-4 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-cyan-400" />
            <span className="text-xs text-white/50 uppercase tracking-wider">{cycleName}</span>
          </div>

          {/* Period */}
          <div className="text-[10px] text-white/30 mb-3">
            {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Income</span>
              <span className="text-sm font-medium text-emerald-400">₱{totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Allocated</span>
              <span className="text-sm font-medium text-white/70">₱{totalAllocated.toLocaleString()}</span>
            </div>
            {unassigned > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-400">Unassigned</span>
                <span className="text-sm font-medium text-amber-400">₱{unassigned.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </GlassContainer>
    </motion.div>
  );
}

// ============================================
// Mission Item Card (Clickable for payments)
// ============================================
function MissionCard({
  item,
  index,
  entranceDelay,
  onClick,
}: {
  item: MissionItem;
  index: number;
  entranceDelay: number;
  onClick?: () => void;
}) {
  const colorClasses = allocationColorClasses[item.allocation.color] || allocationColorClasses.cyan;

  const getTypeConfig = () => {
    switch (item.type) {
      case 'unassigned':
        return {
          icon: <Banknote className="w-4 h-4 text-amber-400" />,
          label: 'Unassigned Cash',
          statusColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10 border-amber-500/20',
          canClick: false,
        };
      case 'due-bill':
        return {
          icon: <Receipt className="w-4 h-4 text-purple-400" />,
          label: item.dueDate
            ? `Due ${new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : 'Due Soon',
          statusColor: 'text-purple-400',
          bgColor: 'bg-purple-500/10 border-purple-500/20',
          canClick: true,
        };
      case 'debt-payment':
        return {
          icon: <CreditCard className="w-4 h-4 text-red-400" />,
          label: item.linkedDebt?.remaining_amount
            ? `₱${item.linkedDebt.remaining_amount.toLocaleString()} total`
            : 'Active',
          statusColor: 'text-red-400',
          bgColor: 'bg-red-500/10 border-red-500/20',
          canClick: true,
        };
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          label: 'Paid',
          statusColor: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10 border-emerald-500/20',
          canClick: false,
        };
      default:
        return {
          icon: <DynamicIcon name={item.allocation.icon} className={cn('w-4 h-4', colorClasses.text)} />,
          label: '',
          statusColor: 'text-white/40',
          bgColor: `${colorClasses.bg} ${colorClasses.border}`,
          canClick: false,
        };
    }
  };

  const config = getTypeConfig();
  const isCompleted = item.type === 'completed';

  const CardContent = (
    <>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg border', config.bgColor)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className={cn(
            'text-sm font-medium truncate',
            isCompleted ? 'text-white/40 line-through' : 'text-white'
          )}>
            {item.allocation.name}
          </p>
          <p className={cn('text-xs', config.statusColor)}>
            {config.label}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          'text-sm font-semibold',
          isCompleted ? 'text-white/30 line-through' : colorClasses.text
        )}>
          ₱{item.allocation.current_balance.toLocaleString()}
        </p>
        {config.canClick && (
          <p className="text-[10px] text-white/30">Tap to pay</p>
        )}
      </div>
    </>
  );

  return (
    <motion.div
      layoutId={`mission-${item.id}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: entranceDelay + index * 0.06,
        duration: 0.4,
        ease: [0.2, 0.8, 0.2, 1],
        layout: { duration: 0.3 },
      }}
    >
      {config.canClick && onClick ? (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onClick}
          className={cn(
            'w-full flex items-center justify-between p-3 rounded-xl',
            'bg-white/[0.02] border border-white/[0.05]',
            'hover:bg-white/[0.04] transition-colors',
            isCompleted && 'opacity-60'
          )}
        >
          {CardContent}
        </motion.button>
      ) : (
        <div className={cn(
          'flex items-center justify-between p-3 rounded-xl',
          'bg-white/[0.02] border border-white/[0.05]',
          isCompleted && 'opacity-60'
        )}>
          {CardContent}
        </div>
      )}
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
  const maxValue = Math.max(...data.map(d => Math.max(d.ideal, d.actual)));
  const visibleData = data.filter(d => d.date <= today);
  const todayIndex = visibleData.length - 1;

  const getY = (value: number) => 100 - (value / maxValue) * 100;

  const generatePath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) / 3;
      const cpx2 = prev.x + (2 * (curr.x - prev.x)) / 3;
      d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const idealPoints = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: getY(d.ideal),
  }));

  const actualPoints = visibleData.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: getY(d.actual),
  }));

  const isOnTrack = visibleData.length > 0 &&
    visibleData[todayIndex].actual <= visibleData[todayIndex].ideal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: entranceDelay, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <GlassContainer naviPosition={naviPosition} glowColor="rgba(34, 211, 238, 0.3)">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-cyan-400" />
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Spending Pace
              </h3>
            </div>
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
              isOnTrack
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            )}>
              {isOnTrack ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {isOnTrack ? 'On Track' : 'Over'}
            </div>
          </div>

          <div className="relative h-24">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="idealGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
                <linearGradient id="actualGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={isOnTrack ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'} />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>

              <path
                d={`${generatePath(idealPoints)} L 100 100 L 0 100 Z`}
                fill="url(#idealGradient)"
              />
              <path d={generatePath(idealPoints)} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" strokeDasharray="2 2" />

              {actualPoints.length > 1 && (
                <>
                  <path
                    d={`${generatePath(actualPoints)} L ${actualPoints[actualPoints.length - 1].x} 100 L 0 100 Z`}
                    fill="url(#actualGradient)"
                  />
                  <path
                    d={generatePath(actualPoints)}
                    fill="none"
                    stroke={isOnTrack ? 'rgba(52,211,153,0.8)' : 'rgba(239,68,68,0.8)'}
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={actualPoints[actualPoints.length - 1].x}
                    cy={actualPoints[actualPoints.length - 1].y}
                    r="2"
                    fill={isOnTrack ? '#34D399' : '#EF4444'}
                  />
                </>
              )}
            </svg>
          </div>

          <div className="flex justify-between text-[10px] text-white/30 mt-2">
            <span>Start</span>
            <span>Today</span>
            <span>End</span>
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
  icon,
  children,
  defaultOpen = false,
  entranceDelay,
  badge,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  entranceDelay: number;
  badge?: React.ReactNode;
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
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
          {badge}
        </div>
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
export function Finance({ naviPosition, onPayBill, onPayDebt }: FinanceProps) {
  const {
    activeSalaryDrop,
    livingWallet,
    // missionFeed computed by context not used - we build our own
    dropSummary,
    livingWalletPaceData,
    allocations,
    isLoading,
    error,
    isMock,
  } = useFinanceData();

  const [animationKey, setAnimationKey] = useState(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    setAnimationKey((prev) => prev + 1);
    const timer = setTimeout(() => {
      hasAnimatedRef.current = true;
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Animation delays
  const headerDelay = 0.1;
  const topRowDelay = headerDelay + 0.15;
  const paceDelay = topRowDelay + 0.2;
  const missionDelay = paceDelay + 0.15;

  // Calculate days remaining from active salary drop
  const daysRemaining = activeSalaryDrop?.period_end
    ? Math.max(0, Math.ceil((new Date(activeSalaryDrop.period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Calculate unassigned cash for active drop
  const unassignedCash = activeSalaryDrop
    ? activeSalaryDrop.amount - allocations
        .filter(a => a.money_drop_id === activeSalaryDrop.id)
        .reduce((sum, a) => sum + a.total_budget, 0)
    : 0;

  // Get allocations linked to active drop for mission feed
  const dropAllocations = activeSalaryDrop
    ? allocations.filter(a => a.money_drop_id === activeSalaryDrop.id)
    : [];

  // Build mission items from allocations
  const buildMissionItems = useCallback((): MissionItem[] => {
    const items: MissionItem[] = [];

    // 1. Unassigned Cash
    if (unassignedCash > 0) {
      items.push({
        id: 'unassigned',
        type: 'unassigned',
        allocation: {
          id: 'unassigned',
          name: 'Unassigned Cash',
          icon: 'banknote',
          category: 'living',
          total_budget: unassignedCash,
          current_balance: unassignedCash,
          is_strict: false,
          color: 'amber',
          money_drop_id: activeSalaryDrop?.id || '',
        },
        priority: 0,
      });
    }

    // Get bills and debts from allocations
    const bills = dropAllocations.filter(a => a.category === 'bills' && a.current_balance > 0);
    const debts = dropAllocations.filter(a => a.category === 'debt' && a.current_balance > 0);
    const completed = dropAllocations.filter(a =>
      (a.category === 'bills' || a.category === 'debt') && a.current_balance === 0
    );

    // 2. Bills (Due Soon)
    bills.forEach((allocation, index) => {
      items.push({
        id: `bill-${allocation.id}`,
        type: 'due-bill',
        allocation,
        priority: 1 + index,
      });
    });

    // 3. Debts (Priority)
    debts.forEach((allocation, index) => {
      items.push({
        id: `debt-${allocation.id}`,
        type: 'debt-payment',
        allocation,
        priority: 100 + index,
      });
    });

    // 4. Completed
    completed.forEach((allocation, index) => {
      items.push({
        id: `completed-${allocation.id}`,
        type: 'completed',
        allocation,
        priority: 200 + index,
      });
    });

    return items.sort((a, b) => a.priority - b.priority);
  }, [unassignedCash, dropAllocations, activeSalaryDrop]);

  const missions = buildMissionItems();

  // Separate missions by type for sections
  const unassignedItems = missions.filter(m => m.type === 'unassigned');
  const billItems = missions.filter(m => m.type === 'due-bill');
  const debtItems = missions.filter(m => m.type === 'debt-payment');
  const completedItems = missions.filter(m => m.type === 'completed');

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col px-5 lg:px-8 py-8">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn('h-24', rounded.lg, glass.card, 'animate-pulse')} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !activeSalaryDrop) {
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

  const totalAllocated = allocations
    .filter(a => a.money_drop_id === activeSalaryDrop.id)
    .reduce((sum, a) => sum + a.total_budget, 0);

  return (
    <div key={animationKey} className="flex-1 flex flex-col overflow-hidden px-5 lg:px-8">
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 lg:py-8 overflow-hidden">

        {/* Header */}
        <header
          className="pb-4 shrink-0 lg:col-span-12 lg:pt-0 touch-none"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 20px) + 36px)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Finance</h1>
              <p className="text-sm text-white/40 mt-1">Your money, organized</p>
            </div>
            {isMock && (
              <span className={cn(
                'inline-flex items-center px-2 py-0.5 text-[10px] font-medium',
                'text-amber-300/80 bg-amber-500/10 border border-amber-500/20',
                rounded.full
              )}>
                Demo Mode
              </span>
            )}
          </motion.div>
        </header>

        {/* Main Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-32 lg:pb-8 hide-scrollbar overscroll-contain lg:col-span-12">

          {/* Top Row: Daily Budget + Drop Summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {livingWallet && (
              <DailyBudgetCard
                livingWallet={livingWallet}
                daysRemaining={daysRemaining}
                naviPosition={naviPosition}
                entranceDelay={topRowDelay}
              />
            )}

            {dropSummary && activeSalaryDrop && (
              <DropSummaryCard
                cycleName={activeSalaryDrop.name}
                startDate={activeSalaryDrop.period_start || activeSalaryDrop.date}
                endDate={activeSalaryDrop.period_end || activeSalaryDrop.date}
                totalIncome={activeSalaryDrop.amount}
                totalAllocated={totalAllocated}
                unassigned={unassignedCash}
                naviPosition={naviPosition}
                entranceDelay={topRowDelay + 0.1}
              />
            )}
          </div>

          {/* Pace Graph */}
          {livingWalletPaceData.length > 0 && (
            <div className="mb-4">
              <PaceGraph
                data={livingWalletPaceData}
                naviPosition={naviPosition}
                entranceDelay={paceDelay}
              />
            </div>
          )}

          {/* Missions Section */}
          <div className="space-y-2">
            {/* Unassigned Cash */}
            {unassignedItems.length > 0 && (
              <CollapsibleSection
                title="Unassigned Cash"
                icon={<AlertCircle size={12} className="text-amber-400" />}
                defaultOpen={true}
                entranceDelay={missionDelay}
                badge={
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-400">
                    ₱{unassignedCash.toLocaleString()}
                  </span>
                }
              >
                {unassignedItems.map((item, index) => (
                  <MissionCard
                    key={item.id}
                    item={item}
                    index={index}
                    entranceDelay={missionDelay}
                  />
                ))}
              </CollapsibleSection>
            )}

            {/* Bills Due */}
            {billItems.length > 0 && (
              <CollapsibleSection
                title="Bills Due"
                icon={<Receipt size={12} className="text-purple-400" />}
                defaultOpen={true}
                entranceDelay={missionDelay + 0.1}
                badge={
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full bg-purple-500/20 text-purple-400">
                    {billItems.length}
                  </span>
                }
              >
                {billItems.map((item, index) => (
                  <MissionCard
                    key={item.id}
                    item={item}
                    index={index}
                    entranceDelay={missionDelay + 0.1}
                    onClick={() => onPayBill?.(item.allocation)}
                  />
                ))}
              </CollapsibleSection>
            )}

            {/* Debts */}
            {debtItems.length > 0 && (
              <CollapsibleSection
                title="Debts"
                icon={<CreditCard size={12} className="text-red-400" />}
                defaultOpen={true}
                entranceDelay={missionDelay + 0.2}
                badge={
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-400">
                    {debtItems.length}
                  </span>
                }
              >
                {debtItems.map((item, index) => (
                  <MissionCard
                    key={item.id}
                    item={item}
                    index={index}
                    entranceDelay={missionDelay + 0.2}
                    onClick={() => onPayDebt?.(item.allocation)}
                  />
                ))}
              </CollapsibleSection>
            )}

            {/* Completed */}
            {completedItems.length > 0 && (
              <CollapsibleSection
                title="Completed"
                icon={<CheckCircle2 size={12} className="text-emerald-400" />}
                defaultOpen={false}
                entranceDelay={missionDelay + 0.3}
                badge={
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400">
                    {completedItems.length}
                  </span>
                }
              >
                {completedItems.map((item, index) => (
                  <MissionCard
                    key={item.id}
                    item={item}
                    index={index}
                    entranceDelay={missionDelay + 0.3}
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
