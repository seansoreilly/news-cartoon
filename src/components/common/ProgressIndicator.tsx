import React from 'react';
import { useLocationStore } from '../../store/locationStore';
import { useNewsStore } from '../../store/newsStore';
import { useCartoonStore } from '../../store/cartoonStore';

type Step = {
  id: number;
  label: string;
  completed: boolean;
  current: boolean;
};

const ProgressIndicator: React.FC = () => {
  const { location } = useLocationStore();
  const { news } = useNewsStore();
  const { cartoon, imagePath } = useCartoonStore();

  const articles = news?.articles || [];

  const steps: Step[] = [
    {
      id: 1,
      label: 'Set Location',
      completed: !!location,
      current: !!location && articles.length === 0
    },
    {
      id: 2,
      label: 'Select News',
      completed: articles.length > 0,
      current: articles.length > 0 && !cartoon
    },
    {
      id: 3,
      label: 'Generate Concepts',
      completed: !!cartoon,
      current: !!cartoon && !imagePath
    },
    {
      id: 4,
      label: 'Generate Cartoon',
      completed: !!imagePath,
      current: !!imagePath
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step.completed 
                  ? 'bg-purple-600 text-white' 
                  : step.current 
                    ? 'bg-blue-100 border-2 border-purple-600 text-purple-600' 
                    : 'bg-gray-200 text-gray-500'}`}
              >
                {step.completed ? '✓' : step.id}
              </div>
              <span className={`text-xs mt-1 ${step.current ? 'font-medium text-purple-600' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div 
                className={`flex-1 h-1 mx-2 ${steps[index + 1].completed || steps[index + 1].current 
                  ? 'bg-purple-600' 
                  : 'bg-gray-200'}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;
