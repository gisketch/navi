import { useMemo } from 'react';
import { useModalContext } from '../../contexts/ModalContext';
import { useFinanceData } from '../../contexts/FinanceContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useFinanceHandlers } from '../../hooks/useFinanceHandlers';
import { useTaskData } from '../../contexts/TaskContext';

import { ExpenseInputModal } from './ExpenseInputModal';
import { MoneyDropInputModal } from './MoneyDropInputModal';
import { BudgetTemplateInputModal } from './BudgetTemplateInputModal';
import { AllocationInputModal } from './AllocationInputModal';
import { DebtInputModal } from './DebtInputModal';
import { SubscriptionInputModal } from './SubscriptionInputModal';
import { PaymentModal } from './PaymentModal';
import { SettingsModal } from './SettingsModal';
import { TaskInputModal } from './TaskInputModal';
import { TaskDetailModal } from './TaskDetailModal';

import type { Allocation } from '../../utils/financeTypes';
import type { TaskFormData } from './TaskInputModal';

// ============================================
// Modal Manager
// ============================================
// Renders all application modals in one place
// Consumes ModalContext for state and useFinanceHandlers for actions

export function ModalManager() {
  const {
    modals,
    editingDebt,
    editingSubscription,
    editingAllocation,
    paymentAllocation,
    paymentType,
    editingTask,
    taskInputCategory,
    viewingTask,
    closeModal,
    closeDebtModal,
    closeSubscriptionModal,
    closeAllocationModal,
    closeMoneyDropModal,
    closePaymentModal,
    closeTaskInputModal,
    closeTaskDetailModal,
    openTaskInput,
  } = useModalContext();

  const {
    livingWallet,
    playWallet,
    moneyDrops,
    activeDrops,
    budgetTemplates,
  } = useFinanceData();

  const {
    createTask,
    updateTask,
    startTask,
    pauseTask,
    completeTask,
    deleteTask,
  } = useTaskData();

  const settings = useSettings();

  const {
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
  } = useFinanceHandlers();

  // Get active wallets for expense modal (memoized to prevent re-renders)
  const activeWallets = useMemo(
    () => [livingWallet, playWallet].filter(Boolean) as Allocation[],
    [livingWallet, playWallet]
  );

  return (
    <>
      {/* Expense input modal */}
      <ExpenseInputModal
        isOpen={modals.expense}
        onClose={() => closeModal('expense')}
        onSubmit={handleExpenseSubmit}
        wallets={activeWallets}
      />

      {/* Money Drop input modal */}
      <MoneyDropInputModal
        isOpen={modals.moneyDrop}
        onClose={closeMoneyDropModal}
        onSubmit={handleMoneyDropSubmit}
        budgetTemplates={budgetTemplates}
      />

      {/* Budget Template input modal */}
      <BudgetTemplateInputModal
        isOpen={modals.template}
        onClose={() => closeModal('template')}
        onSubmit={handleTemplateSubmit}
      />

      {/* Allocation input modal */}
      <AllocationInputModal
        isOpen={modals.allocation}
        onClose={closeAllocationModal}
        onSubmit={handleAllocationSubmit}
        onDelete={handleAllocationDelete}
        moneyDrops={moneyDrops}
        initialData={editingAllocation}
      />

      {/* Debt input modal */}
      <DebtInputModal
        isOpen={modals.debt}
        onClose={closeDebtModal}
        onSubmit={handleDebtSubmit}
        onDelete={handleDebtDelete}
        activeDrops={activeDrops}
        editData={editingDebt}
      />

      {/* Subscription input modal */}
      <SubscriptionInputModal
        isOpen={modals.subscription}
        onClose={closeSubscriptionModal}
        onSubmit={handleSubscriptionSubmit}
        onDelete={handleSubscriptionDelete}
        activeDrops={activeDrops}
        editData={editingSubscription}
      />

      {/* Payment modal */}
      <PaymentModal
        isOpen={modals.payment}
        onClose={closePaymentModal}
        allocation={paymentAllocation}
        allocationType={paymentType}
        onSubmit={handlePaymentSubmit}
      />

      {/* Settings modal */}
      <SettingsModal
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
        apiKey={settings.apiKey}
        onApiKeyChange={settings.setApiKey}
        systemInstruction={settings.systemInstruction}
        onSystemInstructionChange={settings.setSystemInstruction}
        micMode={settings.micMode}
        onMicModeChange={settings.setMicMode}
        naviBrainWebhook={settings.naviBrainWebhook}
        onNaviBrainWebhookChange={settings.setNaviBrainWebhook}
        voiceName={settings.voiceName}
        onVoiceNameChange={settings.setVoiceName}
        receiveNoteContent={settings.receiveNoteContent}
        onReceiveNoteContentChange={settings.setReceiveNoteContent}
        onSave={() => {}}
      />

      {/* Task Input Modal */}
      <TaskInputModal
        isOpen={modals.taskInput}
        onClose={closeTaskInputModal}
        onSubmit={async (data: TaskFormData) => {
          if (editingTask) {
            await updateTask(editingTask.id, data);
          } else {
            await createTask(data);
          }
        }}
        initialCategory={taskInputCategory}
        editTask={editingTask}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={modals.taskDetail}
        onClose={closeTaskDetailModal}
        task={viewingTask}
        onStart={() => viewingTask && startTask(viewingTask.id)}
        onPause={() => viewingTask && pauseTask(viewingTask.id)}
        onComplete={() => viewingTask && completeTask(viewingTask.id)}
        onEdit={() => {
          if (viewingTask) {
            closeTaskDetailModal();
            openTaskInput(viewingTask.category, viewingTask);
          }
        }}
        onDelete={() => viewingTask && deleteTask(viewingTask.id)}
      />
    </>
  );
}
