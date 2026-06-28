export default function PrivacyPolicyPage() {
  const year = new Date().getFullYear();
  return (
    <main className="min-h-screen" style={{background:'#030810',color:'#f1f5f9',fontFamily:'system-ui,sans-serif'}}>
      <div style={{maxWidth:760,margin:'0 auto',padding:'48px 24px'}}>

        {/* Header */}
        <div style={{marginBottom:40}}>
          <p style={{fontSize:11,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(56,189,248,0.7)',marginBottom:8}}>
            Legal · Privacy
          </p>
          <h1 style={{fontSize:32,fontWeight:900,color:'white',letterSpacing:'-0.02em',margin:0}}>Privacy Policy</h1>
          <p style={{marginTop:8,fontSize:13,color:'rgba(255,255,255,0.4)'}}>
            Altus Performance Platform · Last updated {new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>

        <div style={{fontSize:14,lineHeight:1.8,color:'rgba(255,255,255,0.7)'}}>

          {/* Company */}
          <section style={{marginBottom:32,padding:20,background:'rgba(255,255,255,0.02)',borderRadius:12,border:'1px solid rgba(255,255,255,0.07)'}}>
            <p style={{margin:0,fontSize:13}}>
              <strong style={{color:'white'}}>Altus Performance</strong> is a digital sport management platform operated by{' '}
              <strong style={{color:'white'}}>Altus (Pty) Ltd (Reg. 2026/424230/07)</strong> (&quot;Altus&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;), a company incorporated in the Republic of South Africa.
              Altus is the responsible party for the processing of personal information as defined under the Protection of Personal Information Act 4 of 2013 (&quot;POPIA&quot;).
              This Privacy Policy applies to all users of the Altus Performance platform, including coaches, athletic staff, school administrators, athletes, and parents or guardians who access the platform.
            </p>
          </section>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>1. Information We Collect</h2>
          <p>We collect the following categories of personal information:</p>
          <ul style={{margin:'12px 0 24px 20px'}}>
            <li style={{marginBottom:8}}><strong style={{color:'white'}}>Identity information:</strong> Full names, email addresses, and role designations of coaching and administrative staff.</li>
            <li style={{marginBottom:8}}><strong style={{color:'white'}}>Athlete information:</strong> Names, age groups, team assignments, physical performance test results, and attendance records of student athletes.</li>
            <li style={{marginBottom:8}}><strong style={{color:'white'}}>Authentication data:</strong> Email addresses and encrypted password credentials for staff accounts.</li>
            <li style={{marginBottom:8}}><strong style={{color:'white'}}>Usage data:</strong> Interaction logs, session timestamps, and platform activity for security and audit purposes.</li>
            <li style={{marginBottom:8}}><strong style={{color:'white'}}>Device information:</strong> Browser type, device type, and IP address for security monitoring.</li>
          </ul>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>2. How We Use Your Information</h2>
          <p>We process personal information for the following lawful purposes:</p>
          <ul style={{margin:'12px 0 24px 20px'}}>
            <li style={{marginBottom:8}}>Providing and maintaining the Altus Performance platform and its features.</li>
            <li style={{marginBottom:8}}>Managing athlete performance records, attendance, and team administration.</li>
            <li style={{marginBottom:8}}>Facilitating secure coach and staff access to the platform.</li>
            <li style={{marginBottom:8}}>Communicating updates, notifications, and service-related communications.</li>
            <li style={{marginBottom:8}}>Complying with legal obligations under South African law.</li>
            <li style={{marginBottom:8}}>Improving platform functionality and user experience.</li>
          </ul>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>3. Legal Basis for Processing</h2>
          <p style={{marginBottom:24}}>
            We process personal information on the basis of contractual necessity (to provide the platform to our licensed clients), legitimate interests (to maintain platform security and improve our services), and compliance with legal obligations under POPIA and other applicable South African legislation.
            Where we process the personal information of minors (athletes under the age of 18), we do so only under the authority of the licensed school institution and in accordance with the school&apos;s data governance policies.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>4. Data Sharing and Disclosure</h2>
          <p>We do not sell, rent, or trade personal information. We may share data in the following limited circumstances:</p>
          <ul style={{margin:'12px 0 24px 20px'}}>
            <li style={{marginBottom:8}}><strong style={{color:'white'}}>Licenced schools:</strong> Authorised staff at the client school institution access data within the scope of their role.</li>
            <li style={{marginBottom:8}}><strong style={{color:'white'}}>Service providers:</strong> We use Supabase (database and authentication, EU-based servers) and Vercel (hosting infrastructure). These providers are bound by appropriate data processing agreements.</li>
            <li style={{marginBottom:8}}><strong style={{color:'white'}}>Legal requirements:</strong> We may disclose information where required by law, court order, or regulatory authority.</li>
          </ul>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>5. Data Retention</h2>
          <p style={{marginBottom:24}}>
            We retain personal information for the duration of the active licence agreement with the client institution, and for a period of up to 12 months thereafter to facilitate transitions or resolve disputes.
            Upon expiry of the retention period or written request from the client institution, personal information will be permanently deleted from our systems.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>6. Security</h2>
          <p style={{marginBottom:24}}>
            We implement industry-standard security measures including encrypted data transmission (TLS), hashed credential storage, role-based access control, and regular security reviews.
            While we take all reasonable precautions, no system is entirely immune to security risks. We will notify affected parties of any material data breach in accordance with POPIA requirements.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>7. Your Rights Under POPIA</h2>
          <p>As a data subject, you have the right to:</p>
          <ul style={{margin:'12px 0 24px 20px'}}>
            <li style={{marginBottom:8}}>Request access to personal information we hold about you.</li>
            <li style={{marginBottom:8}}>Request correction of inaccurate or outdated information.</li>
            <li style={{marginBottom:8}}>Object to the processing of your personal information.</li>
            <li style={{marginBottom:8}}>Request deletion of your personal information, subject to legal retention obligations.</li>
            <li style={{marginBottom:8}}>Lodge a complaint with the Information Regulator of South Africa.</li>
          </ul>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>8. Children&apos;s Privacy</h2>
          <p style={{marginBottom:24}}>
            Altus Performance processes personal information relating to minor athletes solely on behalf of and under the authority of the licensed school institution.
            Parents or guardians wishing to exercise rights in respect of their child&apos;s personal information should contact their school&apos;s designated Altus Performance administrator.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>9. Changes to This Policy</h2>
          <p style={{marginBottom:24}}>
            We may update this Privacy Policy from time to time. Material changes will be communicated to licenced client institutions in advance.
            Continued use of the platform following notification of changes constitutes acceptance of the updated policy.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>10. Contact</h2>
          <div style={{padding:20,background:'rgba(255,255,255,0.02)',borderRadius:12,border:'1px solid rgba(255,255,255,0.07)'}}>
            <p style={{margin:0}}><strong style={{color:'white'}}>Responsible Party:</strong> Altus (Pty) Ltd</p>
            <p style={{margin:'8px 0 0'}}><strong style={{color:'white'}}>Product:</strong> Altus Performance</p>
            <p style={{margin:'8px 0 0'}}><strong style={{color:'white'}}>Contact Person:</strong> Cody Jason Van Dyk</p>
            <p style={{margin:'8px 0 0'}}><strong style={{color:'white'}}>Email:</strong> cody@altusperformance.co.za</p>
            <p style={{margin:'8px 0 0',fontSize:12,color:'rgba(255,255,255,0.3)'}}>Information Regulator of South Africa: <a href="https://inforegulator.org.za" style={{color:'rgba(56,189,248,0.7)'}}>inforegulator.org.za</a></p>
          </div>
        </div>

        {/* Footer */}
        <div style={{marginTop:48,paddingTop:24,borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',fontSize:11,color:'rgba(255,255,255,0.2)'}}>
          <span>Altus Performance is a product of Altus (Pty) Ltd (Reg. 2026/424230/07)</span>
          <span>© {year} Altus (Pty) Ltd · Reg. 2026/424230/07</span>
        </div>
      </div>
    </main>
  );
}
