export default function TermsOfUse() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-400 mb-2">Legal</p>
          <h1 className="text-4xl font-black text-white mb-3">Terms of Use</h1>
          <p className="text-slate-500 text-sm">Last updated: May 2026 · St Benedict's College High Performance Operations Platform</p>
        </div>

        <div className="space-y-10 text-slate-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-black text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the High Performance Operations Platform ("HPOS", "the Platform"), you agree to be bound by these Terms of Use. If you do not agree to these terms, you may not use the Platform.</p>
            <p className="mt-3">Access to the Platform is granted exclusively to authorised staff members of St Benedict's College. Unauthorised access is strictly prohibited.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">2. Platform Purpose</h2>
            <p>The Platform is an internal operational tool designed exclusively for:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              {['Management of sport department data at St Benedict\'s College', 'Athlete attendance and performance tracking', 'Team and squad administration', 'High performance class management for Grade 8 and Grade 9 learners', 'Coach communication and planning support'].map(i => <li key={i}>{i}</li>)}
            </ul>
            <p className="mt-4">The Platform is not intended for personal use, commercial purposes, or use by any institution other than St Benedict's College without explicit written authorisation from the Platform developer.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">3. Authorised Use</h2>
            <p>Users of the Platform agree to:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              {['Use the Platform solely for its intended operational purpose', 'Keep login credentials confidential and not share access with unauthorised individuals', 'Ensure that data entered is accurate, relevant, and limited to what is necessary', 'Not attempt to access data beyond their assigned role and permissions', 'Report any suspected security breach or unauthorised access immediately', 'Comply with all applicable South African laws including POPIA'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">4. Prohibited Conduct</h2>
            <p>Users must not:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              {['Share, publish, or disclose any athlete or student data outside of authorised Platform use', 'Screenshot, export, or distribute personal information of learners for non-operational purposes', 'Attempt to circumvent security controls or access controls', 'Use the Platform to store information beyond its stated operational scope', 'Make medical, clinical, or diagnostic claims based on Platform data or AI-generated outputs', 'Use AI-generated summaries as a substitute for professional judgement'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">5. Data Responsibilities</h2>
            <p>Users who enter data into the Platform are responsible for:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              {['Ensuring the accuracy of information entered', 'Only recording information that is operationally relevant and appropriate', 'Not entering sensitive personal information beyond the Platform\'s defined scope', 'Treating all athlete and student data with appropriate care and confidentiality'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">6. AI Features Disclaimer</h2>
            <p>The Platform includes AI-assisted features powered by OpenAI. By using these features, users acknowledge that:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              {['AI-generated content is for informational and coaching support purposes only', 'AI outputs do not constitute medical advice, clinical assessment, or professional diagnosis', 'The Platform developer and St Benedict\'s College accept no liability for decisions made solely on the basis of AI-generated content', 'Coaches and administrators remain fully responsible for all decisions affecting athletes and learners', 'AI outputs may contain errors or inaccuracies and should be reviewed critically'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">7. Intellectual Property</h2>
            <p>The Platform, including its code, design, architecture, and features, is the intellectual property of Cody van Deventer ("the Developer"). St Benedict's College holds a licence to use the Platform for its internal operational purposes.</p>
            <p className="mt-3">Nothing in these Terms grants St Benedict's College or any user ownership of the Platform or any of its components. The Developer retains all intellectual property rights including the right to license the Platform to other institutions.</p>
            <p className="mt-3">Data entered into the Platform by St Benedict's College staff remains the property of St Benedict's College.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">8. Availability and Modifications</h2>
            <p>The Platform is provided on an "as available" basis during its internal pilot phase. The Developer reserves the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              {['Modify, update, or discontinue features at any time', 'Perform maintenance that may temporarily affect availability', 'Update these Terms of Use with reasonable notice to users'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, the Developer shall not be liable for:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              {['Any loss or damage arising from reliance on AI-generated content', 'Data loss resulting from circumstances beyond reasonable control', 'Decisions made by coaches or administrators based on Platform data', 'Any indirect, incidental, or consequential loss arising from Platform use'].map(i => <li key={i}>{i}</li>)}
            </ul>
            <p className="mt-4">The Platform is a support tool. All coaching and administrative decisions remain the responsibility of authorised staff and the School.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">10. Termination of Access</h2>
            <p>Access to the Platform may be revoked at any time by the Developer or authorised School management if a user is found to have violated these Terms, misused athlete data, or acted in a manner inconsistent with the Platform's intended purpose.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">11. Governing Law</h2>
            <p>These Terms of Use are governed by the laws of the Republic of South Africa, including but not limited to the Protection of Personal Information Act 4 of 2013 (POPIA) and the Electronic Communications and Transactions Act 25 of 2002 (ECT Act).</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white mb-3">12. Contact</h2>
            <p>For any questions relating to these Terms:</p>
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-white font-black">St Benedict's College</p>
              <p className="text-slate-400 mt-1">High Performance Operations Platform · Bedfordview, Gauteng, South Africa</p>
            </div>
          </section>

        </div>

        <div className="mt-16 border-t border-slate-800 pt-8 flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs text-slate-600">© 2026 St Benedict's College · HPOS · All rights reserved</p>
          <a href="/privacy" className="text-xs text-sky-500 hover:text-sky-400">Privacy Policy →</a>
        </div>
      </div>
    </main>
  );
}
