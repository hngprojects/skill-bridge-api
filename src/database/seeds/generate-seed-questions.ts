/**
 * Generates seed.json for the question bank.
 * Run: npx ts-node src/database/seeds/generate-seed-questions.ts
 *
 * Produces at minimum 25 questions per track+level combo:
 *   - 7 MCQ
 *   - 12 open_ended_scenario (short text)
 *   - 3 long_text with question_type containing "scenario" (LT-1 situational)
 *   - 3 long_text without scenario keyword (LT-2 work_task)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ROLE_CODES: Record<string, string> = {
  FED: 'frontend_developer',
  BED: 'backend_developer',
  MOB: 'mobile_developer',
  FSD: 'fullstack_developer',
  DEV: 'cloud_devops',
  DTE: 'data_engineer',
  QAE: 'quality_assurance',
  MLE: 'ml_engineer',
  PMG: 'product_manager',
  PDG: 'product_designer',
  UXR: 'ux_researcher',
  BRD: 'brand_designer',
  GRM: 'marketing',
  DTA: 'data_analyst',
  BIA: 'business_analyst',
  BID: 'bi_developer',
  DSC: 'data_scientist',
  OPM: 'operations_manager',
  CSM: 'customer_success',
  PJM: 'project_manager',
  HRO: 'hr_people_ops',
  CYB: 'cybersecurity',
};

const LEVELS = ['junior', 'mid', 'senior', 'expert'] as const;

// Track-specific question templates
const TRACK_QUESTIONS: Record<
  string,
  {
    mcq: Array<{ q: string; options: Record<string, string>; answer: string }>;
    short: string[];
    lt_situational: string[];
    lt_work_task: string[];
    competencies: string[];
  }
> = {
  frontend_developer: {
    mcq: [
      {
        q: 'Which CSS property is used to create a flex container?',
        options: {
          A: 'display: flex',
          B: 'position: flex',
          C: 'float: flex',
          D: 'align: flex',
        },
        answer: 'A',
      },
      {
        q: 'What does the Virtual DOM do in React?',
        options: {
          A: 'Directly manipulates the browser DOM',
          B: 'Creates an in-memory representation of the UI for efficient updates',
          C: 'Replaces HTML entirely',
          D: 'Handles server-side rendering only',
        },
        answer: 'B',
      },
      {
        q: 'Which HTTP method is idempotent?',
        options: { A: 'POST', B: 'PATCH', C: 'PUT', D: 'None of the above' },
        answer: 'C',
      },
      {
        q: 'What is the purpose of the "key" prop in React lists?',
        options: {
          A: 'Styling list items',
          B: 'Helping React identify which items changed',
          C: 'Sorting the list',
          D: 'Adding accessibility labels',
        },
        answer: 'B',
      },
      {
        q: 'Which unit is relative to the viewport width?',
        options: { A: 'em', B: 'rem', C: 'vw', D: 'px' },
        answer: 'C',
      },
      {
        q: 'What does "event delegation" mean in JavaScript?',
        options: {
          A: 'Attaching events to child elements directly',
          B: 'Using a parent element to handle events for its children',
          C: 'Preventing event propagation',
          D: 'Delegating events to web workers',
        },
        answer: 'B',
      },
      {
        q: 'Which of the following is NOT a valid React hook?',
        options: {
          A: 'useEffect',
          B: 'useState',
          C: 'useRender',
          D: 'useCallback',
        },
        answer: 'C',
      },
      {
        q: 'What is the CSS box model order from inside out?',
        options: {
          A: 'Content, Padding, Border, Margin',
          B: 'Margin, Border, Padding, Content',
          C: 'Content, Border, Padding, Margin',
          D: 'Padding, Content, Border, Margin',
        },
        answer: 'A',
      },
      {
        q: 'What does CORS stand for?',
        options: {
          A: 'Cross-Origin Resource Sharing',
          B: 'Cross-Origin Request Security',
          C: 'Client-Origin Resource System',
          D: 'Cross-Object Rendering Service',
        },
        answer: 'A',
      },
      {
        q: 'Which method creates a shallow copy of an array?',
        options: {
          A: 'Array.from()',
          B: 'array.splice()',
          C: 'array.push()',
          D: 'array.pop()',
        },
        answer: 'A',
      },
      {
        q: 'What is the purpose of the useEffect cleanup function?',
        options: {
          A: 'To render components faster',
          B: 'To prevent memory leaks by cleaning up subscriptions',
          C: 'To reset component state',
          D: 'To handle errors',
        },
        answer: 'B',
      },
      {
        q: 'Which attribute improves image loading performance?',
        options: {
          A: 'loading="lazy"',
          B: 'async="true"',
          C: 'defer="image"',
          D: 'preload="auto"',
        },
        answer: 'A',
      },
    ],
    short: [
      'Explain how you would optimize a web page that takes 8 seconds to load. What metrics would you measure?',
      'A user reports that a form submission fails silently. Describe your debugging approach.',
      'How would you implement infinite scrolling in a way that maintains good performance?',
      'Describe the difference between controlled and uncontrolled components. When would you use each?',
      'Explain how you would make a complex data table accessible to screen reader users.',
      'A component re-renders 50 times per second. How would you diagnose and fix this?',
      'How would you implement a design system that works across multiple React applications?',
      'Explain your approach to handling authentication tokens on the client side securely.',
      'Describe how you would implement optimistic updates in a todo list application.',
      'How do you decide between client-side and server-side rendering for a specific page?',
      'Explain how you would test a component that relies on API calls and user interactions.',
      'A CSS animation is janky on mobile devices. What would you investigate and how would you fix it?',
      'How would you implement a robust error boundary strategy in a large React application?',
      'Describe your approach to managing complex form state with validation across multiple steps.',
      'How would you implement code splitting in a large single-page application to improve initial load time?',
      'Explain your approach to implementing a responsive design that works well from mobile to 4K displays.',
    ],
    lt_situational: [
      'You are leading a frontend team and discover that the API team will miss their deadline by 2 weeks. Your feature launch depends on their endpoints. The stakeholders expect a demo next week. Describe how you would handle this scenario, including communication with stakeholders and technical workarounds.',
      'A critical production bug is reported: users on Safari cannot complete checkout. Your team is in the middle of a sprint with tight deadlines. How would you triage this incident, communicate with stakeholders, and balance fixing the bug against sprint commitments?',
      'Your company is migrating from a legacy jQuery application to React. The codebase has 200+ pages and the business cannot afford downtime. Describe your migration strategy, how you would prioritize pages, and how you would ensure both old and new code coexist.',
      'During a code review, a senior developer strongly disagrees with your architectural decision to use a state management library. They believe local state is sufficient. How would you handle this disagreement constructively while defending your technical choice?',
      'Your team shipped a feature that accidentally breaks accessibility for screen reader users. A large enterprise client threatens to cancel their contract. How would you handle the immediate crisis, fix the issue, and prevent similar regressions?',
    ],
    lt_work_task: [
      'Design and describe the component architecture for a real-time collaborative document editor. Include state management strategy, WebSocket integration, and conflict resolution approach.',
      'Create a comprehensive front-end monitoring and observability strategy for a production SPA. Include error tracking, performance metrics, user session replay, and alerting thresholds.',
      'You need to build a dashboard that displays real-time analytics data with charts that update every 5 seconds. Describe your technical approach including data fetching strategy, rendering optimization, and how you would handle thousands of data points.',
      'Implement a strategy for a micro-frontend architecture where three teams independently deploy their sections of a large e-commerce platform. Describe module federation setup, shared dependencies, and routing.',
      'Design a comprehensive testing strategy for a payment flow that includes form validation, API integration, error handling, and success states. Describe what you would unit test, integration test, and E2E test.',
    ],
    competencies: [
      'debugging',
      'code_quality',
      'performance',
      'api_design',
      'security_awareness',
      'testing',
    ],
  },
  backend_developer: {
    mcq: [
      {
        q: 'What is the time complexity of a hash table lookup on average?',
        options: { A: 'O(1)', B: 'O(n)', C: 'O(log n)', D: 'O(n²)' },
        answer: 'A',
      },
      {
        q: 'Which HTTP status code indicates a resource was created successfully?',
        options: { A: '200', B: '201', C: '204', D: '301' },
        answer: 'B',
      },
      {
        q: 'What is the purpose of database indexing?',
        options: {
          A: 'Reduce storage space',
          B: 'Speed up data retrieval queries',
          C: 'Ensure data integrity',
          D: 'Encrypt sensitive data',
        },
        answer: 'B',
      },
      {
        q: 'Which principle does SOLID\'s "S" represent?',
        options: {
          A: 'Single Responsibility',
          B: 'Separation of Concerns',
          C: 'Service-oriented',
          D: 'Scalability',
        },
        answer: 'A',
      },
      {
        q: 'What is a race condition?',
        options: {
          A: 'When two programs compete for CPU',
          B: 'When the outcome depends on the timing of uncontrollable events',
          C: 'When a program runs too fast',
          D: 'When two databases conflict',
        },
        answer: 'B',
      },
      {
        q: 'Which of the following is a benefit of microservices over monoliths?',
        options: {
          A: 'Simpler deployment',
          B: 'Independent scaling of services',
          C: 'Easier debugging',
          D: 'Lower network latency',
        },
        answer: 'B',
      },
      {
        q: 'What does ACID stand for in database transactions?',
        options: {
          A: 'Atomicity, Consistency, Isolation, Durability',
          B: 'Authentication, Confidentiality, Integrity, Durability',
          C: 'Asynchronous, Concurrent, Isolated, Distributed',
          D: 'Atomic, Cached, Indexed, Distributed',
        },
        answer: 'A',
      },
      {
        q: 'Which caching strategy writes to cache and database simultaneously?',
        options: {
          A: 'Write-through',
          B: 'Write-back',
          C: 'Write-around',
          D: 'Read-through',
        },
        answer: 'A',
      },
      {
        q: 'What is the main purpose of a message queue?',
        options: {
          A: 'Store data permanently',
          B: 'Decouple producers and consumers for async processing',
          C: 'Replace databases',
          D: 'Speed up API responses directly',
        },
        answer: 'B',
      },
      {
        q: 'Which pattern helps prevent cascading failures in distributed systems?',
        options: {
          A: 'Singleton',
          B: 'Circuit Breaker',
          C: 'Observer',
          D: 'Factory',
        },
        answer: 'B',
      },
      {
        q: 'What is the CAP theorem about?',
        options: {
          A: 'Caching, API design, and Performance',
          B: 'Consistency, Availability, and Partition tolerance tradeoffs',
          C: 'Concurrency, Atomicity, and Persistence',
          D: 'Compression, Authentication, and Proxying',
        },
        answer: 'B',
      },
      {
        q: 'Which isolation level prevents phantom reads?',
        options: {
          A: 'READ UNCOMMITTED',
          B: 'READ COMMITTED',
          C: 'REPEATABLE READ',
          D: 'SERIALIZABLE',
        },
        answer: 'D',
      },
    ],
    short: [
      'Explain how you would design an API rate limiting system that works across multiple server instances.',
      'A database query that used to take 50ms now takes 15 seconds. Describe your investigation process.',
      'How would you implement a secure password reset flow? Describe the steps and security considerations.',
      'Explain your approach to handling partial failures in a microservices architecture.',
      'How would you design a system to process 10,000 webhook events per minute reliably?',
      'Describe how you would implement database migrations in a zero-downtime deployment.',
      'A memory leak is causing your Node.js service to crash every 6 hours. How would you diagnose it?',
      'How would you design an audit logging system that captures all data changes without impacting performance?',
      'Explain the tradeoffs between SQL and NoSQL databases for a social media feed feature.',
      'How would you implement idempotency for a payment processing endpoint?',
      'Describe your approach to API versioning. What strategy would you use and why?',
      'How would you design a job scheduling system that handles retries and dead letter queues?',
      'Explain how you would implement row-level security in a multi-tenant application.',
      'A third-party API your system depends on starts returning errors 30% of the time. How do you handle this?',
      'Explain your approach to implementing distributed tracing across microservices.',
      'How would you design a database schema that supports both current queries and future analytics needs?',
    ],
    lt_situational: [
      'Your production database is approaching storage limits and query performance is degrading. The business is growing 20% month-over-month. You need to present a scaling strategy to leadership. Describe your approach including immediate actions, medium-term solutions, and long-term architecture changes.',
      'A security audit reveals that your API has been exposing sensitive user data through verbose error messages for 3 months. Describe how you would handle the incident response, fix the vulnerability, assess the impact, and communicate with affected stakeholders.',
      'Two teams are building features that modify the same database tables and they keep creating conflicts in production. Describe how you would resolve the immediate conflicts and establish processes to prevent future issues.',
      'Your team inherited a legacy codebase with no tests, inconsistent patterns, and critical business logic spread across 50+ files. Leadership wants new features added weekly. Describe your strategy for improving code quality while maintaining delivery velocity.',
      'A data breach is discovered where an attacker exploited an SQL injection vulnerability in a legacy endpoint. Customer PII may have been exposed. Describe your incident response from technical containment through stakeholder communication and remediation.',
    ],
    lt_work_task: [
      'Design a notification system that supports email, SMS, and push notifications with user preferences, rate limiting, and delivery tracking. Describe the architecture, database schema, and key implementation details.',
      'You need to build a file upload service that handles files up to 5GB, supports resumable uploads, performs virus scanning, and stores metadata. Describe your technical approach.',
      'Design a real-time leaderboard system for a gaming platform with millions of users. It needs to show top 100, user rank, and update within 1 second of score changes. Describe your approach.',
      'Implement a multi-tenant SaaS billing system that handles subscriptions, usage-based pricing, proration, and invoicing. Describe the data model and key service interactions.',
      'Design an event sourcing architecture for an order management system. Describe event storage, projections, replay capability, and how you would handle schema evolution.',
    ],
    competencies: [
      'api_design',
      'system_design',
      'sql_queries',
      'debugging',
      'security_awareness',
      'performance',
    ],
  },
  mobile_developer: {
    mcq: [
      {
        q: 'What is the purpose of a ViewModel in MVVM architecture?',
        options: {
          A: 'Render UI directly',
          B: 'Hold and manage UI-related data surviving configuration changes',
          C: 'Handle network requests only',
          D: 'Replace the Activity lifecycle',
        },
        answer: 'B',
      },
      {
        q: 'Which approach helps prevent memory leaks in mobile apps?',
        options: {
          A: 'Using static references to activities',
          B: 'Properly unsubscribing observers and releasing resources',
          C: 'Increasing heap size',
          D: 'Disabling garbage collection',
        },
        answer: 'B',
      },
      {
        q: 'What is the benefit of lazy loading in mobile apps?',
        options: {
          A: 'All data loads at once',
          B: 'Reduces initial load time and memory usage',
          C: 'Makes the app offline-capable',
          D: 'Improves animation frame rate',
        },
        answer: 'B',
      },
      {
        q: 'What does "jank" refer to in mobile development?',
        options: {
          A: 'Network latency',
          B: 'Dropped frames causing visual stuttering',
          C: 'Memory leaks',
          D: 'API errors',
        },
        answer: 'B',
      },
      {
        q: 'Which pattern is best for managing complex navigation in mobile apps?',
        options: {
          A: 'Singleton',
          B: 'Coordinator/Navigator pattern',
          C: 'Factory',
          D: 'Observer',
        },
        answer: 'B',
      },
      {
        q: 'What is the purpose of ProGuard/R8 in Android?',
        options: {
          A: 'Adding new features',
          B: 'Code shrinking, obfuscation, and optimization',
          C: 'UI testing',
          D: 'Database management',
        },
        answer: 'B',
      },
      {
        q: 'Which is NOT a benefit of using dependency injection?',
        options: {
          A: 'Easier testing',
          B: 'Loose coupling',
          C: 'Faster runtime performance',
          D: 'Better code reusability',
        },
        answer: 'C',
      },
      {
        q: 'What is a "cold start" in mobile apps?',
        options: {
          A: 'App crashes on launch',
          B: 'App launching from scratch with no cached process',
          C: 'App running in background',
          D: 'App update installation',
        },
        answer: 'B',
      },
      {
        q: 'Which caching strategy is most appropriate for offline-first mobile apps?',
        options: {
          A: 'No caching',
          B: 'Cache-then-network with local persistence',
          C: 'Network-only',
          D: 'Memory cache only',
        },
        answer: 'B',
      },
      {
        q: 'What is the main advantage of declarative UI frameworks (SwiftUI, Jetpack Compose)?',
        options: {
          A: 'Faster compilation',
          B: 'UI described as a function of state, reducing manual UI updates',
          C: 'Better network handling',
          D: 'Smaller app size',
        },
        answer: 'B',
      },
      {
        q: 'What is certificate pinning used for in mobile apps?',
        options: {
          A: 'Improving app speed',
          B: 'Preventing man-in-the-middle attacks by validating server certificates',
          C: 'Caching network responses',
          D: 'Reducing battery usage',
        },
        answer: 'B',
      },
      {
        q: 'Which threading approach is recommended for UI updates in mobile apps?',
        options: {
          A: 'Background thread',
          B: 'Main/UI thread only',
          C: 'Any available thread',
          D: 'Network thread',
        },
        answer: 'B',
      },
    ],
    short: [
      'Explain how you would implement offline-first data sync with conflict resolution in a mobile app.',
      'A user reports your app drains 40% battery in one hour. How would you investigate and fix this?',
      'Describe your approach to implementing secure biometric authentication in a mobile app.',
      'How would you handle deep linking across iOS and Android with a shared URL scheme?',
      'Explain how you would optimize a list that displays 10,000+ items with images.',
      'Your app crashes intermittently but only on specific devices. Describe your debugging approach.',
      'How would you implement push notifications that work reliably across both platforms?',
      'Describe your strategy for managing different screen sizes and orientations.',
      'How would you implement a smooth image loading experience with caching and placeholders?',
      'Explain your approach to implementing end-to-end encryption for a chat feature.',
      'How would you design an app update mechanism that handles breaking API changes gracefully?',
      "Describe how you would reduce your app's startup time from 4 seconds to under 1 second.",
      'How would you implement accessibility features for visually impaired users?',
      'Explain your approach to handling background tasks that must complete even if the app is killed.',
      'How would you implement feature flags in a mobile app to enable gradual rollouts and A/B testing?',
      'Describe your approach to implementing analytics tracking that respects user privacy and GDPR.',
    ],
    lt_situational: [
      "Your app receives a 1-star review surge due to a crash affecting 15% of users after an OS update. The crash is in a third-party SDK you don't control. Describe how you would handle this situation, communicate with users, and implement a fix or workaround.",
      "You're leading a mobile team and the product manager wants to ship a feature that requires camera, location, and contacts permissions. Users have been complaining about permission requests. How would you balance business needs with user privacy concerns?",
      'Your mobile app needs to comply with new data privacy regulations in 30 days. The app currently stores user data locally without encryption and sends analytics without consent. Describe your remediation plan.',
      'During a release, you discover that the iOS and Android versions have diverged significantly in behavior. The QA team missed this. How would you align the platforms and prevent future divergence?',
      'Apple rejects your app update due to a new guideline interpretation that affects your core feature. The Android version is already live with the feature. Users are confused. How do you handle this across platforms, stakeholders, and users?',
    ],
    lt_work_task: [
      'Design a mobile payment SDK that other apps can integrate. It needs to handle multiple payment methods, 3D Secure verification, and maintain PCI compliance. Describe the architecture and public API.',
      'Build a real-time location tracking feature for a delivery app that needs to work reliably even with poor connectivity, optimize battery usage, and update the server every 10 seconds.',
      'Design a modular architecture for a large mobile app (50+ screens) that supports feature flags, A/B testing, and allows teams to work independently on different modules.',
      'Implement an offline-capable document editor that syncs changes across devices. Describe the conflict resolution strategy, local storage approach, and sync protocol.',
      'Design a comprehensive crash reporting and diagnostics system for a mobile app with 1M+ daily active users. Include data collection, symbolication, alerting, and prioritization of fixes.',
    ],
    competencies: [
      'debugging',
      'performance',
      'code_quality',
      'security_awareness',
      'testing',
      'system_design',
    ],
  },
};

// Generic question templates for tracks not explicitly defined above
function generateGenericQuestions(track: string, _roleCode: string) {
  const trackLabel = track.replace(/_/g, ' ');
  return {
    mcq: [
      {
        q: `In ${trackLabel}, which approach best ensures quality deliverables?`,
        options: {
          A: 'Rushing to meet deadlines',
          B: 'Systematic review and iteration',
          C: 'Working in isolation',
          D: 'Skipping documentation',
        },
        answer: 'B',
      },
      {
        q: `What is the most important factor in stakeholder communication for ${trackLabel}?`,
        options: {
          A: 'Using technical jargon',
          B: 'Clear, audience-appropriate messaging',
          C: 'Sending lengthy reports',
          D: 'Avoiding difficult conversations',
        },
        answer: 'B',
      },
      {
        q: `Which practice helps maintain consistency in ${trackLabel} work?`,
        options: {
          A: 'Ad-hoc processes',
          B: 'Documented standards and templates',
          C: 'Individual preferences only',
          D: 'Avoiding feedback',
        },
        answer: 'B',
      },
      {
        q: `What is the primary benefit of data-driven decision making in ${trackLabel}?`,
        options: {
          A: 'Eliminates all risk',
          B: 'Provides objective basis for decisions',
          C: 'Replaces human judgment entirely',
          D: 'Guarantees success',
        },
        answer: 'B',
      },
      {
        q: `In ${trackLabel}, which time management approach is most effective?`,
        options: {
          A: 'Multitasking everything',
          B: 'Prioritizing by impact and urgency',
          C: 'Working on easiest tasks first',
          D: 'Never saying no to requests',
        },
        answer: 'B',
      },
      {
        q: `What defines a strong professional in ${trackLabel}?`,
        options: {
          A: 'Working alone without help',
          B: 'Continuous learning and adaptability',
          C: 'Never making mistakes',
          D: 'Knowing everything already',
        },
        answer: 'B',
      },
      {
        q: `Which collaboration approach works best in ${trackLabel} teams?`,
        options: {
          A: 'Avoiding meetings entirely',
          B: 'Regular sync with clear agendas and action items',
          C: 'Daily hour-long status meetings',
          D: 'Email-only communication',
        },
        answer: 'B',
      },
      {
        q: `What is the best way to handle conflicting priorities in ${trackLabel}?`,
        options: {
          A: 'Work on everything simultaneously',
          B: 'Escalate and align with stakeholders on tradeoffs',
          C: 'Ignore lower priority items',
          D: 'Decide alone without consultation',
        },
        answer: 'B',
      },
      {
        q: `In ${trackLabel}, what indicates a mature process?`,
        options: {
          A: 'No process documentation',
          B: 'Measurable outcomes, feedback loops, and continuous improvement',
          C: 'Rigid rules that never change',
          D: 'Only senior people know how things work',
        },
        answer: 'B',
      },
      {
        q: `Which metric approach is most valuable in ${trackLabel}?`,
        options: {
          A: 'Tracking everything possible',
          B: 'Focusing on key outcomes tied to business goals',
          C: 'Ignoring metrics entirely',
          D: 'Only tracking vanity metrics',
        },
        answer: 'B',
      },
      {
        q: `What is the best approach to documenting processes in ${trackLabel}?`,
        options: {
          A: 'Write everything in one large document',
          B: 'Concise, up-to-date documentation with clear ownership',
          C: 'No documentation needed if team is small',
          D: 'Only document after project completion',
        },
        answer: 'B',
      },
      {
        q: `How should feedback be delivered in a ${trackLabel} team?`,
        options: {
          A: 'Only during annual reviews',
          B: 'Timely, specific, and actionable with concrete examples',
          C: 'Only when something goes wrong',
          D: 'Through email only to avoid confrontation',
        },
        answer: 'B',
      },
    ],
    short: [
      `Describe a situation where you had to balance competing deadlines in your ${trackLabel} work. How did you prioritize?`,
      `How would you approach onboarding a new team member into your ${trackLabel} workflow?`,
      `Explain your process for gathering and incorporating feedback in your ${trackLabel} deliverables.`,
      `Describe how you would measure the success of a ${trackLabel} project. What metrics would you track?`,
      `How do you stay current with industry trends and best practices in ${trackLabel}?`,
      `Describe your approach to identifying and mitigating risks in a ${trackLabel} project.`,
      `How would you handle a situation where your initial approach to a ${trackLabel} problem isn't working?`,
      `Explain how you ensure quality and consistency in your ${trackLabel} outputs.`,
      `Describe how you would communicate a complex ${trackLabel} concept to a non-technical stakeholder.`,
      `How do you handle ambiguous requirements in ${trackLabel} projects?`,
      `Describe your approach to collaborating with other departments on ${trackLabel} initiatives.`,
      `How would you improve an existing ${trackLabel} process that the team has been using for years?`,
      `Explain your strategy for managing stakeholder expectations when timelines are tight.`,
      `Describe how you would handle a disagreement with a colleague about the best approach to a ${trackLabel} problem.`,
      `How would you create a knowledge base that helps your ${trackLabel} team avoid repeating past mistakes?`,
      `Describe your approach to mentoring a junior team member in ${trackLabel}.`,
    ],
    lt_situational: [
      `You are assigned to a high-visibility ${trackLabel} project but discover the initial scope was severely underestimated. The deadline is fixed and stakeholders have already communicated the launch date externally. Describe how you would approach this scenario, what tradeoffs you would propose, and how you would communicate with all parties involved.`,
      `A key team member on your ${trackLabel} project suddenly leaves the company mid-sprint. They held critical knowledge that wasn't documented. Describe how you would handle the immediate impact, knowledge recovery, and ensure the project continues on track.`,
      `Your ${trackLabel} deliverable has been well-received internally, but after launch, user feedback reveals it doesn't solve the actual problem. Stakeholders are frustrated. Describe how you would handle this situation, investigate the root cause, and propose a path forward.`,
      `You receive conflicting direction from two senior stakeholders about the direction of your ${trackLabel} work. Both have valid perspectives and organizational authority. Describe how you would navigate this conflict and reach a resolution.`,
      `Your ${trackLabel} team is experiencing burnout after 3 consecutive high-pressure sprints. Quality is declining and two people are considering leaving. You need to deliver a critical project in 4 weeks. Describe how you would handle this situation.`,
    ],
    lt_work_task: [
      `Design a comprehensive ${trackLabel} strategy for a startup entering a competitive market. Include research methodology, key deliverables, timeline, success metrics, and how you would iterate based on early results.`,
      `You need to establish ${trackLabel} best practices for a growing team of 15 people across 3 time zones. Describe your framework for documentation, review processes, tooling decisions, and quality standards.`,
      `Create a detailed plan for evaluating and improving the current ${trackLabel} workflow at a mid-size company. Include assessment criteria, stakeholder interviews, data collection methods, and a phased improvement roadmap.`,
      `Design a ${trackLabel} project framework that can scale from a 3-person team to a 30-person department. Address governance, communication, quality gates, and knowledge sharing.`,
      `Create a comprehensive onboarding program for new ${trackLabel} hires that gets them productive within 2 weeks. Include documentation, mentoring structure, gradual responsibility increase, and success checkpoints.`,
    ],
    competencies: ['general'],
  };
}

function levelModifier(level: string, question: string): string {
  const prefixes: Record<string, string> = {
    junior: '',
    mid: 'In a mid-level context, ',
    senior: 'As a senior professional, ',
    expert: 'At an expert/principal level, ',
  };
  // Only modify short and long text, not MCQ
  return (prefixes[level] || '') + question;
}

function generateSeed() {
  const questions: Record<string, unknown>[] = [];

  for (const [roleCode, track] of Object.entries(ROLE_CODES)) {
    const template =
      TRACK_QUESTIONS[track] || generateGenericQuestions(track, roleCode);

    const required = { mcq: 12, short: 16, lt_situational: 5, lt_work_task: 5 };
    for (const [key, min] of Object.entries(required)) {
      const actual = (template as Record<string, unknown[]>)[key]?.length ?? 0;
      if (actual < min) {
        throw new Error(
          `Template "${track}" has ${actual} ${key} questions but requires at least ${min}`,
        );
      }
    }

    for (const level of LEVELS) {
      // MCQ questions (12+)
      const mcqCount = 12;
      for (let i = 0; i < mcqCount; i++) {
        const mcq = template.mcq[i];
        questions.push({
          id: `${roleCode}-ADV-MCQ-${level.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          role_code: roleCode,
          role: track.replace(/_/g, ' '),
          level,
          assessment_stage: 'advanced_assessment',
          format: 'mcq',
          competency: template.competencies[i % template.competencies.length],
          question: mcq.q,
          options: mcq.options,
          correct_answer: mcq.answer,
          difficulty_score:
            level === 'junior'
              ? 5
              : level === 'mid'
                ? 6
                : level === 'senior'
                  ? 7
                  : 8,
          tags: [track, level, 'mcq'],
        });
      }

      // Short text (open_ended_scenario) questions (16+)
      const shortCount = 16;
      for (let i = 0; i < shortCount; i++) {
        const q =
          level === 'junior'
            ? template.short[i]
            : levelModifier(level, template.short[i]);
        questions.push({
          id: `${roleCode}-ADV-ST-${level.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          role_code: roleCode,
          role: track.replace(/_/g, ' '),
          level,
          assessment_stage: 'advanced_assessment',
          format: 'open_ended_scenario',
          competency: template.competencies[i % template.competencies.length],
          question: q,
          options: null,
          correct_answer: null,
          grading_rubric: {
            what_to_evaluate:
              'Depth of thinking, practical approach, and awareness of tradeoffs',
            strong_answer_must_show: [
              'Clear reasoning',
              'Practical steps',
              'Awareness of constraints',
            ],
            weak_answer_indicators: [
              'Vague generalities',
              'No concrete steps',
              'Ignores context',
            ],
            score_guide: {
              '1': 'No relevant response',
              '2': 'Superficial attempt',
              '3': 'Adequate with gaps',
              '4': 'Strong practical response',
              '5': 'Expert-level comprehensive answer',
            },
          },
          difficulty_score:
            level === 'junior'
              ? 5
              : level === 'mid'
                ? 7
                : level === 'senior'
                  ? 8
                  : 9,
          tags: [track, level, 'short_text'],
        });
      }

      // Long text SITUATIONAL (question_type contains "scenario") (5+)
      const sitCount = 5;
      for (let i = 0; i < sitCount; i++) {
        const q =
          level === 'junior'
            ? template.lt_situational[i]
            : levelModifier(level, template.lt_situational[i]);
        questions.push({
          id: `${roleCode}-ADV-LT1-${level.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          role_code: roleCode,
          role: track.replace(/_/g, ' '),
          level,
          assessment_stage: 'advanced_assessment',
          format: 'long_text',
          competency: template.competencies[i % template.competencies.length],
          question_type: 'scenario_response',
          question: q,
          options: null,
          correct_answer: null,
          grading_rubric: {
            what_to_evaluate:
              'Communication skills, stakeholder management, problem-solving under pressure',
            strong_answer_must_show: [
              'Structured approach',
              'Stakeholder awareness',
              'Practical resolution',
              'Professional judgment',
            ],
            weak_answer_indicators: [
              'Avoids the conflict',
              'No stakeholder consideration',
              'Unrealistic solutions',
            ],
            score_guide: {
              '1': 'No meaningful response',
              '2': 'Avoids core issue',
              '3': 'Addresses issue partially',
              '4': 'Strong situational response',
              '5': 'Expert navigation of complex scenario',
            },
          },
          difficulty_score:
            level === 'junior'
              ? 6
              : level === 'mid'
                ? 7
                : level === 'senior'
                  ? 8
                  : 9,
          tags: [track, level, 'long_text', 'situational'],
        });
      }

      // Long text WORK_TASK (5+)
      const wtCount = 5;
      for (let i = 0; i < wtCount; i++) {
        const q =
          level === 'junior'
            ? template.lt_work_task[i]
            : levelModifier(level, template.lt_work_task[i]);
        questions.push({
          id: `${roleCode}-ADV-LT2-${level.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          role_code: roleCode,
          role: track.replace(/_/g, ' '),
          level,
          assessment_stage: 'advanced_assessment',
          format: 'long_text',
          competency: template.competencies[i % template.competencies.length],
          question_type: 'practical_task',
          question: q,
          options: null,
          correct_answer: null,
          grading_rubric: {
            what_to_evaluate:
              'Technical depth, system thinking, practical feasibility',
            strong_answer_must_show: [
              'Concrete architecture',
              'Consideration of scale',
              'Tradeoff analysis',
              'Implementation awareness',
            ],
            weak_answer_indicators: [
              'Too abstract',
              'Missing key components',
              'No consideration of constraints',
            ],
            score_guide: {
              '1': 'No meaningful response',
              '2': 'Very superficial',
              '3': 'Covers basics but misses depth',
              '4': 'Strong technical response',
              '5': 'Expert-level comprehensive design',
            },
          },
          difficulty_score:
            level === 'junior'
              ? 6
              : level === 'mid'
                ? 7
                : level === 'senior'
                  ? 8
                  : 9,
          tags: [track, level, 'long_text', 'work_task'],
        });
      }
    }
  }

  const outPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'data',
    'question-banks',
    'seed.json',
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(questions, null, 2));
  console.log(
    `Generated ${questions.length} questions across ${Object.keys(ROLE_CODES).length} tracks × ${LEVELS.length} levels`,
  );
  console.log(`Output: ${outPath}`);

  // Print summary
  const summary: Record<string, number> = {};
  for (const q of questions) {
    const key = `${String(q.role_code)}/${String(q.level)}/${String(q.format)}`;
    summary[key] = (summary[key] || 0) + 1;
  }
  console.log('\nSample (FED/junior):');
  for (const [k, v] of Object.entries(summary).filter(([k]) =>
    k.startsWith('FED/junior'),
  )) {
    console.log(`  ${k}: ${v}`);
  }
}

generateSeed();
