import React from 'react';

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p className="text-surface-600">
            By accessing and using TimeTracker Pro, you agree to be bound by these Terms of Service
            and all applicable laws and regulations. If you do not agree with any of these terms,
            you are prohibited from using or accessing this service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Use License</h2>
          <p className="text-surface-600">
            Permission is granted to temporarily use TimeTracker Pro for personal or business purposes,
            subject to the following restrictions:
          </p>
          <ul className="list-disc ml-6 mt-2 text-surface-600">
            <li>You must not modify or copy the materials</li>
            <li>You must not use the materials for any commercial purpose</li>
            <li>You must not attempt to decompile or reverse engineer any software</li>
            <li>You must not remove any copyright or proprietary notations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
          <p className="text-surface-600">
            As a user of TimeTracker Pro, you agree to:
          </p>
          <ul className="list-disc ml-6 mt-2 text-surface-600">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account</li>
            <li>Use the service in compliance with all applicable laws</li>
            <li>Not interfere with the proper functioning of the service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Service Modifications</h2>
          <p className="text-surface-600">
            TimeTracker Pro reserves the right to modify or discontinue, temporarily or permanently,
            the service with or without notice. We shall not be liable to you or any third party for
            any modification, suspension, or discontinuance of the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Limitation of Liability</h2>
          <p className="text-surface-600">
            In no event shall TimeTracker Pro be liable for any damages arising out of the use or
            inability to use the service, even if we have been notified of the possibility of such damages.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">6. Contact Information</h2>
          <p className="text-surface-600">
            If you have any questions about these Terms of Service, please contact us at:
            <br />
            Email: legal@timetrackerpro.com
          </p>
        </section>
      </div>
    </div>
  );
} 