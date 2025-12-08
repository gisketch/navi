import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { Allocation, Debt, Subscription, MoneyDrop, Transaction } from '../utils/financeTypes';

// ============================================
// Modal Context
// ============================================
// Manages all modal visibility states and editing entities

// Modal identifiers
export type ModalType = 
  | 'settings'
  | 'expense'
  | 'moneyDrop'
  | 'template'
  | 'allocation'
  | 'debt'
  | 'subscription'
  | 'payment';

interface ModalState {
  settings: boolean;
  expense: boolean;
  moneyDrop: boolean;
  template: boolean;
  allocation: boolean;
  debt: boolean;
  subscription: boolean;
  payment: boolean;
}

interface ModalContextType {
  // Modal visibility state
  modals: ModalState;
  
  // Editing entities (for edit mode in modals)
  editingDebt: Debt | null;
  editingSubscription: Subscription | null;
  editingAllocation: Allocation | null;
  editingMoneyDrop: MoneyDrop | null;
  editingTransaction: Transaction | null;
  
  // Payment modal specific state
  paymentAllocation: Allocation | null;
  paymentType: 'bill' | 'debt';
  
  // Generic modal actions
  openModal: (modal: ModalType) => void;
  closeModal: (modal: ModalType) => void;
  closeAllModals: () => void;
  
  // Entity-specific edit actions
  openEditDebt: (debt: Debt) => void;
  openEditSubscription: (subscription: Subscription) => void;
  openEditAllocation: (allocation: Allocation) => void;
  openEditMoneyDrop: (drop: MoneyDrop) => void;
  openEditTransaction: (transaction: Transaction) => void;
  
  // Payment modal actions
  openPayment: (allocation: Allocation, type: 'bill' | 'debt') => void;
  
  // Close with cleanup
  closeDebtModal: () => void;
  closeSubscriptionModal: () => void;
  closeAllocationModal: () => void;
  closeMoneyDropModal: () => void;
  closePaymentModal: () => void;
}

const defaultModalState: ModalState = {
  settings: false,
  expense: false,
  moneyDrop: false,
  template: false,
  allocation: false,
  debt: false,
  subscription: false,
  payment: false,
};

const ModalContext = createContext<ModalContextType | null>(null);

export function useModalContext(): ModalContextType {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return context;
}

interface ModalProviderProps {
  children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  // Modal visibility state
  const [modals, setModals] = useState<ModalState>(defaultModalState);
  
  // Editing entities
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [editingMoneyDrop, setEditingMoneyDrop] = useState<MoneyDrop | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Payment modal state
  const [paymentAllocation, setPaymentAllocation] = useState<Allocation | null>(null);
  const [paymentType, setPaymentType] = useState<'bill' | 'debt'>('bill');

  // Generic modal actions
  const openModal = useCallback((modal: ModalType) => {
    setModals(prev => ({ ...prev, [modal]: true }));
  }, []);

  const closeModal = useCallback((modal: ModalType) => {
    setModals(prev => ({ ...prev, [modal]: false }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals(defaultModalState);
    setEditingDebt(null);
    setEditingSubscription(null);
    setEditingAllocation(null);
    setEditingMoneyDrop(null);
    setEditingTransaction(null);
    setPaymentAllocation(null);
  }, []);

  // Entity-specific edit actions
  const openEditDebt = useCallback((debt: Debt) => {
    setEditingDebt(debt);
    setModals(prev => ({ ...prev, debt: true }));
  }, []);

  const openEditSubscription = useCallback((subscription: Subscription) => {
    setEditingSubscription(subscription);
    setModals(prev => ({ ...prev, subscription: true }));
  }, []);

  const openEditAllocation = useCallback((allocation: Allocation) => {
    setEditingAllocation(allocation);
    setModals(prev => ({ ...prev, allocation: true }));
  }, []);

  const openEditMoneyDrop = useCallback((drop: MoneyDrop) => {
    setEditingMoneyDrop(drop);
    setModals(prev => ({ ...prev, moneyDrop: true }));
  }, []);

  const openEditTransaction = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    // TODO: Add transaction edit modal when implemented
    console.log('Edit transaction:', transaction);
  }, []);

  // Payment modal actions
  const openPayment = useCallback((allocation: Allocation, type: 'bill' | 'debt') => {
    setPaymentAllocation(allocation);
    setPaymentType(type);
    setModals(prev => ({ ...prev, payment: true }));
  }, []);

  // Close with cleanup actions
  const closeDebtModal = useCallback(() => {
    setModals(prev => ({ ...prev, debt: false }));
    setEditingDebt(null);
  }, []);

  const closeSubscriptionModal = useCallback(() => {
    setModals(prev => ({ ...prev, subscription: false }));
    setEditingSubscription(null);
  }, []);

  const closeAllocationModal = useCallback(() => {
    setModals(prev => ({ ...prev, allocation: false }));
    setEditingAllocation(null);
  }, []);

  const closeMoneyDropModal = useCallback(() => {
    setModals(prev => ({ ...prev, moneyDrop: false }));
    setEditingMoneyDrop(null);
  }, []);

  const closePaymentModal = useCallback(() => {
    setModals(prev => ({ ...prev, payment: false }));
    setPaymentAllocation(null);
  }, []);

  const value = useMemo<ModalContextType>(() => ({
    // State
    modals,
    editingDebt,
    editingSubscription,
    editingAllocation,
    editingMoneyDrop,
    editingTransaction,
    paymentAllocation,
    paymentType,
    
    // Generic actions
    openModal,
    closeModal,
    closeAllModals,
    
    // Entity-specific actions
    openEditDebt,
    openEditSubscription,
    openEditAllocation,
    openEditMoneyDrop,
    openEditTransaction,
    openPayment,
    
    // Close with cleanup
    closeDebtModal,
    closeSubscriptionModal,
    closeAllocationModal,
    closeMoneyDropModal,
    closePaymentModal,
  }), [
    modals,
    editingDebt,
    editingSubscription,
    editingAllocation,
    editingMoneyDrop,
    editingTransaction,
    paymentAllocation,
    paymentType,
    openModal,
    closeModal,
    closeAllModals,
    openEditDebt,
    openEditSubscription,
    openEditAllocation,
    openEditMoneyDrop,
    openEditTransaction,
    openPayment,
    closeDebtModal,
    closeSubscriptionModal,
    closeAllocationModal,
    closeMoneyDropModal,
    closePaymentModal,
  ]);

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}
