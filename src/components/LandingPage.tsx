import React, { useState } from 'react';

interface LandingPageProps {
  onStartLearning: () => void;
  onSelectPersona: (persona: 'student' | 'teacher' | 'admin') => void;
  onAuthTrigger?: (mode: 'login' | 'register') => void;
  theme?: 'light' | 'dark';
  setTheme?: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
}

export default function LandingPage({ onStartLearning, onSelectPersona, onAuthTrigger, theme: propTheme, setTheme: propSetTheme }: LandingPageProps) {
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>('light');
  const theme = propTheme || localTheme;
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    if (propSetTheme) {
      propSetTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    } else {
      setLocalTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    }
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 selection:bg-emerald-500 selection:text-white ${
        isDark ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-800'
      }`}
      id="landing-container"
    >
      {/* Header */}
      <header
        className={`border-b sticky top-0 z-40 transition-colors duration-200 ${
          isDark ? 'bg-slate-950/90 border-slate-900' : 'bg-white/90 border-slate-100'
        } backdrop-blur-md`}
        id="landing-header"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold tracking-tight text-emerald-600">
              OOP Pedagogical Hub
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a
              href="#features"
              className={`transition-colors ${isDark ? 'hover:text-emerald-400 text-slate-400' : 'hover:text-emerald-600 text-slate-600'}`}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className={`transition-colors ${isDark ? 'hover:text-emerald-400 text-slate-400' : 'hover:text-emerald-600 text-slate-600'}`}
            >
              Methodology
            </a>
            <a
              href="#preview"
              className={`transition-colors ${isDark ? 'hover:text-emerald-400 text-slate-400' : 'hover:text-emerald-600 text-slate-600'}`}
            >
              Preview
            </a>
            <a
              href="#target-users"
              className={`transition-colors ${isDark ? 'hover:text-emerald-400 text-slate-400' : 'hover:text-emerald-600 text-slate-600'}`}
            >
              Roles
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`text-xs font-mono px-3 py-1.5 border rounded-md transition-colors ${
                isDark
                  ? 'border-slate-800 text-slate-450 hover:bg-slate-900 hover:text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              aria-label="Toggle Theme"
            >
              {isDark ? 'LIGHT MODE' : 'DARK MODE'}
            </button>
            <button
              onClick={() => onAuthTrigger?.('login')}
              className={`text-sm font-medium transition-colors ${
                isDark ? 'text-slate-300 hover:text-emerald-400' : 'text-slate-600 hover:text-emerald-650'
              }`}
            >
              Sign In
            </button>
            <button
              id="landing-student-cta"
              onClick={() => onAuthTrigger?.('register')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32" id="landing-hero-section">
        {/* Subtle background faint code text */}
        <div
          className={`absolute inset-0 font-mono text-[10px] leading-relaxed opacity-[0.03] select-none pointer-events-none ${
            isDark ? 'text-slate-100' : 'text-slate-900'
          } overflow-hidden`}
        >
          <div className="absolute top-10 left-10 w-full max-w-lg space-y-1">
            <p>class Vehicle &#123;</p>
            <p className="pl-4">protected String brand;</p>
            <p className="pl-4">public Vehicle(String brand) &#123;</p>
            <p className="pl-8">this.brand = brand;</p>
            <p className="pl-4">&#125;</p>
            <p>&#125;</p>
            <p>class Car extends Vehicle &#123;</p>
            <p className="pl-4">private int doors;</p>
            <p className="pl-4">public Car(String brand, int doors) &#123;</p>
            <p className="pl-8">super(brand);</p>
            <p className="pl-8">this.doors = doors;</p>
            <p className="pl-4">&#125;</p>
            <p>&#125;</p>
          </div>
          <div className="absolute bottom-10 right-10 w-full max-w-lg space-y-1 text-right">
            <p>@Override</p>
            <p>public void displayInfo() &#123;</p>
            <p>System.out.println("Brand: " + brand + ", Doors: " + doors);</p>
            <p>&#125;</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center space-y-8">
          <h1
            className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
            id="hero-title"
          >
            Master Object-Oriented Programming through real practice
          </h1>
          <p className={`text-base sm:text-lg max-w-2xl mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Watch lessons, take quizzes, and practice coding in one system. Accelerate your understanding of inheritance, encapsulation, and polymorphism.
          </p>

          <div className="flex justify-center items-center gap-4 pt-4">
            <button
              id="hero-go-learning"
              onClick={() => onAuthTrigger?.('register')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-md text-sm transition-colors shadow-sm"
            >
              Get Started
            </button>
            <button
              id="hero-explore-shortcut"
              onClick={() => {
                const el = document.getElementById('features');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`border font-medium px-6 py-3 rounded-md text-sm transition-colors ${
                isDark
                  ? 'border-slate-800 text-slate-350 hover:bg-slate-900 hover:text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              View Courses
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        className={`py-20 border-t ${isDark ? 'bg-slate-950 border-slate-900' : 'bg-slate-50 border-slate-100'}`}
        id="features"
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Key Platform Pillars
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Everything you need to conceptualize, compile, and master object-oriented hierarchies.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div
              className={`p-8 rounded-lg border transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Video Lessons
              </h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Access structured lessons designed to break down inheritance, encapsulation, polymorphism, and dynamic constructor delegation rules in detail.
              </p>
            </div>

            <div
              className={`p-8 rounded-lg border transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Quizzes
              </h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Verify your conceptual knowledge with targeted evaluations that test subclass boundaries, override rules, dynamic virtual-method tables, and diagnostics.
              </p>
            </div>

            <div
              className={`p-8 rounded-lg border transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Practice IDE
              </h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Write, compile, and execute code directly in your browser. Receive instant feedback and tailored recommendations to correct compilation errors immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20" id="how-it-works">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              The Learning Loop
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Follow a straightforward sequence to master programming architectures.
            </p>
          </div>

          <div
            className={`border rounded-lg p-6 sm:p-10 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div className="space-y-1">
                <span className="text-xs font-mono text-emerald-600 block uppercase font-bold tracking-widest">
                  Step 1
                </span>
                <span className={`text-base font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Watch Lesson
                </span>
              </div>

              <div className={`hidden sm:block text-xl ${isDark ? 'text-slate-700' : 'text-slate-350'}`}>→</div>

              <div className="space-y-1">
                <span className="text-xs font-mono text-emerald-600 block uppercase font-bold tracking-widest">
                  Step 2
                </span>
                <span className={`text-base font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Take Quiz
                </span>
              </div>

              <div className={`hidden sm:block text-xl ${isDark ? 'text-slate-700' : 'text-slate-350'}`}>→</div>

              <div className="space-y-1">
                <span className="text-xs font-mono text-emerald-600 block uppercase font-bold tracking-widest">
                  Step 3
                </span>
                <span className={`text-base font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Practice Coding
                </span>
              </div>

              <div className={`hidden sm:block text-xl ${isDark ? 'text-slate-700' : 'text-slate-350'}`}>→</div>

              <div className="space-y-1">
                <span className="text-xs font-mono text-emerald-600 block uppercase font-bold tracking-widest">
                  Step 4
                </span>
                <span className={`text-base font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Track Progress
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section
        className={`py-20 border-t border-b ${isDark ? 'bg-slate-950 border-slate-900' : 'bg-slate-50 border-slate-100'}`}
        id="preview"
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              System Dashboard Wireframe
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              A minimalist, wireframe-style blueprint of the active learning platform workspace.
            </p>
          </div>

          <div
            className={`border rounded-lg overflow-hidden font-mono text-xs shadow-sm ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Mock Header Bar */}
            <div className={`border-b px-4 py-3 flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
              <span>[WORKSPACE_BLUEPRINT]</span>
              <span className="text-emerald-600 font-bold">● ACTIVE</span>
            </div>

            <div className="grid md:grid-cols-[180px_1fr] min-h-[360px]">
              {/* Wireframe Sidebar */}
              <div className={`p-4 border-b md:border-b-0 md:border-r space-y-3 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/40'}`}>
                <div className="text-slate-400 uppercase tracking-wider text-[10px] mb-4">Navigation</div>
                <div className="text-emerald-600 font-bold">[x] Dashboard</div>
                <div>[ ] Video Lessons</div>
                <div>[ ] Scenario Quizzes</div>
                <div>[ ] Sandbox IDE</div>
                <div>[ ] Performance Logs</div>
              </div>

              {/* Wireframe Workspace Content Area */}
              <div className="p-6 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Current Lesson Wireframe Card */}
                  <div className={`p-4 border rounded ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">Current Lesson</div>
                    <div className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Inheritance & Subclass Overrides
                    </div>
                    <div className="text-[11px] text-slate-400">Status: In Progress</div>
                  </div>

                  {/* Progress Tracking Wireframe Card */}
                  <div className={`p-4 border rounded ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">Progress Tracking</div>
                    <div className="font-bold text-sm mb-2">
                      [■■■■■■■■□□] 80%
                    </div>
                    <div className="text-[11px] text-slate-400">4 of 5 lessons completed</div>
                  </div>
                </div>

                {/* Coding Practice Area Wireframe Box */}
                <div className={`border rounded p-4 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/40 border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-slate-400 text-[10px] uppercase tracking-wider">Coding Practice Area</span>
                    <span className="text-slate-450 text-[10px]">main.java</span>
                  </div>
                  <div className={`p-3 font-mono text-[11px] rounded bg-slate-950 text-slate-350 border ${isDark ? 'border-slate-900' : 'border-slate-250'}`}>
                    <div className="text-slate-500">1 | public class Main &#123;</div>
                    <div className="text-slate-500">2 |   public static void main(String[] args) &#123;</div>
                    <div className="text-emerald-500 font-bold">3 |     Car c = new Car("BMW", 4);</div>
                    <div className="text-slate-500">4 |     c.displayInfo();</div>
                    <div className="text-slate-500">5 |   &#125;</div>
                    <div className="text-slate-500">6 | &#125;</div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <span className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold">
                      [RUN_CODE]
                    </span>
                  </div>
                </div>

                {/* Performance Summary Wireframe Box */}
                <div className={`p-4 border rounded ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">Performance Summary</div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs">
                    <div>
                      <div className="font-bold">12</div>
                      <div className="text-slate-400 text-[10px]">Tasks Passed</div>
                    </div>
                    <div>
                      <div className="font-bold">94%</div>
                      <div className="text-slate-400 text-[10px]">Quiz Score</div>
                    </div>
                    <div>
                      <div className="font-bold">12 Days</div>
                      <div className="text-slate-400 text-[10px]">Active Streak</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Users Section */}
      <section className="py-20" id="target-users">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Who is the platform for?
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Two interfaces designed to support comprehensive academic training.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div
              className={`p-8 border rounded-lg transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Students
              </h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Learn and practice programming step by step. Write code inside a dedicated workspace, receive immediate visual recommendations, and progress from basic models to advanced poly-hierarchy systems.
              </p>
            </div>

            <div
              className={`p-8 border rounded-lg transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Teachers
              </h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Manage lessons, quizzes, and track progress. Access a consolidated dashboard to check student sandbox code, evaluate submission logs, write direct feedback notes, and control grade values.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className={`py-24 border-t ${isDark ? 'bg-slate-950 border-slate-900' : 'bg-slate-50 border-slate-100'}`}
        id="cta"
      >
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Start learning programming the right way
          </h2>
          <p className={`text-sm sm:text-base max-w-xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-550'}`}>
            Join our browser environment to configure, test, and master object hierarchies instantly.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onAuthTrigger?.('register')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-8 py-3.5 rounded-md text-sm transition-colors shadow-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`border-t py-12 text-center text-xs transition-colors duration-200 ${
          isDark ? 'bg-slate-950 border-slate-900 text-slate-550' : 'bg-white border-slate-100 text-slate-500'
        }`}
        id="landing-footer"
      >
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <div className="flex justify-center items-center gap-6">
            <span className={`transition-colors cursor-pointer hover:text-emerald-500`}>About</span>
            <span className={`transition-colors cursor-pointer hover:text-emerald-500`}>Courses</span>
            <span className={`transition-colors cursor-pointer hover:text-emerald-500`}>Contact</span>
          </div>
          <div>
            <p className="font-mono text-[10px]">
              &copy; 2026 OOP Pedagogical Hub. Coded for jericokunn@gmail.com
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
