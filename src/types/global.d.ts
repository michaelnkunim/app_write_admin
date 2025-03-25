import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
    resetLoginForm?: () => void;
  }
}

export {}; 