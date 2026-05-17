export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-400 mb-2">Legal</p>
          <h1 className="text-4xl font-black text-white mb-3">Privacy Policy</h1>
          <p className="text-slate-500 text-sm">Last updated: May 2026 · St Benedict's College High Performance Operations Platform</p>
        </div>

        <div className="space-y-10 text-slate-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-black text-white mb-3">1. Overview</h2>
            <p>The High Performance Operations Platform ("HPOS", "the Platform") is an internal operational tool developed for St Benedict's College ("the School") to support the management of sport departments, athlete performance tracking, and high performance class administration.</p>
            <p className="mt-3">This Privacy Policy explains how personal information is collected, stored, used, and protected within the Platform. It applies to all users including coaches, administrators, and any other authorised staff members.</p>
            <p className="mt-3">The Platform operates in accordance with the <strong className="text-white">Protection of Personal Information Act 4 of 2013 (POPIA)</strong> of South Africa.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">2. Who We Are</h2>
            <p>The Platform is developed and maintained by Cody Jason Van Dyk, operating under the supervision and authority of St Benedict's College. The Platform is currently in an internal pilot phase and is not a commercial product.</p>
            <p className="mt-3"><strong className="text-white">Responsible Party (as defined by POPIA):</strong> KINETIQ (Pty) Ltd (in registration), represented by Cody Jason Van Dyk, in conjunction with St Benedict's College, is responsible for the processing of personal information collected through this Platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">3. What Information We Collect</h2>
            <p className="mb-3">The Platform collects and stores the following categories of information:</p>
            <div className="space-y-3">
              {[
                { title: 'Athlete / Student Data', items: ['Full name and grade', 'Class group and training group assignment', 'Sport team membership', 'Attendance records (present, absent, late, excused)', 'Physical performance test results (sprint times, jump distances, fitness scores)', 'Coach notes and observations'] },
                { title: 'Staff / Coach Data', items: ['Email address (used for login authentication)', 'Role and access level', 'Login activity'] },
                { title: 'Operational Data', items: ['Team fixtures and results', 'Weekly training plans', 'Session records'] },
              ].map(({ title, items }) => (
                <div key={title} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="font-black text-white mb-2">{title}</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-400">
                    {items.map(i => <li key={i}>{i}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-slate-500">The Platform does <strong className="text-white">not</strong> collect: medical diagnoses, mental health records, identity numbers, home addresses, financial information, or any biometric data.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">4. How We Use This Information</h2>
            <p className="mb-2">Information collected is used solely for the following operational purposes:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              {['Tracking athlete attendance and participation in sport programmes', 'Recording and analysing physical performance test results', 'Managing team selections and squad assignments', 'Supporting coach decision-making through performance trends', 'Generating AI-assisted summaries and reports for coaching staff', 'Communicating team information and schedules'].map(i => <li key={i}>{i}</li>)}
            </ul>
            <p className="mt-4">The Platform does <strong className="text-white">not</strong> use personal information for commercial purposes, advertising, profiling for non-sport purposes, or any purpose unrelated to the operational management of sport at St Benedict's College.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">5. AI-Generated Content</h2>
            <p>The Platform includes AI-assisted features that generate summaries, reports, and insights based on stored athlete and team data. Users should be aware that:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              {['AI-generated content is assistive in nature and intended to support coach decision-making only', 'AI outputs are not medical advice, clinical assessments, or professional diagnoses', 'Coaches remain fully responsible for all decisions made regarding athletes', 'AI summaries should be reviewed critically and not relied upon as definitive assessments'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">6. Data Storage and Security</h2>
            <p>All data is stored securely using <strong className="text-white">Supabase</strong>, hosted in the European Union (Ireland, eu-west-1). Access is protected by:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              {['Email and password authentication', 'Role-based access control', 'Row-level security policies enforced at database level', 'Restricted admin access for sensitive functions', 'TLS/SSL encryption on all connections via Vercel hosting'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">7. Who Has Access</h2>
            <div className="space-y-3">
              {[
                { role: 'Platform Owner / Developer', access: 'Full administrative access for development and maintenance' },
                { role: 'Head of Hockey / Head of Sport', access: 'Full access to relevant sport department data including portal administration' },
                { role: 'Coaches', access: 'Access to athlete profiles, attendance, performance data and team information for assigned squads only' },
                { role: 'HP Staff', access: 'Access to HP Class student data, attendance, and testing results via shared access code' },
              ].map(({ role, access }) => (
                <div key={role} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <p className="font-black text-white text-sm">{role}</p>
                  <p className="text-slate-400 text-sm mt-1">{access}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-slate-500">No athlete or student data is shared with third parties or made publicly available in any identifiable form.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">8. Data Relating to Minors</h2>
            <p>The Platform stores data relating to learners who may be under 18. In accordance with POPIA:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              {['Only sport-related operational data is collected', 'No sensitive personal information about minors is stored', 'Access to learner data is strictly restricted to authorised school staff', 'No learner data is published or made accessible outside the Platform', 'The Platform operates under the authority and oversight of St Benedict\'s College'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">9. Data Retention</h2>
            <p>Data is retained for as long as it is operationally relevant. Upon a learner leaving the school or a staff member's access being revoked, their data will be archived or deleted as appropriate. Deletion requests can be submitted to the Platform administrator.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">10. Your Rights Under POPIA</h2>
            <p className="mb-3">Individuals have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              {['Be informed about what personal information is held about them', 'Request access to their personal information', 'Request correction of inaccurate information', 'Request deletion of their information where appropriate', 'Object to the processing of their personal information', 'Lodge a complaint with the Information Regulator of South Africa'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">11. Changes to This Policy</h2>
            <p>This Privacy Policy may be updated as the Platform evolves, particularly upon commercial expansion or onboarding of additional institutions. Any material changes will be communicated to authorised users.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">12. Contact</h2>
            <p>For any questions or requests relating to this Privacy Policy:</p>
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-white font-black">Cody Jason Van Dyk</p>
              <p className="text-slate-400 mt-1">KINETIQ (Pty) Ltd (in registration)</p>
              <p className="text-slate-400">Johannesburg, Gauteng, South Africa</p>
            </div>
          </section>

        </div>

        <div className="mt-16 border-t border-slate-800 pt-8 flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs text-slate-600">© 2026 KINETIQ · All rights reserved</p>
          <a href="/terms" className="text-xs text-sky-500 hover:text-sky-400">Terms of Use →</a>
        </div>
      </div>
    </main>
  );
}
