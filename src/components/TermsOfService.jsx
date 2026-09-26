import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  return (
    <div className="chain-page fade-up">
      <Link to="/" className="back-btn">← Back to Login</Link>
      <div className="card" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-1)' }}>Terms of Service</h1>
        <p style={{ color: 'var(--text-3)', marginBottom: '32px' }}>Last Updated: September 2026</p>

        <p style={{ marginBottom: '24px', fontSize: '1.05rem', color: 'var(--text-2)' }}>
          Welcome to Correlatio. By using our application, you agree to these terms. We've kept them simple and readable so you know exactly what the rules are.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-1)' }}>1. Not Medical Advice</h3>
        <p style={{ color: 'var(--text-2)', marginBottom: '24px' }}>
          <strong>Correlatio is a data visualization tool, not a medical device.</strong> The mathematical correlations displayed in this app are for informational and entertainment purposes only. Correlation does not imply causation. You should never make health, medical, or dietary decisions based on insights from this app without first consulting a qualified healthcare professional.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-1)' }}>2. Limitation of Liability</h3>
        <p style={{ color: 'var(--text-2)', marginBottom: '8px' }}>
          Correlatio is provided "as is" without warranties of any kind. While we strive to keep your data safe and the app running smoothly, we are not liable for:
        </p>
        <ul style={{ color: 'var(--text-2)', paddingLeft: '24px', marginBottom: '24px' }}>
          <li style={{ marginBottom: '8px' }}>Any lost data due to server errors or account deletion.</li>
          <li style={{ marginBottom: '8px' }}>Any downtime or inability to access the app.</li>
          <li>Any actions you take based on the data or correlations presented.</li>
        </ul>

        <h3 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-1)' }}>3. Acceptable Use</h3>
        <p style={{ color: 'var(--text-2)', marginBottom: '24px' }}>
          You agree to use Correlatio responsibly. You may not attempt to reverse engineer, hack, overload, or otherwise disrupt the service or database. Any abuse of the system will result in immediate account termination and data deletion.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-1)' }}>4. Account Termination</h3>
        <p style={{ color: 'var(--text-2)', marginBottom: '24px' }}>
          You can delete your account at any time. We also reserve the right to suspend or terminate accounts that violate these terms.
        </p>

      </div>
    </div>
  );
};

export default TermsOfService;
