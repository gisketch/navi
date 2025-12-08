import { useCallback } from 'react';
import { useFinanceData } from '../contexts/FinanceContext';
import { useModalContext } from '../contexts/ModalContext';
import { useToast } from '../components/Toast';
import type { Allocation } from '../utils/financeTypes';
import type { ExpenseData } from '../components/modals/ExpenseInputModal';
import type { MoneyDropData } from '../components/modals/MoneyDropInputModal';
import type { DebtData } from '../components/modals/DebtInputModal';
import type { SubscriptionData } from '../components/modals/SubscriptionInputModal';

// ============================================
// Finance Handlers Hook
// ============================================
// Encapsulates all finance CRUD operations with toast notifications
// Extracted from App.tsx for better separation of concerns

export interface FinanceHandlers {
  // Money Drop
  handleMoneyDropSubmit: (data: MoneyDropData) => Promise<void>;
  
  // Template (local only)
  handleTemplateSubmit: (data: { name: string; allocation_rules: Record<string, number> }) => Promise<void>;
  
  // Allocation
  handleAllocationSubmit: (data: Partial<Allocation>) => Promise<void>;
  handleAllocationDelete: (id: string) => Promise<void>;
  
  // Expense (Transaction)
  handleExpenseSubmit: (data: ExpenseData) => Promise<void>;
  
  // Debt
  handleDebtSubmit: (data: DebtData) => Promise<void>;
  handleDebtDelete: (id: string) => Promise<void>;
  
  // Subscription
  handleSubscriptionSubmit: (data: SubscriptionData) => Promise<void>;
  handleSubscriptionDelete: (id: string) => Promise<void>;
  
  // Payment
  handlePaymentSubmit: (amount: number, note?: string) => Promise<void>;
}

export function useFinanceHandlers(): FinanceHandlers {
  const { showToast } = useToast();
  const {
    createTransaction,
    createMoneyDrop,
    createAllocation,
    createDebt,
    createSubscription,
    updateDebt,
    updateSubscription,
    updateAllocation,
    deleteDebt,
    deleteSubscription,
    deleteAllocation,
  } = useFinanceData();

  const {
    paymentAllocation,
    closeModal,
    closeDebtModal,
    closeSubscriptionModal,
    closeAllocationModal,
    closeMoneyDropModal,
    closePaymentModal,
  } = useModalContext();

  // ============================================
  // Money Drop Handler
  // ============================================
  const handleMoneyDropSubmit = useCallback(async (data: MoneyDropData) => {
    try {
      await createMoneyDrop({
        name: data.name,
        amount: data.amount,
        date: data.date,
        is_received: data.is_received,
        type: data.type,
        period_start: data.period_start,
        period_end: data.period_end,
      });
      showToast(`${data.type === 'salary' ? 'Salary' : 'Extra'} drop created!`, 'success');
      closeMoneyDropModal();
    } catch (err) {
      console.error('[Finance] Failed to create money drop:', err);
      showToast('Failed to create money drop', 'error');
    }
  }, [createMoneyDrop, showToast, closeMoneyDropModal]);

  // ============================================
  // Template Handler (Local only)
  // ============================================
  const handleTemplateSubmit = useCallback(async (_data: { name: string; allocation_rules: Record<string, number> }) => {
    // Templates are local-only for now (could store in localStorage or PocketBase later)
    showToast('Template saved!', 'success');
    closeModal('template');
  }, [showToast, closeModal]);

  // ============================================
  // Allocation Handlers
  // ============================================
  const handleAllocationSubmit = useCallback(async (data: Partial<Allocation>) => {
    try {
      if (data.id) {
        // Update existing allocation
        await updateAllocation(data.id, {
          name: data.name || 'Allocation',
          icon: data.icon || 'wallet',
          category: data.category || 'living',
          total_budget: data.total_budget || 0,
          current_balance: data.current_balance ?? data.total_budget ?? 0,
          is_strict: data.is_strict || false,
          color: data.color || 'emerald',
          money_drop_id: data.money_drop_id || '',
          daily_limit: data.daily_limit,
        });
        showToast(`Allocation "${data.name}" updated`, 'success');
      } else {
        // Create new allocation
        await createAllocation({
          name: data.name || 'New Allocation',
          icon: data.icon || 'wallet',
          category: data.category || 'living',
          total_budget: data.total_budget || 0,
          current_balance: data.total_budget || 0, // Start with full budget
          is_strict: data.is_strict || false,
          color: data.color || 'emerald',
          money_drop_id: data.money_drop_id || '',
          daily_limit: data.daily_limit,
        });
        showToast('Allocation created!', 'success');
      }
      closeAllocationModal();
    } catch (err) {
      console.error('[Finance] Failed to save allocation:', err);
      showToast(data.id ? 'Failed to update allocation' : 'Failed to create allocation', 'error');
    }
  }, [createAllocation, updateAllocation, showToast, closeAllocationModal]);

  const handleAllocationDelete = useCallback(async (id: string) => {
    try {
      await deleteAllocation(id);
      showToast('Allocation deleted', 'success');
      closeAllocationModal();
    } catch (err) {
      console.error('[Finance] Failed to delete allocation:', err);
      showToast('Failed to delete allocation', 'error');
    }
  }, [deleteAllocation, showToast, closeAllocationModal]);

  // ============================================
  // Expense Handler
  // ============================================
  const handleExpenseSubmit = useCallback(async (data: ExpenseData) => {
    try {
      await createTransaction({
        amount: data.amount,
        description: data.description || 'Expense',
        timestamp: new Date().toISOString(),
        allocation_id: data.allocation_id,
        type: 'expense',
      });
      showToast(`Logged ₱${data.amount.toLocaleString()}`, 'success');
      closeModal('expense');
    } catch (err) {
      console.error('[Finance] Failed to log expense:', err);
      showToast('Failed to log expense', 'error');
    }
  }, [createTransaction, showToast, closeModal]);

  // ============================================
  // Debt Handlers
  // ============================================
  const handleDebtSubmit = useCallback(async (data: DebtData) => {
    try {
      if (data.id) {
        // Update existing debt
        await updateDebt(data.id, {
          name: data.name,
          total_amount: data.total_amount,
          remaining_amount: data.remaining_amount,
          priority: data.priority,
          due_date: data.due_date,
          notes: data.notes,
        });
        showToast(`Debt "${data.name}" updated`, 'success');
      } else {
        // Create new debt
        const debt = await createDebt({
          name: data.name,
          total_amount: data.total_amount,
          remaining_amount: data.remaining_amount,
          priority: data.priority,
          due_date: data.due_date,
          notes: data.notes,
        });
        
        // If linked to money drop and create_allocation is true, create the allocation
        if (data.money_drop_id && data.create_allocation) {
          await createAllocation({
            name: `${data.name} Payment`,
            icon: 'credit-card',
            category: 'debt',
            total_budget: data.remaining_amount,
            current_balance: data.remaining_amount,
            is_strict: false,
            color: 'red',
            money_drop_id: data.money_drop_id,
            linked_debt_id: debt.id,
          });
        }
        showToast(`Debt "${data.name}" added`, 'success');
      }
      closeDebtModal();
    } catch (err) {
      console.error('[Finance] Failed to save debt:', err);
      showToast('Failed to save debt', 'error');
    }
  }, [createDebt, updateDebt, createAllocation, showToast, closeDebtModal]);

  const handleDebtDelete = useCallback(async (id: string) => {
    try {
      await deleteDebt(id);
      showToast('Debt deleted', 'success');
      closeDebtModal();
    } catch (err) {
      console.error('[Finance] Failed to delete debt:', err);
      showToast('Failed to delete debt', 'error');
    }
  }, [deleteDebt, showToast, closeDebtModal]);

  // ============================================
  // Subscription Handlers
  // ============================================
  const handleSubscriptionSubmit = useCallback(async (data: SubscriptionData) => {
    try {
      if (data.id) {
        // Update existing subscription
        await updateSubscription(data.id, {
          name: data.name,
          amount: data.amount,
          billing_day: data.billing_day,
          category: data.category,
          is_active: data.is_active,
          end_on_date: data.end_on_date || null,
        });
        showToast(`"${data.name}" updated`, 'success');
      } else {
        // Create new subscription
        const subscription = await createSubscription({
          name: data.name,
          amount: data.amount,
          billing_day: data.billing_day,
          category: data.category,
          is_active: data.is_active,
          end_on_date: data.end_on_date || null,
        });
        
        // If linked to money drop and create_allocation is true, create the allocation
        if (data.money_drop_id && data.create_allocation) {
          await createAllocation({
            name: `${data.name} Bill`,
            icon: 'receipt',
            category: 'bills',
            total_budget: data.amount,
            current_balance: data.amount,
            is_strict: true,
            color: 'purple',
            money_drop_id: data.money_drop_id,
            linked_subscription_id: subscription.id,
          });
        }
        showToast(`"${data.name}" subscription added`, 'success');
      }
      closeSubscriptionModal();
    } catch (err) {
      console.error('[Finance] Failed to save subscription:', err);
      showToast('Failed to save subscription', 'error');
    }
  }, [createSubscription, updateSubscription, createAllocation, showToast, closeSubscriptionModal]);

  const handleSubscriptionDelete = useCallback(async (id: string) => {
    try {
      await deleteSubscription(id);
      showToast('Subscription deleted', 'success');
      closeSubscriptionModal();
    } catch (err) {
      console.error('[Finance] Failed to delete subscription:', err);
      showToast('Failed to delete subscription', 'error');
    }
  }, [deleteSubscription, showToast, closeSubscriptionModal]);

  // ============================================
  // Payment Handler
  // ============================================
  const handlePaymentSubmit = useCallback(async (amount: number, note?: string) => {
    if (!paymentAllocation) return;
    
    try {
      // Create transaction for the payment
      await createTransaction({
        amount,
        description: note || `Payment for ${paymentAllocation.name}`,
        timestamp: new Date().toISOString(),
        allocation_id: paymentAllocation.id,
        type: 'payment',
      });
      
      // Update allocation balance
      const newBalance = paymentAllocation.current_balance - amount;
      await updateAllocation(paymentAllocation.id, {
        current_balance: Math.max(0, newBalance),
      });
      
      showToast(`Payment of ₱${amount.toLocaleString()} recorded`, 'success');
      closePaymentModal();
    } catch (err) {
      console.error('[Finance] Failed to record payment:', err);
      showToast('Failed to record payment', 'error');
    }
  }, [paymentAllocation, createTransaction, updateAllocation, showToast, closePaymentModal]);

  return {
    handleMoneyDropSubmit,
    handleTemplateSubmit,
    handleAllocationSubmit,
    handleAllocationDelete,
    handleExpenseSubmit,
    handleDebtSubmit,
    handleDebtDelete,
    handleSubscriptionSubmit,
    handleSubscriptionDelete,
    handlePaymentSubmit,
  };
}
