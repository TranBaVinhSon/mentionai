"use client";

interface DigitalCloneSuggestedQuestionsProps {
  displayName?: string;
  questions?: string[];
  isLoading?: boolean;
  onQuestionClick?: (question: string) => void;
}

// Pool of suggested questions for digital clones
const questionPool = [
  `What does your typical workday look like?`,
  `What recent project are you most proud of?`,
  `How do you stay up to date with industry trends?`,
  `What advice would you give to someone starting out in your field?`,
  `What's the funniest mistake you've made in your career?`,
  `If you could only use one programming language for the rest of your life, which would it be and why?`,
  `What's your go-to productivity hack that actually works?`,
  `Tell me about a time when you had to learn something completely new under pressure.`,
  `What's the most ridiculous tech trend you've witnessed?`,
  `What motivates you to keep pushing forward when things get tough?`,
  `What's your biggest career achievement so far?`,
  `How do you approach problem-solving in your work?`,
  `What's a skill you're currently trying to improve?`,
  `What's the best piece of career advice you've ever received?`,
  `How do you balance work and personal life?`,
  `What's a common misconception about your field?`,
  `What tools or technologies are you most excited about right now?`,
  `How has your industry changed since you started?`,
  `What's a project you'd love to work on if you had unlimited resources?`,
  `What's the most challenging problem you've solved recently?`,
];

export function DigitalCloneSuggestedQuestions({
  displayName,
  questions,
  isLoading = false,
  onQuestionClick,
}: DigitalCloneSuggestedQuestionsProps) {
  const handleQuestionClick = (question: string) => {
    if (onQuestionClick) {
      onQuestionClick(question);
    } else {
      // Default behavior: set the question in the editor
      const editor = document.querySelector("[contenteditable]");
      if (editor) {
        editor.textContent = question;
        (editor as HTMLElement).focus();
      }
    }
  };

  return (
    <div className="w-full not-prose">
      <h3 className="text-base font-medium text-muted-foreground mb-3">
        Suggested Questions
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          {questions?.map((i, index) => (
            <div
              key={index}
              className="w-full p-2 md:p-3 rounded-lg border animate-pulse"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-muted-foreground/20 rounded-full"></div>
                </div>
                <div className="h-3 md:h-4 bg-muted-foreground/20 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {questions?.map((question, i) => (
            <div
              key={i}
              className="w-full text-left p-2 md:p-3 rounded-lg border hover:bg-accent/5 hover:border-primary/50 transition-colors group cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => handleQuestionClick(question)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleQuestionClick(question);
                }
              }}
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                </div>
                <span className="text-base text-foreground/80 group-hover:text-foreground leading-relaxed">
                  {question}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
