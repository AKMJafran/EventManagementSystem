import React from 'react';

export default function StatusStepper({ currentStatus }) {
  const steps = [
    { key: 'SUBMITTED', label: 'Submitted' },
    { key: 'TREASURER', label: 'Treasurer Review' },
    { key: 'DEAN', label: 'Dean Review' },
    { key: 'ACTIVE', label: 'Active' },
  ];

  const getStepStatus = (stepKey) => {
    if (currentStatus === 'ACTIVE') return 'COMPLETED';
    if (currentStatus === 'REJECTED') {
      // If rejected, determine at which step it was rejected?
      // PENDING_TREASURER -> rejected by treasurer -> step 2 is rejected
      // PENDING_DEAN -> rejected by dean -> step 3 is rejected
      // Actually we just color everything before red
      return 'REJECTED'; 
    }
    
    switch (currentStatus) {
      case 'PENDING_TREASURER':
        if (stepKey === 'SUBMITTED') return 'COMPLETED';
        if (stepKey === 'TREASURER') return 'CURRENT';
        return 'UPCOMING';
      case 'PENDING_DEAN':
        if (stepKey === 'SUBMITTED' || stepKey === 'TREASURER') return 'COMPLETED';
        if (stepKey === 'DEAN') return 'CURRENT';
        return 'UPCOMING';
      default:
        // Assume active or unknown
        return 'COMPLETED';
    }
  };

  // Adjust rejected state to show exactly which step rejected it if possible, 
  // but for simplicity, let's just make the whole thing show red if rejected, 
  // or specifically handle rejection.
  const isRejected = currentStatus === 'REJECTED';

  return (
    <div className="flex items-center w-full max-w-2xl mx-auto my-6">
      {steps.map((step, index) => {
        const status = getStepStatus(step.key);
        let circleColor = 'bg-slate-200 text-slate-400';
        let lineColor = 'bg-slate-200';
        
        if (isRejected) {
           circleColor = 'bg-rose-500 text-white';
           lineColor = 'bg-rose-200';
        } else if (status === 'COMPLETED') {
          circleColor = 'bg-emerald-500 text-white';
          lineColor = 'bg-emerald-500';
        } else if (status === 'CURRENT') {
          circleColor = 'bg-blue-500 text-white border-4 border-blue-100';
          lineColor = 'bg-slate-200';
        }

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${circleColor}`}>
                {status === 'COMPLETED' ? (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                ) : isRejected ? (
                  <span className="material-symbols-outlined text-[18px]">close</span>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`absolute top-10 text-xs font-semibold whitespace-nowrap ${
                status === 'CURRENT' ? 'text-blue-600' : isRejected ? 'text-rose-600' : status === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded transition-colors ${lineColor}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
