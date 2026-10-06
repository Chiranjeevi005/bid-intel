'use client';

import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Send, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export type ContactCategory = 'Product Support' | 'Billing Support' | 'Procurement Help';

interface ContactFormProps {
  activeCategory?: ContactCategory;
  onCategoryChange?: (category: ContactCategory) => void;
}

export default function ContactForm({ activeCategory = 'Product Support', onCategoryChange }: ContactFormProps) {
  const [category, setCategory] = useState<ContactCategory>(activeCategory);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'email_failure' | 'network_failure'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (activeCategory) {
      setCategory(activeCategory);
    }
  }, [activeCategory]);

  const handleCategorySelect = (cat: ContactCategory) => {
    setCategory(cat);
    if (onCategoryChange) {
      onCategoryChange(cat);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Please enter your name.';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid work email address.';
    }

    if (!subject.trim()) {
      newErrors.subject = 'Please enter a subject.';
    } else if (subject.trim().length < 3) {
      newErrors.subject = 'Subject must be at least 3 characters.';
    }

    if (!message.trim()) {
      newErrors.message = 'Please describe how we can help.';
    } else if (message.trim().length < 10) {
      newErrors.message = 'Please provide a bit more detail (minimum 10 characters).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submission while already sending
    if (status === 'sending') {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          website, // Honeypot
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setStatus('success');
      } else {
        setStatus('email_failure');
        setErrorMessage(data?.error || "We couldn't send your message.");
      }
    } catch (networkErr) {
      console.error('[ContactForm] Network error sending inquiry:', networkErr);
      setStatus('network_failure');
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setWebsite('');
    setErrors({});
    setStatus('idle');
    setErrorMessage('');
  };

  // Persistent Success Confirmation State
  if (status === 'success') {
    return (
      <div className="bg-white border border-[#D9DEE5] rounded-xl p-8 md:p-10 text-center shadow-xs">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-200">
          <CheckCircle2 className="w-7 h-7" strokeWidth={2.5} />
        </div>
        <h3 className="text-[20px] font-bold text-[#111827] mb-2 tracking-tight">
          Message sent successfully.
        </h3>
        <p className="text-[14.5px] text-[#4B5563] max-w-lg mx-auto mb-8 leading-relaxed">
          Your inquiry has been sent to the RFPGround support team. We&apos;ll respond to the email address you provided (<strong>{email}</strong>).
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#3157D5] hover:bg-[#2845a9] text-white text-[13px] font-semibold rounded-sm transition-colors cursor-pointer shadow-xs"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      id="contact-form"
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-[#D9DEE5] rounded-xl p-6 md:p-8 shadow-xs space-y-5"
    >
      {/* Honeypot field (hidden from real users) */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      {/* Failure Alert State (Email Failure or Network Failure) */}
      {status === 'email_failure' && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 text-[13.5px] space-y-2">
          <div className="flex items-center gap-2 font-semibold text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>We couldn&apos;t send your message.</span>
          </div>
          <p className="text-red-700 leading-relaxed text-[13px]">
            {errorMessage || "Please try again. If the problem continues, email us directly at support@rfpground.com."}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[12.5px] font-medium rounded-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <a
              href="mailto:support@rfpground.com"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 text-red-800 hover:bg-red-100 text-[12.5px] font-medium rounded-sm transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email support@rfpground.com directly</span>
            </a>
          </div>
        </div>
      )}

      {status === 'network_failure' && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[13.5px] space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>We couldn&apos;t reach the support service.</span>
          </div>
          <p className="text-amber-700 leading-relaxed text-[13px]">
            Please check your connection and try again, or email{" "}
            <a href="mailto:support@rfpground.com" className="font-semibold underline">
              support@rfpground.com
            </a>{" "}
            directly.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[12.5px] font-medium rounded-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <a
              href="mailto:support@rfpground.com"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-[12.5px] font-medium rounded-sm transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email directly</span>
            </a>
          </div>
        </div>
      )}

      {/* Category Selection */}
      <div>
        <label className="block text-[13px] font-semibold text-[#111827] mb-2">
          Inquiry Category
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(['Product Support', 'Billing Support', 'Procurement Help'] as ContactCategory[]).map((cat) => {
            const isSelected = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`py-2 px-3 text-[12.5px] font-medium rounded-md border text-center transition-colors cursor-pointer ${isSelected
                  ? 'bg-blue-50 border-[#3157D5] text-[#3157D5] font-semibold ring-1 ring-[#3157D5]'
                  : 'bg-white border-[#D0D5DD] text-[#475467] hover:bg-gray-50'
                  }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Name and Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-[13px] font-semibold text-[#111827] mb-1.5">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="e.g. Rahul Sharma"
            className={`w-full px-3.5 py-2 text-[13px] border rounded-md bg-white text-[#111827] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 ${errors.name
              ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
              : 'border-[#D0D5DD] focus:ring-[#3157D5]/20 focus:border-[#3157D5]'
              }`}
          />
          {errors.name && (
            <p className="mt-1 text-[12px] text-red-600 font-medium">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="contact-email" className="block text-[13px] font-semibold text-[#111827] mb-1.5">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="e.g. rahul@company.com"
            className={`w-full px-3.5 py-2 text-[13px] border rounded-md bg-white text-[#111827] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 ${errors.email
              ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
              : 'border-[#D0D5DD] focus:ring-[#3157D5]/20 focus:border-[#3157D5]'
              }`}
          />
          {errors.email && (
            <p className="mt-1 text-[12px] text-red-600 font-medium">{errors.email}</p>
          )}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="contact-subject" className="block text-[13px] font-semibold text-[#111827] mb-1.5">
          Subject <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-subject"
          type="text"
          required
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
          }}
          placeholder="Brief summary of your question or request"
          className={`w-full px-3.5 py-2 text-[13px] border rounded-md bg-white text-[#111827] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 ${errors.subject
            ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
            : 'border-[#D0D5DD] focus:ring-[#3157D5]/20 focus:border-[#3157D5]'
            }`}
        />
        {errors.subject && (
          <p className="mt-1 text-[12px] text-red-600 font-medium">{errors.subject}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="block text-[13px] font-semibold text-[#111827] mb-1.5">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          rows={5}
          required
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (errors.message) setErrors((prev) => ({ ...prev, message: '' }));
          }}
          placeholder="Please describe your question or issue in detail..."
          className={`w-full px-3.5 py-2 text-[13px] border rounded-md bg-white text-[#111827] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 resize-y ${errors.message
            ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
            : 'border-[#D0D5DD] focus:ring-[#3157D5]/20 focus:border-[#3157D5]'
            }`}
        />
        {errors.message && (
          <p className="mt-1 text-[12px] text-red-600 font-medium">{errors.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[12px] text-[#6B7280]">
          Inquiries are delivered directly to <span className="font-medium text-[#111827]">support@rfpground.com</span>.
        </p>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#3157D5] hover:bg-[#2845a9] text-white text-[13px] font-semibold rounded-sm transition-colors cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === 'sending' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <span>Submit Inquiry</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
