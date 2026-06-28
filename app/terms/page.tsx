export default function TermsOfUsePage() {
  const year = new Date().getFullYear();
  return (
    <main className="min-h-screen" style={{background:'#030810',color:'#f1f5f9',fontFamily:'system-ui,sans-serif'}}>
      <div style={{maxWidth:760,margin:'0 auto',padding:'48px 24px'}}>

        {/* Header */}
        <div style={{marginBottom:40}}>
          <p style={{fontSize:11,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'rgba(56,189,248,0.7)',marginBottom:8}}>
            Legal · Terms
          </p>
          <h1 style={{fontSize:32,fontWeight:900,color:'white',letterSpacing:'-0.02em',margin:0}}>Terms of Use</h1>
          <p style={{marginTop:8,fontSize:13,color:'rgba(255,255,255,0.4)'}}>
            Altus Performance Platform · Last updated {new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>

        <div style={{fontSize:14,lineHeight:1.8,color:'rgba(255,255,255,0.7)'}}>

          {/* Intro */}
          <section style={{marginBottom:32,padding:20,background:'rgba(255,255,255,0.02)',borderRadius:12,border:'1px solid rgba(255,255,255,0.07)'}}>
            <p style={{margin:0,fontSize:13}}>
              These Terms of Use (&quot;Terms&quot;) govern access to and use of the <strong style={{color:'white'}}>Altus Performance</strong> platform (&quot;Platform&quot;),
              a product developed and operated by <strong style={{color:'white'}}>Altus (Pty) Ltd (Reg. 2026/424230/07)</strong> (&quot;Altus&quot;, &quot;we&quot;, &quot;us&quot;).
              By accessing or using the Platform, you agree to be bound by these Terms.
              If you do not agree, you must discontinue use immediately.
            </p>
          </section>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>1. The Platform</h2>
          <p style={{marginBottom:24}}>
            Altus Performance is a proprietary sport operations and high-performance management platform designed for use by educational institutions.
            The Platform provides tools for team management, athlete performance tracking, attendance recording, coaching staff administration, and parent and player communication portals.
            All intellectual property in and to the Platform, including its source code, design, data models, and documentation, is owned exclusively by Altus (Pty) Ltd.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>2. Licence</h2>
          <p style={{marginBottom:24}}>
            Access to the Platform is granted to authorised users under a licence agreement between Altus and the client institution (&quot;Licence&quot;).
            The Licence is non-exclusive, non-transferable, and limited to the scope agreed between Altus and the client institution.
            Unauthorised access to the Platform, including access beyond the scope of the Licence, is strictly prohibited.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>3. Authorised Users</h2>
          <p>The Platform may only be used by:</p>
          <ul style={{margin:'12px 0 24px 20px'}}>
            <li style={{marginBottom:8}}>Coaching and administrative staff of the licensed institution who have been granted platform credentials.</li>
            <li style={{marginBottom:8}}>Athletes and parents or guardians accessing the player portal via a valid player access code.</li>
            <li style={{marginBottom:8}}>Altus personnel for platform administration and support purposes.</li>
          </ul>
          <p style={{marginBottom:24}}>
            You are responsible for maintaining the confidentiality of your credentials and for all activity conducted under your account.
            You must notify Altus or your institution&apos;s platform administrator immediately upon becoming aware of any unauthorised use.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul style={{margin:'12px 0 24px 20px'}}>
            <li style={{marginBottom:8}}>Use the Platform for any unlawful purpose or in violation of applicable South African law.</li>
            <li style={{marginBottom:8}}>Access, tamper with, or attempt to circumvent any security feature of the Platform.</li>
            <li style={{marginBottom:8}}>Reverse engineer, decompile, or reproduce any part of the Platform&apos;s source code or design.</li>
            <li style={{marginBottom:8}}>Share your access credentials with unauthorised persons.</li>
            <li style={{marginBottom:8}}>Use the Platform to process data beyond the scope of your authorised role.</li>
            <li style={{marginBottom:8}}>Upload or transmit any content that is unlawful, harmful, defamatory, or in violation of any third-party rights.</li>
          </ul>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>5. Data and Privacy</h2>
          <p style={{marginBottom:24}}>
            Your use of the Platform is subject to our Privacy Policy, which is incorporated into these Terms by reference.
            The client institution is the responsible party for personal information entered into the Platform by its staff and athletes.
            Altus processes such information as an operator on behalf of the institution in accordance with the Protection of Personal Information Act 4 of 2013 (&ldquo;POPIA&rdquo;).
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>6. Intellectual Property</h2>
          <p style={{marginBottom:24}}>
            All rights, title, and interest in the Altus Performance platform, including its name, branding, design, functionality, and all associated intellectual property, vest exclusively in Altus (Pty) Ltd.
            No use, reproduction, or distribution of the Platform or any of its components is permitted without the prior written consent of Altus.
            The name &quot;Altus Performance&quot; and associated branding are the property of Altus (Pty) Ltd.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>7. Availability and Modifications</h2>
          <p style={{marginBottom:24}}>
            Altus will endeavour to maintain reasonable Platform availability but does not guarantee uninterrupted access.
            Scheduled and emergency maintenance may result in temporary unavailability.
            Altus reserves the right to modify, update, or discontinue any feature of the Platform at any time, with reasonable notice to licensed client institutions where practicable.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>8. Limitation of Liability</h2>
          <p style={{marginBottom:24}}>
            To the maximum extent permitted by applicable law, Altus shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of or inability to use the Platform.
            Altus&apos;s total liability to any party in connection with the Platform shall not exceed the licence fees paid by the client institution in the three months preceding the relevant claim.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>9. Governing Law</h2>
          <p style={{marginBottom:24}}>
            These Terms are governed by the laws of the Republic of South Africa.
            Any disputes arising from these Terms or the use of the Platform shall be subject to the exclusive jurisdiction of the courts of South Africa.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>10. Amendments</h2>
          <p style={{marginBottom:24}}>
            Altus reserves the right to amend these Terms at any time. Updated Terms will be made available on the Platform.
            Continued use of the Platform following the publication of amended Terms constitutes acceptance of the revised Terms.
          </p>

          <h2 style={{color:'white',fontSize:18,fontWeight:800,marginBottom:12}}>11. Contact</h2>
          <div style={{padding:20,background:'rgba(255,255,255,0.02)',borderRadius:12,border:'1px solid rgba(255,255,255,0.07)'}}>
            <p style={{margin:0}}><strong style={{color:'white'}}>Altus (Pty) Ltd (Reg. 2026/424230/07)</strong></p>
            <p style={{margin:'8px 0 0'}}><strong style={{color:'white'}}>Product:</strong> Altus Performance</p>
            <p style={{margin:'8px 0 0'}}><strong style={{color:'white'}}>Contact:</strong> Cody Jason Van Dyk</p>
            <p style={{margin:'8px 0 0'}}><strong style={{color:'white'}}>Email:</strong> cody@altusperformance.co.za</p>
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
