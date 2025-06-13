import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="text-surface-600">
            We collect information that you provide directly to us, including but not limited to:
          </p>
          <ul className="list-disc ml-6 mt-2 text-surface-600">
            <li>Name and contact information</li>
            <li>Work hours and activity data</li>
            <li>Screenshots and productivity metrics</li>
            <li>Account credentials</li>
          </ul>
        </section> 

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p className="text-surface-600">
            We use the collected information to:
          </p>
          <ul className="list-disc ml-6 mt-2 text-surface-600">
            <li>Provide and maintain our services</li>
            <li>Process and track work hours</li>
            <li>Generate reports and analytics</li>
            <li>Improve our services</li>
            <li>Communicate with you about our services</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Data Security</h2>
          <p className="text-surface-600">
            We implement appropriate security measures to protect your personal information. 
            However, no method of transmission over the Internet is 100% secure, and we cannot 
            guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Your Rights</h2>
          <p className="text-surface-600">
            You have the right to:
          </p>
          <ul className="list-disc ml-6 mt-2 text-surface-600">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to data processing</li>
            <li>Data portability</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
          <p className="text-surface-600">
            If you have any questions about this Privacy Policy, please contact us at:
            <br />
            Email: privacy@timetrackerpro.com
          </p>
        </section>
      </div>
    </div>
  );
} 