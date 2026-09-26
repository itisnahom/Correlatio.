import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="chain-page fade-up">
      <Link to="/" className="back-btn">← Back to Login</Link>
      <div className="card" style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', lineHeight: '1.6' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-1)' }}>Privacy Policy for Correlatio</h1>
        <p style={{ color: 'var(--text-3)', marginBottom: '32px' }}>Last Updated: September 2026</p>

        <p style={{ marginBottom: '24px', fontSize: '1.05rem', color: 'var(--text-2)' }}>
          At Correlatio, we believe your personal data—especially the habits, health metrics, and behaviors you track—is strictly yours. We built this tool to help you understand yourself, not to harvest your data. This policy explains in plain English what we collect, why we need it, and how we protect it.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-1)' }}>1. What Data We Collect</h3>
        <p style={{ color: 'var(--text-2)', marginBottom: '8px' }}>To make Correlatio work across your devices, we collect the following:</p>
        <ul style={{ color: 'var(--text-2)', paddingLeft: '24px', marginBottom: '24px' }}>
          <li style={{ marginBottom: '8px' }}><strong>Account Information:</strong> When you sign in (e.g., via Google), we securely receive basic profile information like your email address, display name, and profile picture.</li>
          <li><strong>Tracking Data:</strong> The threads, variables, and daily logs you create (e.g., "Sleep," "Stress Level," "Coffee Intake").</li>
        </ul>

        <h3 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-1)' }}>2. How We Use Your Data</h3>
        <p style={{ color: 'var(--text-2)', marginBottom: '8px' }}>Your data is used for exactly one purpose: <strong>to make the app work for you.</strong></p>
        <ul style={{ color: 'var(--text-2)', paddingLeft: '24px', marginBottom: '24px' }}>
          <li style={{ marginBottom: '8px' }}>We use your logs to calculate and display your correlation matrices and insights.</li>
          <li style={{ marginBottom: '8px' }}>We use your account info to securely sync your data so you can access it on your phone or laptop.</li>
          <li><strong>We will never sell, rent, or share your personal tracking data with advertisers, data brokers, or third parties.</strong></li>
        </ul>

        <h3 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-1)' }}>3. How We Protect Your Data</h3>
        <p style={{ color: 'var(--text-2)', marginBottom: '8px' }}>We treat your personal tracking data as highly sensitive.</p>
        <ul style={{ color: 'var(--text-2)', paddingLeft: '24px', marginBottom: '24px' }}>
          <li style={{ marginBottom: '8px' }}><strong>Enterprise-Grade Infrastructure:</strong> Your data is hosted on Google's Firebase platform, which encrypts all data "at rest" on their servers.</li>
          <li style={{ marginBottom: '8px' }}><strong>Strict Access Rules:</strong> We use strict Firebase Security Rules that cryptographically ensure your data can only be requested and read by your uniquely authenticated account. No other user can access your threads.</li>
          <li><strong>Internal Policy:</strong> While your data is not end-to-end encrypted (to allow for seamless device syncing and account recovery), our strict internal policy forbids the developer or database administrators from manually reading or inspecting your personal tracking variables.</li>
        </ul>

        <h3 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-1)' }}>4. Your Rights & Data Deletion</h3>
        <p style={{ color: 'var(--text-2)', marginBottom: '24px' }}>
          You own your data. At any time, you can permanently delete specific logs, threads, or your entire account. Once deleted, it is wiped from our active databases and cannot be recovered.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '16px', color: 'var(--text-1)' }}>5. Changes to this Policy</h3>
        <p style={{ color: 'var(--text-2)', marginBottom: '24px' }}>
          If we ever make significant changes to how we handle your data, we will notify you within the app.
        </p>

      </div>
    </div>
  );
};

export default PrivacyPolicy;
