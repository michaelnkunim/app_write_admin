import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '@/context/AuthContext';
import { usePaystackPayment } from 'react-paystack';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { saveTransaction, updateUserBalance } from '@/lib/transactions';
import { toast } from 'sonner';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

const DEFAULT_AMOUNT = 100; // Default amount in dollars
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

export default function TopUpModal({ isOpen, onClose, onSuccess }: TopUpModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [isProcessing, setIsProcessing] = useState(false);

  const reference = `top_up_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const config = {
    reference,
    email: user?.email || '',
    amount: amount * 100, // Convert to pesewas
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(config);

  async function handleSuccess() {
    if (!user) return;
    
    try {
      setIsProcessing(true);
      
      // Save transaction with detailed information
      await saveTransaction(user.uid, {
        userId: user.uid,
        amount,
        type: 'credit',
        description: `Account top-up via Paystack (Ref: ${reference})`,
        date: new Date().toISOString(),
        status: 'completed',
        reference
      });

      // Update user balance
      await updateUserBalance(user.uid, {
        currentBalance: amount
      });

      // Call the success callback
      onSuccess(amount);
      onClose();
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  const handlePayment = () => {
    if (isProcessing) return;
    initializePayment({
      onSuccess: handleSuccess,
      onClose: () => {
        console.error('Payment failed or was cancelled');
        toast.error('Payment failed or was cancelled. Please try again.');
      }
    });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl background border shadow-xl transition-all backdrop-blur-xl">
                <div className="relative">
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isProcessing}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>

                  <div className="p-6">
                    <Dialog.Title className="text-lg font-semibold mb-4">
                      Top Up Your Account
                    </Dialog.Title>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Amount (GHS)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={amount}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-lg border background"
                          disabled={isProcessing}
                        />
                      </div>

                      <button
                        onClick={handlePayment}
                        disabled={amount <= 0 || !user?.email || isProcessing}
                        className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Processing...' : `Pay ₵${amount}`}
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 