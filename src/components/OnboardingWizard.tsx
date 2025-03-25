'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAuth } from '@/context/AuthContext';
import { FaUserTie, FaBuilding, FaHome, FaHandshake } from 'react-icons/fa';
import { BsPersonFill, BsBuilding } from 'react-icons/bs';
import EmailVerificationModal from './EmailVerificationModal';

const providerTypes = [
  {
    id: 'agent',
    title: 'Real Estate Agent',
    description: 'Licensed individual real estate professional',
    icon: FaUserTie
  },
  {
    id: 'agency',
    title: 'Real Estate Agency',
    description: 'Real estate brokerage or agency company',
    icon: FaBuilding
  },
  {
    id: 'landlord',
    title: 'Landlord',
    description: 'Property owner renting out properties',
    icon: FaHome
  },
  {
    id: 'broker',
    title: 'Property Broker',
    description: 'Independent property broker or intermediary',
    icon: FaHandshake
  },
  {
    id: 'developer',
    title: 'Property Developer',
    description: 'Individual or company that develops properties',
    icon: FaBuilding
  }
];

export default function OnboardingWizard() {
  const { setUserType } = useOnboarding();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  
  // Check if email verification modal should be shown
  useEffect(() => {
    if (user) {
      // Show verification modal if:
      // 1. User is not verified AND
      // 2. User has an email provider (not phone auth)
      const needsVerification = !!user.email && 
                               !user.emailVerified && 
                               user.providerData?.[0]?.providerId === 'password';
      
      setShowVerificationModal(needsVerification);
    }
  }, [user]);

  const steps = [
    {
      title: 'Welcome',
      description: 'Let&apos;s get started with your account setup'
    },
    {
      title: 'I am a...',
      description: 'Choose your role in the property market'
    },
    {
      title: 'Service Provider Type',
      description: 'Select your specific role as a service provider'
    }
  ];

  const handleUserTypeSelection = async (type: 'seeker' | 'provider') => {
    if (type === 'seeker') {
      await setUserType('seeker');
    } else {
      setCurrentStep(2); // Move to provider type selection
    }
  };

  const handleProviderTypeSelection = async (type: string) => {
    await setUserType('provider', type);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <BsBuilding className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-foreground">Welcome!</h2>
            <p className="mb-8 text-muted-foreground">Let&apos;s set up your account to match your needs.</p>
            <button
              onClick={() => setCurrentStep(1)}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Get Started
            </button>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <button
              onClick={() => handleUserTypeSelection('seeker')}
              className="w-full p-3 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors flex items-center space-x-2"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <BsPersonFill className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-semibold text-foreground">Property Seeker</h3>
                <p className="text-sm text-muted-foreground">Looking to rent or buy property</p>
              </div>
            </button>

            <button
              onClick={() => handleUserTypeSelection('provider')}
              className="w-full p-3 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors flex items-center space-x-2"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <BsBuilding className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-semibold text-foreground">Service Provider</h3>
                <p className="text-sm text-muted-foreground">Agent, Agency, Landlord, or Broker</p>
              </div>
            </button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {providerTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleProviderTypeSelection(type.id)}
                className="w-full p-3 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors flex items-center space-x-3"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <type.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{type.title}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </button>
            ))}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Email verification modal */}
      <EmailVerificationModal isOpen={showVerificationModal} />
      
      <div className="min-h-screen grid place-items-center bg-background p-4 -mt-30">
        <div className="w-full max-w-lg background border border-border rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">{steps[currentStep].title}</h1>
            <p className="text-muted-foreground">{steps[currentStep].description}</p>
          </div>

          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="mt-6 text-muted-foreground hover:text-foreground transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    </>
  );
} 