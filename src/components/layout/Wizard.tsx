import React from 'react';

interface WizardProps {
  steps: string[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode[];
  canGoNext?: boolean;
  canGoPrevious?: boolean;
}

const Wizard: React.FC<WizardProps> = ({
  steps,
  currentStep,
  onStepChange,
  children,
  canGoNext = true,
  canGoPrevious = true,
}) => {
  const goToNextStep = () => {
    if (canGoNext && currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (canGoPrevious && currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  // Ensure children is an array for consistent access
  const childrenArray = React.Children.toArray(children);

  return (
    <div className="wizard-container">
      <div className="wizard-header flex items-center justify-center mb-4 md:mb-6">
        {/* Mobile Step Indicator */}
        <div className="md:hidden text-lg font-semibold text-gray-700">
          Step {currentStep + 1} of {steps.length}
        </div>

        {/* Desktop Step Indicator */}
        <div className="hidden md:flex md:justify-center md:items-center w-full">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <div
                className={`wizard-step relative flex items-center text-sm font-medium px-4 py-2 rounded-full transition-all duration-300
                  ${index === currentStep ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500'}
                  ${index < currentStep ? 'bg-purple-100 text-purple-700' : ''}`}
              >
                {index < currentStep && (
                  <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
                {step}
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 md:mx-4 ${index < currentStep ? 'bg-purple-400' : 'bg-gray-300'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="wizard-content">{childrenArray[currentStep]}</div>
      <div className="wizard-navigation">
        <button onClick={goToPreviousStep} disabled={currentStep === 0 || !canGoPrevious} className="min-h-[44px] min-w-[44px] touch-action-manipulation">
          Previous
        </button>
        <button onClick={goToNextStep} disabled={currentStep === steps.length - 1 || !canGoNext} className="min-h-[44px] min-w-[44px] touch-action-manipulation">
          Next
        </button>
      </div>
    </div>
  );
};

export default Wizard;