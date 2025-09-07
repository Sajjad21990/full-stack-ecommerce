import { cn } from '@/lib/utils'
import { Check, ShoppingCart, CreditCard, Truck, CheckCircle } from 'lucide-react'

interface CheckoutStepsProps {
  currentStep: number
}

const steps = [
  {
    number: 1,
    title: 'Information',
    description: 'Contact & shipping details',
    icon: ShoppingCart
  },
  {
    number: 2,
    title: 'Shipping',
    description: 'Delivery method',
    icon: Truck
  },
  {
    number: 3,
    title: 'Payment',
    description: 'Payment details',
    icon: CreditCard
  },
  {
    number: 4,
    title: 'Complete',
    description: 'Order confirmation',
    icon: CheckCircle
  }
]

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <nav aria-label="Checkout progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isCompleted = currentStep > step.number
            const isCurrent = currentStep === step.number
            const isUpcoming = currentStep < step.number

            return (
              <li key={step.number} className="flex-1">
                <div className="flex items-center">
                  {/* Step Circle */}
                  <div className="relative flex items-center justify-center">
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                        isCompleted && "bg-green-600 border-green-600 text-white",
                        isCurrent && "border-blue-600 text-blue-600 bg-blue-50",
                        isUpcoming && "border-gray-300 text-gray-400"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="ml-4 flex-1">
                    <div
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isCompleted && "text-green-600",
                        isCurrent && "text-blue-600",
                        isUpcoming && "text-gray-500"
                      )}
                    >
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 hidden sm:block">
                      {step.description}
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden sm:block flex-1 mx-4">
                      <div
                        className={cn(
                          "h-0.5 transition-colors",
                          currentStep > step.number ? "bg-green-600" : "bg-gray-300"
                        )}
                      />
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Mobile Step Indicator */}
      <div className="sm:hidden mt-4">
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Step {currentStep} of {steps.length}</span>
          <span>{steps[currentStep - 1]?.title}</span>
        </div>
      </div>
    </div>
  )
}