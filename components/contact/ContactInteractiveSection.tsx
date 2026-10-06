'use client';

import React, { useState } from 'react';
import { FileQuestion, CreditCard, Sparkles, ArrowRight } from 'lucide-react';
import ContactForm, { ContactCategory } from './ContactForm';

export default function ContactInteractiveSection() {
  const [activeCategory, setActiveCategory] = useState<ContactCategory>('Product Support');

  const handleSelectCategory = (cat: ContactCategory) => {
    setActiveCategory(cat);
    const formElement = document.getElementById('contact-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-12">
      {/* Specialized Support Categories */}
      <div>
        <div className="mb-5">
          <h2 className="text-[18px] font-bold text-[#111827] tracking-tight">
            Support Categories
          </h2>
          <p className="text-[13px] text-[#6B7280]">
            Select a category below to route your inquiry directly to our team:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-2 text-[#3157D5]">
                <FileQuestion className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold text-[#111827]">Product Support</h3>
              </div>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                Account access, document uploads, analysis status, and platform feature questions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F2F4F7]">
              <button
                type="button"
                onClick={() => handleSelectCategory('Product Support')}
                className="text-[12.5px] font-semibold text-[#3157D5] hover:text-[#2544a8] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Contact Product Support</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-2 text-[#3157D5]">
                <CreditCard className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold text-[#111827]">Billing Support</h3>
              </div>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                Subscription renewals, plan upgrades, invoices, payment questions, and billing resolution assistance.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F2F4F7]">
              <button
                type="button"
                onClick={() => handleSelectCategory('Billing Support')}
                className="text-[12.5px] font-semibold text-[#3157D5] hover:text-[#2544a8] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Contact Billing Support</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-2 text-[#3157D5]">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-[14px] font-semibold text-[#111827]">Procurement Assistance</h3>
              </div>
              <p className="text-[13px] text-[#4B5563] leading-relaxed">
                Guidance on applying RFPGround for pre-bid tender qualification and contractual risk evaluation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F2F4F7]">
              <button
                type="button"
                onClick={() => handleSelectCategory('Procurement Help')}
                className="text-[12.5px] font-semibold text-[#3157D5] hover:text-[#2544a8] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Contact Procurement Desk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Online Form Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-[18px] font-bold text-[#111827] tracking-tight">
            Send an Online Message
          </h2>
          <p className="text-[13px] text-[#6B7280]">
            Submit your inquiry directly through our customer support desk:
          </p>
        </div>

        <ContactForm
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>
    </div>
  );
}
