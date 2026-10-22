// Role packs: the vocabulary the scenario generator uses so prompts sound like the user's actual job.

export interface RolePack {
  id: string;
  name: string;
  /** Things this person works on ("the checkout redesign"). */
  projects: string[];
  /** Numbers they report ("p95 latency"). */
  metrics: string[];
  /** People they deal with ("the VP of Sales"). */
  stakeholders: string[];
  /** Things that go wrong ("a production outage"). */
  problems: string[];
  /** Things they deliver ("the design doc"). */
  deliverables: string[];
  /** Ideas they might propose ("moving to weekly releases"). */
  proposals: string[];
  /** Technical concepts they might explain to outsiders. */
  concepts: string[];
}

export const ROLES: RolePack[] = [
  {
    id: 'engineer', name: 'Software engineer',
    projects: ['the payments service migration', 'the mobile app release', 'the search rewrite', 'the API redesign', 'the move to the cloud', 'the login and authentication update', 'the data pipeline', 'the checkout flow'],
    metrics: ['error rate', 'page load time', 'test coverage', 'deployment frequency', 'p95 latency', 'crash-free sessions', 'cloud costs', 'open bugs'],
    stakeholders: ['your engineering manager', 'the product manager', 'the VP of Engineering', 'the security team', 'a senior architect', 'the support lead', 'the client\'s CTO'],
    problems: ['a production outage last night', 'a security vulnerability in a library', 'a release that broke the checkout page', 'a database that is running out of space', 'flaky tests blocking every deploy', 'a vendor API that keeps timing out'],
    deliverables: ['the design document', 'the code review', 'the incident report', 'the sprint demo', 'the technical estimate', 'the migration plan'],
    proposals: ['paying down technical debt for one sprint', 'adding automated testing before each release', 'moving to weekly releases', 'replacing an old library', 'adding on-call rotation', 'building instead of buying a tool'],
    concepts: ['an API', 'technical debt', 'a database index', 'caching', 'continuous deployment', 'a race condition', 'encryption', 'the cloud'],
  },
  {
    id: 'pm', name: 'Product manager',
    projects: ['the onboarding redesign', 'the pricing page experiment', 'the enterprise launch', 'the new mobile feature', 'the Q3 roadmap', 'the customer dashboard'],
    metrics: ['activation rate', 'monthly active users', 'conversion rate', 'churn', 'NPS', 'feature adoption', 'time to value'],
    stakeholders: ['the head of product', 'the engineering lead', 'the sales director', 'a key customer', 'the CEO', 'the design lead', 'marketing'],
    problems: ['a launch that slipped two weeks', 'a feature nobody is using', 'a customer threatening to cancel', 'conflicting requests from sales and engineering', 'a competitor launching first'],
    deliverables: ['the product requirements', 'the roadmap review', 'the launch plan', 'the experiment results', 'the quarterly business review'],
    proposals: ['cutting a feature to hit the date', 'running a pricing experiment', 'focusing on retention over new features', 'killing an underused feature', 'launching a beta program'],
    concepts: ['an A/B test', 'product-market fit', 'a roadmap', 'churn', 'a minimum viable product'],
  },
  {
    id: 'data', name: 'Data analyst or scientist',
    projects: ['the churn model', 'the revenue dashboard', 'the marketing attribution analysis', 'the forecasting model', 'the customer segmentation'],
    metrics: ['forecast accuracy', 'model precision', 'dashboard usage', 'data freshness', 'revenue per customer'],
    stakeholders: ['the CFO', 'the marketing director', 'your manager', 'a skeptical sales VP', 'the data engineering team'],
    problems: ['a dashboard showing the wrong numbers', 'a model that stopped performing', 'missing data from last month', 'two teams reporting different revenue'],
    deliverables: ['the analysis deck', 'the model results', 'the monthly metrics review', 'the data quality report'],
    proposals: ['a single source of truth for revenue', 'retiring old dashboards', 'running a controlled experiment', 'investing in data quality'],
    concepts: ['correlation versus causation', 'a confidence interval', 'machine learning', 'statistical significance', 'a data pipeline'],
  },
  {
    id: 'sales', name: 'Sales or account manager',
    projects: ['the enterprise deal with a bank', 'the renewal with your largest client', 'the new territory plan', 'the Q4 pipeline', 'the partner program'],
    metrics: ['quarterly quota', 'win rate', 'pipeline coverage', 'average deal size', 'renewal rate'],
    stakeholders: ['the client\'s procurement team', 'your sales director', 'a skeptical buyer', 'the client\'s CFO', 'the product team'],
    problems: ['a deal that stalled at legal review', 'a client asking for a 30% discount', 'a lost deal to a competitor', 'a missed quarterly target'],
    deliverables: ['the proposal', 'the forecast call', 'the account plan', 'the pricing quote', 'the quarterly business review'],
    proposals: ['a multi-year contract', 'a pilot before the full purchase', 'bundling services', 'changing the commission plan'],
    concepts: ['our pricing model', 'return on investment', 'the implementation process', 'a service-level agreement'],
  },
  {
    id: 'consultant', name: 'Consultant',
    projects: ['the cost reduction program', 'the operating model redesign', 'the digital transformation', 'the market entry study', 'the vendor selection'],
    metrics: ['cost savings', 'project milestones', 'client satisfaction', 'utilization', 'budget variance'],
    stakeholders: ['the client\'s COO', 'the engagement partner', 'the steering committee', 'a resistant department head', 'the client project lead'],
    problems: ['a client unhappy with the last deliverable', 'scope creeping every week', 'data the client still has not sent', 'a recommendation the client disagrees with'],
    deliverables: ['the steering committee deck', 'the interim findings', 'the business case', 'the final recommendation'],
    proposals: ['phasing the rollout', 'centralizing procurement', 'outsourcing a function', 'a quick-win pilot'],
    concepts: ['a business case', 'change management', 'a target operating model', 'benchmarking'],
  },
  {
    id: 'finance', name: 'Finance or accounting',
    projects: ['the annual budget', 'the quarter-end close', 'the audit preparation', 'the cost-cutting review', 'the new ERP system'],
    metrics: ['operating margin', 'cash flow', 'budget variance', 'days sales outstanding', 'forecast accuracy'],
    stakeholders: ['the CFO', 'the external auditors', 'department heads', 'the board', 'the controller'],
    problems: ['a 12% budget overrun', 'a late close', 'an audit finding', 'an unexpected expense', 'a forecast miss'],
    deliverables: ['the variance report', 'the budget review', 'the board pack', 'the audit response'],
    proposals: ['tighter approval limits', 'zero-based budgeting', 'automating the close', 'renegotiating vendor contracts'],
    concepts: ['cash flow versus profit', 'depreciation', 'a forecast', 'working capital'],
  },
  {
    id: 'marketing', name: 'Marketing',
    projects: ['the product launch campaign', 'the brand refresh', 'the paid search program', 'the customer webinar series', 'the new website'],
    metrics: ['cost per lead', 'conversion rate', 'marketing qualified leads', 'return on ad spend', 'web traffic'],
    stakeholders: ['the CMO', 'the sales team', 'the agency', 'the product team', 'the CEO'],
    problems: ['a campaign that missed its lead target', 'a brand complaint on social media', 'a budget cut mid-quarter', 'sales saying leads are low quality'],
    deliverables: ['the campaign results', 'the creative brief', 'the quarterly plan', 'the launch timeline'],
    proposals: ['shifting budget to the best channel', 'a customer referral program', 'fewer, bigger campaigns', 'testing a new audience'],
    concepts: ['attribution', 'the sales funnel', 'brand positioning', 'customer lifetime value'],
  },
  {
    id: 'operations', name: 'Operations or project management',
    projects: ['the warehouse move', 'the process automation', 'the supplier change', 'the office relocation', 'the system rollout'],
    metrics: ['on-time delivery', 'cost per unit', 'cycle time', 'error rate', 'customer wait time'],
    stakeholders: ['the operations director', 'a key supplier', 'the frontline team', 'finance', 'the project sponsor'],
    problems: ['a supplier delay', 'a missed milestone', 'a safety incident', 'a process causing rework', 'a team over capacity'],
    deliverables: ['the project status report', 'the risk register', 'the rollout plan', 'the lessons-learned review'],
    proposals: ['a second supplier', 'standardizing the process', 'adding a buffer to the timeline', 'automating manual steps'],
    concepts: ['the critical path', 'a bottleneck', 'lean process improvement', 'a risk register'],
  },
  {
    id: 'design', name: 'Designer',
    projects: ['the app redesign', 'the design system', 'the onboarding flow', 'the accessibility audit', 'the new brand guidelines'],
    metrics: ['task completion rate', 'usability scores', 'time on task', 'support tickets about the interface'],
    stakeholders: ['the product manager', 'the engineering lead', 'the head of design', 'a stakeholder who wants a different color', 'users in research'],
    problems: ['user testing that went badly', 'engineering saying the design is too complex', 'conflicting feedback from leadership', 'a deadline that cuts research'],
    deliverables: ['the design review', 'the research findings', 'the prototype', 'the design critique'],
    proposals: ['testing with real users first', 'simplifying the flow', 'investing in a design system', 'an accessibility standard'],
    concepts: ['user research', 'a design system', 'accessibility', 'information architecture'],
  },
  {
    id: 'hr', name: 'HR or people',
    projects: ['the hiring plan', 'the performance review cycle', 'the engagement survey', 'the new onboarding program', 'the compensation review'],
    metrics: ['employee turnover', 'time to hire', 'engagement score', 'offer acceptance rate'],
    stakeholders: ['the leadership team', 'a hiring manager', 'an upset employee', 'legal', 'the CEO'],
    problems: ['a key person resigning', 'low engagement scores', 'a policy complaint', 'a hiring freeze'],
    deliverables: ['the engagement results', 'the hiring update', 'the policy proposal', 'the training plan'],
    proposals: ['flexible working', 'a mentoring program', 'changing the interview process', 'a new career framework'],
    concepts: ['employee engagement', 'a performance framework', 'total compensation'],
  },
  {
    id: 'healthcare', name: 'Healthcare',
    projects: ['the new patient intake process', 'the electronic records upgrade', 'the staffing schedule', 'the quality improvement project'],
    metrics: ['patient wait times', 'readmission rate', 'patient satisfaction', 'staff overtime'],
    stakeholders: ['the department head', 'a patient\'s family', 'the nursing team', 'hospital administration', 'a senior physician'],
    problems: ['a staffing shortage', 'a medication process error', 'a patient complaint', 'a system downtime'],
    deliverables: ['the case presentation', 'the quality report', 'the shift handover', 'the improvement proposal'],
    proposals: ['a new handover checklist', 'changing the shift pattern', 'telehealth follow-ups'],
    concepts: ['a care pathway', 'patient safety', 'evidence-based practice'],
  },
  {
    id: 'educator', name: 'Teacher or trainer',
    projects: ['the new curriculum', 'the training program', 'the online course', 'the parent-teacher meetings'],
    metrics: ['completion rate', 'assessment scores', 'attendance', 'learner satisfaction'],
    stakeholders: ['the principal', 'a parent', 'the department head', 'a struggling learner', 'your colleagues'],
    problems: ['a class falling behind', 'a parent complaint', 'a cut training budget', 'low course completion'],
    deliverables: ['the lesson plan', 'the progress report', 'the workshop', 'the course review'],
    proposals: ['smaller group work', 'more practice time', 'a peer mentoring program'],
    concepts: ['active learning', 'formative assessment', 'learning objectives'],
  },
  {
    id: 'founder', name: 'Founder or business owner',
    projects: ['the fundraising round', 'the product launch', 'the first key hire', 'the expansion to a new city', 'the pricing change'],
    metrics: ['monthly revenue', 'burn rate', 'runway', 'customer acquisition cost', 'gross margin'],
    stakeholders: ['an investor', 'your co-founder', 'your first big customer', 'a potential hire', 'the bank'],
    problems: ['cash running low', 'a co-founder disagreement', 'a key customer leaving', 'a product that is not selling'],
    deliverables: ['the investor pitch', 'the board update', 'the financial plan', 'the hiring pitch'],
    proposals: ['raising prices', 'focusing on one customer segment', 'cutting costs by 20%', 'a strategic partnership'],
    concepts: ['our business model', 'unit economics', 'the market opportunity'],
  },
  {
    id: 'general', name: 'Other / general',
    projects: ['your main project', 'the team\'s quarterly goals', 'the new process', 'the client project', 'the system upgrade'],
    metrics: ['customer satisfaction', 'the budget', 'the timeline', 'quality', 'response time'],
    stakeholders: ['your manager', 'a senior leader', 'a client', 'a colleague from another team', 'the whole team'],
    problems: ['a missed deadline', 'an unhappy client', 'a budget overrun', 'a process that keeps failing', 'a conflict between two teams'],
    deliverables: ['the status update', 'the presentation', 'the proposal', 'the report'],
    proposals: ['a new way of running meetings', 'more automation', 'a change in priorities', 'a pilot program'],
    concepts: ['what your team does', 'how your main process works', 'your biggest project'],
  },
];

export const roleById = (id: string) => ROLES.find((r) => r.id === id) ?? ROLES[ROLES.length - 1];

export const INDUSTRIES = ['Technology', 'Finance and banking', 'Consulting', 'Healthcare', 'Retail and e-commerce', 'Manufacturing', 'Telecom', 'Energy', 'Government', 'Education', 'Media', 'Logistics', 'Insurance', 'Pharma', 'Other'];

export const SITUATIONS = [
  { id: 'standups', label: 'Daily stand-ups' },
  { id: 'client', label: 'Client calls' },
  { id: 'presentations', label: 'Presentations' },
  { id: 'leadership', label: 'Meetings with leadership' },
  { id: 'interviews', label: 'Job interviews' },
  { id: 'negotiation', label: 'Negotiations' },
  { id: 'feedback', label: 'Giving feedback' },
  { id: 'networking', label: 'Networking and small talk' },
];

export const CHALLENGES = [
  { id: 'fillers', label: 'I say "um" and "like" a lot' },
  { id: 'apologize', label: 'I apologize or hedge too much' },
  { id: 'fast', label: 'I talk too fast when nervous' },
  { id: 'ramble', label: 'I ramble and lose my point' },
  { id: 'blank', label: 'My mind goes blank on cold questions' },
  { id: 'flat', label: 'My voice sounds flat' },
  { id: 'understood', label: 'People ask me to repeat myself' },
  { id: 'interrupt', label: 'I get interrupted or talked over' },
];
