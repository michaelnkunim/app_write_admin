'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

// Font that matches the clean, geometric style of the Appryte logo
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

// Initialize Firebase if it hasn't been initialized yet
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase if no apps exist
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export default function Home() {
  const [activeSection, setActiveSection] = useState(0);
  const sections = ['Home', 'Services', 'About', 'Contact'];
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  
  // After mounting, we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle scroll event to hide logo on mobile
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  // Slide variants for the sections
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };

  // Keep track of the slide direction
  const [[page, direction], setPage] = useState([0, 0]);

  // Navigate functions
  const paginate = (newDirection: number) => {
    let newPage = activeSection + newDirection;
    
    // Ensure we stay within bounds
    if (newPage < 0) newPage = sections.length - 1;
    if (newPage >= sections.length) newPage = 0;
    
    setPage([newPage, newDirection]);
    setActiveSection(newPage);
  };

  // Function to navigate to a specific section
  const navigateToSection = (index: number) => {
    const newDirection = index > activeSection ? 1 : -1;
    setPage([index, newDirection]);
    setActiveSection(index);
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    country: '',
    message: ''
  });
  
  const [formErrors, setFormErrors] = useState({
    name: '',
    email: '',
    message: ''
  });
  
  const [formStatus, setFormStatus] = useState({
    isSubmitting: false,
    isSubmitted: false,
    error: ''
  });
  
  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value
    });
    
    // Clear errors when user types
    if (formErrors[id as keyof typeof formErrors]) {
      setFormErrors({
        ...formErrors,
        [id as keyof typeof formErrors]: ''
      });
    }
  };
  
  // Validate form
  const validateForm = () => {
    let isValid = true;
    const errors = {
      name: '',
      email: '',
      message: ''
    };
    
    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    }
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
      isValid = false;
    }
    
    // Message validation
    if (!formData.message.trim()) {
      errors.message = 'Message is required';
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  // Submit form to Firestore
  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Set submitting state
    setFormStatus({
      ...formStatus,
      isSubmitting: true,
      error: ''
    });
    
    const saveData = {
        name: formData.name,
        email: formData.email,
        company: formData.company || null,
        country: formData.country || null,
        message: formData.message,
        createdAt: new Date()
      }
      
    try {
      // Add document to Firestore
      await addDoc(collection(db, "enquiries"), saveData);
      
      // Set success state
      setFormStatus({
        isSubmitting: false,
        isSubmitted: true,
        error: ''
      });
      
      // Clear form
      setFormData({
        name: '',
        email: '',
        company: '',
        country: '',
        message: ''
      });
    } catch (error) {
      // Set error state
      setFormStatus({
        isSubmitting: false,
        isSubmitted: false,
        error: 'Failed to submit form. Please try again.'
      });
      console.error("Error submitting form: ", error);
    }
  };

  return (
    <div className={`background mb-20 text-black dark:text-white h-screen flex flex-col ${inter.className}`}>
      {/* Navigation */}
      <nav className="p-4 md:p-6 sticky top-0 z-50 background backdrop-blur-sm transition-all duration-300 ease-in-out">
        {/* Desktop navigation */}
        <div className="hidden md:flex justify-between items-center">
          {/* Logo */}
          <div className='logo'></div>
          {/* <div className="flex items-center">
          <Image className="hidden dark:block" src="/logo.svg" alt="logo" width={150} height={60} />
          <Image className="block dark:hidden" src="/logo-dark.svg" alt="logo" width={150} height={60} />
          </div> */}
          
          {/* Navigation menu items - desktop */}
          <div className="flex items-center space-x-8">
            {sections.map((section, index) => (
              <button
                key={section}
                onClick={() => navigateToSection(index)}
                className={`text-sm font-medium relative px-1 py-1 transition-colors ${
                  activeSection === index 
                    ? 'text dark:text-white' 
                    : 'text-light dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {section}
                {activeSection === index && (
                  <motion.div 
                    className="absolute h-0.5 w-full bg-black dark:bg-white bottom-0 left-0"
                    layoutId="underline"
                  />
                )}
              </button>
            ))}
            
            {user && (
              <Link 
                href="/admin"
                className="text-sm font-medium px-1 py-1 text-primary hover:opacity-80 transition-opacity"
              >
                Admin
              </Link>
            )}
            
            {/* Theme toggle button */}
            {mounted && (
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="ml-2 p-2 rounded-full" 
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile navigation */}
        <div className="md:hidden">
          {/* Centered Logo for mobile - hidden when scrolled */}
          <div className={`flex justify-center items-center transition-all duration-400 ease-in-out ${
            scrolled ? 'max-h-0 opacity-0 scale-95 mb-0 transform' : 'max-h-20 opacity-100 scale-100 mb-4 transform'
          }`}>
            <button
              onClick={() => navigateToSection(0)}
              className="flex items-center"
              aria-label="Back to home"
            >
                {/* Replace conditional rendering with Tailwind classes */}
                {/* <Image className="hidden dark:block" src="/logo.svg" alt="logo" width={150} height={60} />
                <Image className="block invert dark:hidden dark:invert" src="/logo-dark.svg" alt="logo" width={150} height={60} /> */}

                <div className='logo'></div>
            </button>
          </div>
          
          {/* Navigation menu items - mobile */}
          <div className="flex items-center justify-center space-x-4">
            {sections.map((section, index) => (
              <button
                key={section}
                onClick={() => navigateToSection(index)}
                className={`text-xs font-medium relative px-1 py-1 transition-colors ${
                  activeSection === index 
                    ? 'text dark:text-white' 
                    : 'text-gray-800 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {section}
                {activeSection === index && (
                  <motion.div 
                    className="absolute h-0.5 w-full bg-inverse bottom-0 left-0"
                    layoutId="underlineMobile"
                  />
                )}
              </button>
            ))}
            
            {user && (
              <Link 
                href="/admin"
                className="text-xs font-medium px-1 py-1 text-primary hover:opacity-80 transition-opacity"
              >
                Admin
              </Link>
            )}
            
            {/* Theme toggle button on mobile */}
            {mounted && (
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="ml-2 p-1 rounded-full" 
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </nav>
      
      {/* Content Carousel */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="w-full h-full absolute top-0 left-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) > 100 || Math.abs(velocity.x) > 500;
              
              if (swipe) {
                const direction = offset.x < 0 ? 1 : -1;
                paginate(direction);
              }
            }}
          >
            {/* Home Section */}
            {activeSection === 0 && (
              <div className="w-full h-full flex items-center p-6 md:p-12">
                <div className="w-full max-w-5xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                      <h1 className="text-4xl text md:text-5xl font-bold mb-4 tracking-tight">
                        Software.<br />
                        Artificial Inteligence.<br />
                        Precision.
                      </h1>
                      <p className="text mb-6">
                        We design digital experiences that blend simplicity with purpose.
                      </p>
                      <div className="flex space-x-4">
                        <button 
                          onClick={() => navigateToSection(3)}
                          className="px-6 py-2 bg-primary font-medium text-sm rounded-full"
                        >
                          Get in touch
                        </button>
                        <button 
                          onClick={() => navigateToSection(1)}
                          className="px-6 py-2 text border border-gray-200 dark:border-gray-800 font-medium text-sm rounded-full"
                        >
                          Our services
                        </button>
                      </div>
                    </div>
                    <div className="relative aspect-square">
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* <svg className="w-1/2 h-1/2 text-gray-300 dark:text-gray-700" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1" />
                          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1" />
                          <circle cx="16" cy="16" r="2" stroke="currentColor" strokeWidth="1" />
                          <path d="M3 12L21 12" stroke="currentColor" strokeWidth="1" />
                          <path d="M12 3L12 21" stroke="currentColor" strokeWidth="1" />
                        </svg> */}
                      
        
                  <Image className='rounded-lg p-0' src="/billboard.png" alt="billboard" height='450' width='450'/>
          
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Services Section */}
            {activeSection === 1 && (
              <div className="w-full h-ful fle items-center xs:mt-4 p-6 md:p-12">
                <div className="w-full max-w-5xl mx-auto xs:mb-4 xs:mt-4">
                 
                  <h2 className="text-3xl text font-bold mb-4">Services</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      {
                        title: "Software Talent Outsourcing",
                        description: "Access our elite pool of software developers, designers, and product managers to extend your team and accelerate your projects."
                      },
                      {
                        title: "Software Development",
                        description: "End-to-end custom software solutions across mobile, desktop, web, and embedded systems tailored to your business needs."
                      },
                      {
                        title: "AI Workflows & Automation",
                        description: "Harness the power of AI to streamline processes, enhance productivity, and unlock new business capabilities."
                      }
                    ].map((service) => (
                      <div 
                        key={service.title}
                        className="border border-gray-200 dark:border-gray-800 p-5 rounded-lg"
                      >
                        <h3 className="font-medium text text-lg mb-2">{service.title}</h3>
                        <p className="text-light dark:text-gray-400 text-sm">{service.description}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {[
                      {
                        title: "Consulting",
                        description: "Strategic guidance on technology selection, architecture design, and digital transformation to drive innovation."
                      },
                      {
                        title: "Built & Managed Apps",
                        description: "We Build and Manage apps for your business. All our clients needs is a vision and we will make it a reality."
                      }
                    ].map((service) => (
                      <div 
                        key={service.title}
                        className="border border-gray-200 dark:border-gray-800 p-5 rounded-lg"
                      >
                        <h3 className="font-medium text text-lg mb-2">{service.title}</h3>
                        <p className="text-light dark:text-gray-400 text-sm">{service.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* About Section */}
            {activeSection === 2 && (
              <div className="w-full h-full flex items-center p-6 md:p-12">
                <div className="w-full max-w-5xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                      <h2 className="text-3xl text font-bold mb-6">About us</h2>
                      <div className="space-y-4 text-light dark:text-gray-300">
                        <p>
                          We are a team of designers and developers focused on creating minimal, 
                          functional digital experiences.
                        </p>
                        <p>
                          Our approach emphasizes clarity, simplicity, and purpose in everything we build.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-8">
                        <div>
                          <p className="text-3xl text font-bold">12+</p>
                          <p className="text-sm text-light dark:text-gray-400">Projects</p>
                        </div>
                        <div>
                          <p className="text-3xl text font-bold">8+</p>
                          <p className="text-sm text-light dark:text-gray-400">Clients</p>
                        </div>
                        <div>
                          <p className="text-3xl text font-bold">4+</p>
                          <p className="text-sm text-light dark:text-gray-400">Team members</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 p-3">
                      <div className="aspect-square bg-gray-900 dark:bg-gray-600 flex items-center justify-center text-xl font-bold">U</div>
                      <div className="aspect-square bg-gray-200 dark:bg-gray-500 flex items-center justify-center text-xl font-bold">A</div>
                      <div className="aspect-square bg-gray-200 dark:bg-gray-500 flex items-center justify-center text-xl font-bold">F</div>
                      <div className="aspect-square bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-xl font-bold">O!</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Contact Section */}
            {activeSection === 3 && (
              <div className="w-full h-full flex items-center p-6 md:p-12">
                <div className="w-full max-w-5xl mx-auto">
                  <h2 className="text-3xl text font-bold mb-8">Contact</h2>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                    <div className="md:col-span-2">
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
                        <div className="p-2">
                          <p className="text-sm text-light font-medium mb-1">Email</p>
                          <p className="text-light dark:text-gray-300 truncate">info@appryte.com</p>
                        </div>
                        <div className="p-2">
                          <p className="text-sm text-light font-medium mb-1">Phone</p>
                          <p className="text-gray-600 text-light dark:text-gray-300">+1 (555) 123-4567</p>
                        </div>
                        <div className="p-2">
                          <p className="text-sm font-medium mb-1 text-light">Location</p>
                          <p className="text-gray-600 text-light dark:text-gray-300">
                            123 Aisle Street<br />
                            San Francisco, CA 94103
                          </p>
                        </div>
                        {/* <div className="p-2">
                          <p className="text-sm font-medium mb-2">Follow us</p>
                          <div className="flex space-x-3">
                            {['T', 'L', 'I', 'G'].map((letter, i) => (
                              <a 
                                key={i}
                                href="#"
                                className="w-7 h-7 flex items-center justify-center border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors rounded-md"
                              >
                                <span className="text-xs">{letter}</span>
                              </a>
                            ))}
                          </div>
                        </div> */}
                      </div>
                    </div>
                    
                    <div className="md:col-span-3">
                    <h2 className="text-3xl text font-bold mb-6">Eqnuiries</h2>

                      {formStatus.isSubmitted ? (
                        <div className="bg-gray-700 dark:bg-fray-900/20 text-green-800 dark:text-green-200 p-4 rounded-md mb-4">
                          <p>Thank you for your message! We&apos;ll get back to you soon.</p>
                        </div>
                      ) : (
                        <form className="space-y-4" onSubmit={submitForm}>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm mb-1 text-light" htmlFor="name">Name <span className="text-red-500">*</span></label>
                              <input 
                                id="name"
                                type="text" 
                                className={`w-full py-2 px-3 background text-light border ${formErrors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'} focus:outline-none focus:border-gray-500 dark:focus:border-gray-400 text-sm rounded-md`}
                                value={formData.name}
                                onChange={handleInputChange}
                              />
                              {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
                            </div>
                            <div>
                              <label className="block text-sm mb-1 text-light" htmlFor="email">Email <span className="text-red-500">*</span></label>
                              <input 
                                id="email"
                                type="email" 
                                className={`w-full py-2 px-3 background text-light border ${formErrors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'} focus:outline-none focus:border-gray-500 dark:focus:border-gray-400 text-sm rounded-md`}
                                value={formData.email}
                                onChange={handleInputChange}
                              />
                              {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm mb-1 text-light" htmlFor="company">
                                Company <span className="text-gray-400 text-xs">(optional)</span>
                              </label>
                              <input 
                                id="company"
                                type="text" 
                                className="w-full py-2 px-3 background text-light border border-gray-200 dark:border-gray-800 focus:outline-none focus:border-gray-500 dark:focus:border-gray-400 text-sm rounded-md"
                                value={formData.company}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div>
                              <label className="block text-sm mb-1 text-light" htmlFor="country">
                                Country <span className="text-gray-400 text-xs">(optional)</span>
                              </label>
                              <input 
                                id="country"
                                type="text" 
                                className="w-full py-2 px-3 background text-light border border-gray-200 dark:border-gray-800 focus:outline-none focus:border-gray-500 dark:focus:border-gray-400 text-sm rounded-md"
                                value={formData.country}
                                onChange={handleInputChange}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm mb-1 text-light" htmlFor="message">Message <span className="text-red-500">*</span></label>
                            <textarea 
                              id="message"
                              rows={4} 
                              className={`w-full py-2 px-3 text-light background dark:bg-black border ${formErrors.message ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'} focus:outline-none focus:border-gray-500 dark:focus:border-gray-400 text-sm rounded-md`}
                              value={formData.message}
                              onChange={handleInputChange}
                            ></textarea>
                            {formErrors.message && <p className="mt-1 text-xs text-red-500">{formErrors.message}</p>}
                          </div>
                          {formStatus.error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded-md text-sm">
                              {formStatus.error}
                            </div>
                          )}
                          <button 
                            type="submit" 
                            className="w-full py-2.5 background dark:bg-white text dark:text-black font-medium text-sm rounded-md border disabled:opacity-70"
                            disabled={formStatus.isSubmitting}
                          >
                            {formStatus.isSubmitting ? 'Sending...' : 'Send message'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Pagination controls */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center md:p-2 p-2 border-t  background z-10">
        <button
          onClick={() => paginate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full"
          aria-label="Previous section"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="var(--foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        
        <div className="text-sm text">
          {activeSection + 1} / {sections.length}
        </div>
        
        <button
          onClick={() => paginate(1)}
          className="w-10 h-10 flex items-center justify-center rounded-full"
          aria-label="Next section"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 6L15 12L9 18" stroke="var(--foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
} 