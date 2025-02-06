import "./LoanCalculator.css";
import LoanJS from "loanjs";
import { useState } from "react";
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface LoanInstallment {
  installment: number;
  capital: number;
  interest: number;
  remain: number;
}

// Add type definition for input field names
type InputFieldName = "loan-amount" | "loan-term" | "interest-rate";

// Add interface for values object
interface LoanValues {
  "loan-amount": number;
  "loan-term": number;
  "interest-rate": number;
}

// Add these type definitions
type ChartDataType = {
  lineChartData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      tension: number;
    }[];
  };
  doughnutData: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
    }[];
  };
};

// Update MIN_VALUES with proper typing
const MIN_VALUES: LoanValues = {
  "loan-amount": 1000,
  "loan-term": 1,
  "interest-rate": 0,
};

// Add error state
export default function LoanCalculator() {
  const [values, setValues] = useState({
    "loan-amount": 100000,
    "loan-term": 1,
    "interest-rate": 10,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Update maxValues and MIN_VALUES with proper typing
  const maxValues: LoanValues = {
    "loan-amount": 10000000,
    "loan-term": 30,
    "interest-rate": 30,
  };

  const [installments, setInstallments] = useState<LoanInstallment[]>([]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const inputName = name as InputFieldName; // Type assertion for name
    const numValue = parseFloat(value);
    
    // Clear previous error for this field
    setErrors(prev => ({ ...prev, [inputName]: '' }));
    
    // Validate input values
    if (numValue < MIN_VALUES[inputName]) {
      setErrors(prev => ({
        ...prev,
        [inputName]: `Minimum value is ${MIN_VALUES[inputName]}`
      }));
      return;
    }
    if (numValue > maxValues[inputName]) {
      setErrors(prev => ({
        ...prev,
        [inputName]: `Maximum value is ${maxValues[inputName]}`
      }));
      return;
    }

    setValues({
      ...values,
      [inputName]: numValue,
    });
  };

  const calculate = (amount: number, years: number, rate: number) => {
    // Validate inputs before calculation
    if (amount < MIN_VALUES["loan-amount"] || 
        years < MIN_VALUES["loan-term"] || 
        rate < MIN_VALUES["interest-rate"]) {
      return;
    }

    try {
      const loan = new LoanJS.Loan(
        Math.round(amount * 100) / 100, // Round to 2 decimal places
        Math.floor(years * 12), // Ensure whole number of months
        Math.round(rate * 100) / 100 // Round interest rate to 2 decimal places
      );

      // Validate loan calculation results
      if (loan.installments && Array.isArray(loan.installments)) {
        setInstallments(loan.installments.map((inst: { installment: number; capital: number; interest: number; remain: number; }) => ({
          ...inst,
          // Ensure all monetary values are rounded to 2 decimal places
          installment: Math.round(inst.installment * 100) / 100,
          capital: Math.round(inst.capital * 100) / 100,
          interest: Math.round(inst.interest * 100) / 100,
          remain: Math.round(inst.remain * 100) / 100
        })));
      }
    } catch (error) {
      console.error('Error calculating loan:', error);
      setInstallments([]);
    }
  };

  const handleSubmit = (event: any) => {
    event.preventDefault();

    calculate(
      values["loan-amount"],
      values["loan-term"],
      values["interest-rate"]
    );
  };

  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  
  const createCalendarEvents = (installments: LoanInstallment[]) => {
    setShowDateModal(true);
  };
  const [customTitle, setCustomTitle] = useState("EMI Payment");
  
  const handleDateConfirm = () => {
    const startDate = new Date();
    startDate.setDate(selectedDay);
    startDate.setHours(10, 0, 0, 0);
    
    const eventEndDate = new Date(startDate);
    eventEndDate.setHours(11, 0, 0, 0);
    
    // Calculate the last event date
    const lastEventDate = new Date(startDate);
    lastEventDate.setMonth(lastEventDate.getMonth() + installments.length - 1);
    lastEventDate.setHours(11, 0, 0, 0);
  
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
  
    const firstEvent = {
      title: `${customTitle} - ${amountFormat(installments[0].installment)}`,
      description: 
        `Monthly Loan Payment Details:\n\n` +
        `Amount: ${amountFormat(installments[0].installment)}\n` +
        `Total Installments: ${installments.length}\n\n` +
        `Payment Schedule:\n` +
        installments.map((inst, index) => 
          `Month ${index + 1}: ${amountFormat(inst.installment)}`
        ).join('\n'),
    };
  
    const googleCalendarUrl = 
      'https://calendar.google.com/calendar/render' +
      '?action=TEMPLATE' +
      `&text=${encodeURIComponent(firstEvent.title)}` +
      `&dates=${formatDate(startDate)}/${formatDate(lastEventDate)}` +
      `&recurrence=RRULE:FREQ=MONTHLY;COUNT=${installments.length}` +
      `&details=${encodeURIComponent(firstEvent.description)}`;
  
    window.open(googleCalendarUrl, '_blank');
    setShowDateModal(false);
  };
  
  // Add this JSX before the closing </div> of the component
  
  const amountFormat = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);

    const getChartData = (): ChartDataType | null => {
      if (!installments.length) return null;

      const labels = installments.map((_, index) => `Month ${index + 1}`);
      const remainingBalance = installments.map(item => item.remain);
      const interestPaid = installments.map(item => item.interest);
      const principalPaid = installments.map(item => item.capital);

      const lineChartData = {
        labels,
        datasets: [
          {
            label: 'Remaining Balance',
            data: remainingBalance,
            borderColor: '#ffb624',
            tension: 0.1,
          },
          {
            label: 'Interest Paid',
            data: interestPaid,
            borderColor: '#ff4444',
            tension: 0.1,
          },
          {
            label: 'Principal Paid',
            data: principalPaid,
            borderColor: '#00C851',
            tension: 0.1,
          },
        ],
      };

      const totalInterest = installments.reduce((sum, i) => sum + i.interest, 0);
      const totalPrincipal = installments.reduce((sum, i) => sum + i.capital, 0);

      const doughnutData = {
        labels: ['Principal', 'Total Interest'],
        datasets: [
          {
            data: [totalPrincipal, totalInterest],
            backgroundColor: ['#00C851', '#ff4444'],
          },
        ],
      };

      return { lineChartData, doughnutData };
    };

  return (
    <div className="loan-calculator-container">
      <h1>EMI Calculator</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-item">
          <label htmlFor="loan-amount">Amount</label>
          <div className="form-input">
            <input
              type="range"
              name="loan-amount"
              min={MIN_VALUES["loan-amount"]}
              max={maxValues["loan-amount"]}
              value={values["loan-amount"]}
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="loan-amount"
              value={values["loan-amount"]}
              onChange={handleInputChange}
            />
            {errors["loan-amount"] && <div className="error-message">{errors["loan-amount"]}</div>}
          </div>
        </div>
        <div className="form-item">
          <label htmlFor="interest-rate">Interest Rate (%)</label>
          <div className="form-input">
            <input
              type="range"
              name="interest-rate"
              min="0"
              max={maxValues["interest-rate"]}
              step="0.1"
              value={values["interest-rate"]}
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="interest-rate"
              value={values["interest-rate"]}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div className="form-item">
          <label htmlFor="loan-term">Loan Term (Years)</label>
          <div className="form-input">
            <input
              type="range"
              name="loan-term"
              min="0"
              max={maxValues["loan-term"]}
              value={values["loan-term"]}
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="loan-term"
              value={values["loan-term"]}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div className="form-action">
          <input
            type="submit"
            value="Calculate"
            className="calculate-button"
          ></input>
        </div>
      </form>
  
      {!!installments?.length && (
        <div className="table-container">
          <div className="summary-card">
            <div className="summary-item">
              <span>EMI Amount</span>
              <strong>{amountFormat(installments[0].installment)}</strong>
            </div>
            <div className="summary-item">
              <span>Total Interest</span>
              <strong>{amountFormat(installments.reduce((sum, i) => sum + i.interest, 0))}</strong>
            </div>
            <div className="summary-item">
              <span>Total Payment</span>
              <strong>{amountFormat(installments.reduce((sum, i) => sum + i.installment, 0))}</strong>
            </div>
            <button 
              className="calendar-button summary-calendar-button"
              onClick={() => createCalendarEvents(installments)}
            >
              Add Schedule to Calendar
            </button>
          </div>
  
          <div className="charts-container">
            <div className="chart-item">
              <h3>Payment Breakdown</h3>
              <div className="chart-wrapper">
                {getChartData() && (
                  <Doughnut 
                    data={{
                      ...getChartData()!.doughnutData,
                      datasets: getChartData()!.doughnutData.datasets.map(dataset => ({
                        ...dataset,
                        borderWidth: 0
                      }))
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            color: '#888',
                            padding: 10,
                            usePointStyle: true,
                            boxWidth: 10,
                            font: {
                              size: 12
                            }
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </div>
            <div className="chart-item">
              <h3>Amortization Schedule</h3>
              <div className="chart-wrapper">
                {getChartData() && (
                  <Line 
                    data={getChartData()!.lineChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            color: '#888',
                            padding: 10,
                            usePointStyle: true,
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            color: '#888',
                            callback: (value) => amountFormat(value as number)
                          },
                          grid: {
                            color: '#2a3245'
                          }
                        },
                        x: {
                          ticks: {
                            color: '#888',
                            maxRotation: 45,
                            minRotation: 45
                          },
                          grid: {
                            color: '#2a3245'
                          }
                        }
                      },
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="installments-list">
            {installments.map((i: any, ind: number) => (
              <div key={ind} className="installment-item">
                <div className="installment-header">Month {ind + 1}</div>
                <div className="installment-details">
                  <div>
                    <span>EMI</span>
                    <strong>{amountFormat(i.installment)}</strong>
                  </div>
                  <div>
                    <span>Interest</span>
                    <strong>{amountFormat(i.interest)}</strong>
                  </div>
                  <div>
                    <span>Principal</span>
                    <strong>{amountFormat(i.capital)}</strong>
                  </div>
                  <div>
                    <span>Balance</span>
                    <strong>{amountFormat(i.remain)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showDateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Schedule EMI Payments</h3>
            <div className="modal-body">
              <div className="modal-input-group">
                <label>Event Title:</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Enter event title"
                />
              </div>
              <div className="modal-input-group">
                <label>Day of month for EMI payments (1-28):</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowDateModal(false)}>Cancel</button>
              <button onClick={handleDateConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
